import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  VacationActivity,
  VacationCampaign,
  VacationExportRow,
  VacationLeaderboardRow,
  VacationParticipationStats,
  VacationStreakMilestone,
  VacationStudentOverview,
  VacationSubmission,
} from "./types";

export function useActiveVacationCampaign() {
  const [campaign, setCampaign] = useState<VacationCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vacation_campaigns")
        .select("*")
        .eq("status", "active")
        .maybeSingle();
      if (error) {
        setCampaign(null);
      } else {
        setCampaign((data as VacationCampaign) || null);
      }
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { campaign, loading, refresh };
}

export async function fetchVacationCampaigns() {
  const { data, error } = await supabase
    .from("vacation_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as VacationCampaign[];
}

export async function upsertVacationCampaign(
  payload: Partial<VacationCampaign> & { title: string; start_date: string; end_date: string }
) {
  const { data, error } = await supabase
    .from("vacation_campaigns")
    .upsert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as VacationCampaign;
}

export async function fetchMilestones(campaignId: string) {
  const { data, error } = await supabase
    .from("vacation_streak_milestones")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("days");
  if (error) throw error;
  return (data || []) as VacationStreakMilestone[];
}

export async function replaceMilestones(
  campaignId: string,
  rows: { days: number; bonus_points: number }[]
) {
  const { error: delError } = await supabase
    .from("vacation_streak_milestones")
    .delete()
    .eq("campaign_id", campaignId);
  if (delError) throw delError;
  if (!rows.length) return;
  const { error } = await supabase.from("vacation_streak_milestones").insert(
    rows.map((row) => ({
      campaign_id: campaignId,
      days: row.days,
      bonus_points: row.bonus_points,
    }))
  );
  if (error) throw error;
}

export async function fetchActivities(campaignId: string) {
  const { data, error } = await supabase
    .from("vacation_activities")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as VacationActivity[];
}

export async function upsertActivity(payload: Partial<VacationActivity> & { campaign_id: string; title: string }) {
  const query = payload.id
    ? supabase.from("vacation_activities").update(payload).eq("id", payload.id)
    : supabase.from("vacation_activities").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data as VacationActivity;
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from("vacation_activities").delete().eq("id", id);
  if (error) throw error;
}

export async function seedPosterDrafts(campaignId: string) {
  const { data, error } = await supabase.rpc("vacation_seed_poster_drafts", { p_campaign: campaignId });
  if (error) throw error;
  return data as number;
}

export async function fetchReviewQueue(campaignId: string) {
  const { data, error } = await supabase
    .from("vacation_submissions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  const rows = (data || []) as VacationSubmission[];
  const ids = [...new Set(rows.map((row) => row.student_id))];
  if (!ids.length) return rows;
  const { data: profiles } = await supabase.rpc("get_public_profiles", { _ids: ids });
  const names = new Map(
    ((profiles as { id: string; first_name?: string; last_name?: string; username?: string }[]) || []).map((p) => [
      p.id,
      `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username || "Student",
    ])
  );
  return rows.map((row) => ({ ...row, student_name: names.get(row.student_id) || "Student" }));
}

export async function reviewSubmission(id: string, decision: "approve" | "reject", points?: number, note?: string) {
  const { data, error } = await supabase.rpc("vacation_review_submission", {
    p_submission: id,
    p_decision: decision,
    p_points: points ?? null,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data;
}

export async function fetchStudentOverview() {
  const { data, error } = await supabase.rpc("vacation_student_overview");
  if (error) throw error;
  return ((data || { campaign: null }) as unknown) as VacationStudentOverview;
}

export async function submitVacationActivity(activityId: string, content?: string, link?: string) {
  const { data, error } = await supabase.rpc("vacation_submit_activity", {
    p_activity: activityId,
    p_content: content || null,
    p_link: link || null,
  });
  if (error) throw error;
  return data as VacationSubmission;
}

export async function fetchLeaderboard(campaignId: string, limit = 25) {
  const { data, error } = await supabase.rpc("vacation_leaderboard", {
    p_campaign: campaignId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data || []) as VacationLeaderboardRow[];
}

export async function fetchParticipationStats(campaignId: string) {
  const { data, error } = await supabase.rpc("vacation_participation_stats", { p_campaign: campaignId });
  if (error) throw error;
  return (data as unknown) as VacationParticipationStats;
}

export async function fetchExportRows(campaignId: string) {
  const { data, error } = await supabase.rpc("vacation_export_rows", { p_campaign: campaignId });
  if (error) throw error;
  return (data || []) as VacationExportRow[];
}
