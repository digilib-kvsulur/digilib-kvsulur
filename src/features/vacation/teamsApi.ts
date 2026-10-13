import { supabase } from "@/integrations/supabase/client";
import type { VacationPeerProfile, VacationTeam, VacationTeamMember } from "./types";

const LOCAL_TEAMS_STORAGE_KEY = "dlms_vacation_teams_store_v1";

// Helper to get local teams storage
function getStoredTeams(): VacationTeam[] {
  try {
    const raw = localStorage.getItem(LOCAL_TEAMS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Helper to save local teams storage
function saveStoredTeams(teams: VacationTeam[]) {
  try {
    localStorage.setItem(LOCAL_TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch {}
}

/**
 * Search students by Admission Number or Name
 */
export async function searchVacationPeers(
  query: string,
  excludeId?: string
): Promise<VacationPeerProfile[]> {
  const clean = query.trim();
  if (!clean || clean.length < 1) return [];

  const results: VacationPeerProfile[] = [];
  const seenIds = new Set<string>();

  // 1. Direct query on profiles table (matching admission_number or first_name or last_name)
  try {
    const isNumeric = /^\d+$/.test(clean);
    let q = supabase
      .from("profiles")
      .select("id, first_name, last_name, student_class, admission_number, avatar_url, role")
      .eq("role", "student")
      .limit(12);

    if (isNumeric) {
      q = q.ilike("admission_number", `%${clean}%`);
    } else {
      q = q.or(
        `admission_number.ilike.%${clean}%,first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,username.ilike.%${clean}%`
      );
    }

    const { data, error } = await q;

    if (!error && data) {
      data.forEach((p: any) => {
        if (p.id !== excludeId && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          results.push({
            id: p.id,
            first_name: p.first_name || "",
            last_name: p.last_name || "",
            student_class: p.student_class || null,
            admission_number: p.admission_number || null,
            avatar_url: p.avatar_url || null,
            role: p.role,
          });
        }
      });
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback to search_public_profiles RPC if direct query restricted
  if (results.length === 0) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("search_public_profiles", {
        _q: clean,
        _exclude: excludeId || "00000000-0000-0000-0000-000000000000",
      });

      if (!rpcError && rpcData) {
        rpcData.forEach((p: any) => {
          if (p.id !== excludeId && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            results.push({
              id: p.id,
              first_name: p.first_name || "",
              last_name: p.last_name || "",
              student_class: p.student_class || null,
              admission_number: p.admission_number || null,
              avatar_url: null,
              role: p.role,
            });
          }
        });
      }
    } catch {
      // Continue to local mock/fallback
    }
  }

  return results;
}

/**
 * Create a new team and invite member peers
 */
export async function createVacationTeam(params: {
  campaignId?: string;
  name: string;
  eventTitle: string;
  activityId?: string;
  leader: VacationPeerProfile;
  invitedMembers: VacationPeerProfile[];
}): Promise<VacationTeam> {
  const leaderName = `${params.leader.first_name} ${params.leader.last_name}`.trim() || "Team Leader";
  const teamId = `team-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const leaderMember: VacationTeamMember = {
    id: `mem-${Date.now()}-lead`,
    team_id: teamId,
    user_id: params.leader.id,
    name: leaderName,
    student_class: params.leader.student_class || undefined,
    admission_number: params.leader.admission_number || undefined,
    avatar_url: params.leader.avatar_url || undefined,
    role: "leader",
    status: "accepted",
    invited_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
  };

  const invitees: VacationTeamMember[] = params.invitedMembers.map((m, idx) => ({
    id: `mem-${Date.now()}-${idx}`,
    team_id: teamId,
    user_id: m.id,
    name: `${m.first_name} ${m.last_name}`.trim() || "Teammate",
    student_class: m.student_class || undefined,
    admission_number: m.admission_number || undefined,
    avatar_url: m.avatar_url || undefined,
    role: "member",
    status: "pending",
    invited_at: new Date().toISOString(),
  }));

  const newTeam: VacationTeam = {
    id: teamId,
    campaign_id: params.campaignId,
    name: params.name.trim(),
    event_title: params.eventTitle,
    activity_id: params.activityId || null,
    leader_id: params.leader.id,
    leader_name: leaderName,
    created_at: new Date().toISOString(),
    members: [leaderMember, ...invitees],
  };

  // 1. Try sending DB notifications to invited members
  for (const inv of invitees) {
    try {
      await supabase.from("notifications").insert({
        target_user_id: inv.user_id,
        sent_by: params.leader.id,
        title: "Vacation Team Invite 🤝",
        message: `${leaderName} invited you to join team "${newTeam.name}" for ${newTeam.event_title}. Open the Vacation Festival to accept!`,
        type: "info",
      });
    } catch {
      // In case table RLS restricts client insert
    }
  }

  // 2. Persist in local storage sync
  const current = getStoredTeams();
  const updated = [newTeam, ...current.filter((t) => t.id !== newTeam.id)];
  saveStoredTeams(updated);

  return newTeam;
}

/**
 * Fetch all teams for current user (both their teams and incoming invitations)
 */
export async function fetchMyVacationTeams(userId?: string): Promise<{
  myTeams: VacationTeam[];
  incomingInvites: VacationTeam[];
}> {
  if (!userId) return { myTeams: [], incomingInvites: [] };

  const allTeams = getStoredTeams();

  const myTeams: VacationTeam[] = [];
  const incomingInvites: VacationTeam[] = [];

  for (const team of allTeams) {
    const isLeader = team.leader_id === userId;
    const memberEntry = team.members.find((m) => m.user_id === userId);

    if (isLeader) {
      myTeams.push(team);
    } else if (memberEntry) {
      if (memberEntry.status === "accepted") {
        myTeams.push(team);
      } else if (memberEntry.status === "pending") {
        incomingInvites.push(team);
      }
    }
  }

  return { myTeams, incomingInvites };
}

/**
 * Accept or decline a team invitation
 */
export async function respondVacationTeamInvite(
  teamId: string,
  userId: string,
  decision: "accept" | "decline"
): Promise<VacationTeam | null> {
  const allTeams = getStoredTeams();
  const targetIndex = allTeams.findIndex((t) => t.id === teamId);
  if (targetIndex === -1) return null;

  const team = allTeams[targetIndex];
  const member = team.members.find((m) => m.user_id === userId);
  if (!member) return null;

  member.status = decision === "accept" ? "accepted" : "declined";
  member.responded_at = new Date().toISOString();

  // Notify leader if accepted
  if (decision === "accept") {
    try {
      await supabase.from("notifications").insert({
        target_user_id: team.leader_id,
        sent_by: userId,
        title: "Team Invite Accepted! 🎉",
        message: `${member.name} accepted your invitation to join team "${team.name}" for ${team.event_title}! Your team is formed!`,
        type: "success",
      });
    } catch {}
  }

  allTeams[targetIndex] = { ...team };
  saveStoredTeams(allTeams);

  return allTeams[targetIndex];
}

/**
 * Format a formed team into a clean submission string
 */
export function formatTeamRoster(team: VacationTeam): string {
  const acceptedMembers = team.members.filter((m) => m.status === "accepted");
  const rosterStr = acceptedMembers
    .map((m) => {
      const classStr = m.student_class ? `Class ${m.student_class}` : "";
      const admStr = m.admission_number ? `Adm: ${m.admission_number}` : "";
      const details = [classStr, admStr].filter(Boolean).join(", ");
      return details ? `${m.name} (${details})` : m.name;
    })
    .join("; ");

  return `Team "${team.name}" | Members: ${rosterStr}`;
}
