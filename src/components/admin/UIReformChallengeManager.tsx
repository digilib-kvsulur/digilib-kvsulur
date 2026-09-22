import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Palette, Sparkles, Calendar, Award, CheckCircle2, XCircle, Clock,
  ExternalLink, Plus, Trophy, ChevronRight, Layers, AlertCircle, RefreshCw, Star,
  Eye, EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  title: string;
  description: string;
  theme: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  status: "scheduled" | "active" | "ended";
  reward_points: number;
  rules: string;
}

interface Submission {
  id: string;
  campaign_id: string;
  student_id: string;
  screen_name: string;
  title: string;
  problem_statement: string;
  proposed_solution: string;
  mockup_url?: string;
  status: "pending" | "reviewed" | "shortlisted" | "winner" | "implemented" | "rejected";
  admin_feedback?: string;
  points_awarded: number;
  created_at: string;
  student?: {
    first_name: string;
    last_name: string;
    student_class: string;
    avatar_url?: string;
  };
}

export default function UIReformChallengeManager() {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [newStatus, setNewStatus] = useState<Submission["status"]>("reviewed");
  const [awardPointsInput, setAwardPointsInput] = useState(1000);
  const [bugBountyEndDate, setBugBountyEndDate] = useState<string | null>(null);
  const [studentVisible, setStudentVisible] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Form state for creating/scheduling campaign
  const [formTitle, setFormTitle] = useState("UI Reform & DLMS Redesign Challenge");
  const [formTheme, setFormTheme] = useState("Next-Gen Reading & Modern Student UX");
  const [formDescription, setFormDescription] = useState(
    "Pitch your ideas, layouts, and interactive visual designs to improve KV Sulur DLMS. Earn reward XP and see your designs brought to life!\n\n🥇 1st Prize: 10,000 XP  |  🥈 2nd Prize: 7,500 XP  |  🥉 3rd Prize: 5,000 XP\n✅ Good Submission Reward: 1,000 XP"
  );
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formReward, setFormReward] = useState(1000);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check student visibility setting
      const { data: visData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "ui_reform_visible_to_students")
        .maybeSingle();
      if (visData) {
        setStudentVisible(visData.value !== "false" && visData.value !== false);
      }

      // 1. Fetch latest or active UI Reform Campaign
      const { data: cData, error: cErr } = await supabase
        .from("ui_reform_campaigns" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!cErr && cData && cData.length > 0) {
        setCampaign(cData[0] as Campaign);

        // Fetch submissions for this campaign
        const { data: sData, error: sErr } = await supabase
          .from("ui_reform_submissions" as any)
          .select("*, profiles:student_id(first_name, last_name, student_class, avatar_url)")
          .eq("campaign_id", cData[0].id)
          .order("created_at", { ascending: false });

        if (!sErr && sData) {
          setSubmissions(
            sData.map((s: any) => ({
              ...s,
              student: s.profiles,
            }))
          );
        }
      }

      // 2. Fetch active or latest bug bounty campaign to know its end date
      const { data: bbData } = await supabase
        .from("bug_bounty_campaigns" as any)
        .select("ends_at, is_active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (bbData && bbData.length > 0 && bbData[0].ends_at) {
        setBugBountyEndDate(bbData[0].ends_at);
      }
    } catch (err) {
      console.warn("Error loading UI reform data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScheduleAfterBugBounty = () => {
    const baseDate = bugBountyEndDate ? new Date(bugBountyEndDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const startDate = new Date(baseDate);
    // End 7 days after start
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    setFormStartsAt(startDate.toISOString().slice(0, 16));
    setFormEndsAt(endDate.toISOString().slice(0, 16));
    setShowCreateModal(true);
  };

  const toggleStudentVisibility = async () => {
    try {
      setTogglingVisibility(true);
      const next = !studentVisible;
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "ui_reform_visible_to_students",
          value: next ? "true" : "false",
        });
      if (error) throw error;
      setStudentVisible(next);
      toast({
        title: next ? "Challenge Visible to Students" : "Challenge Hidden from Students",
        description: next
          ? "The UI Reform Challenge is now visible to students on their dashboards."
          : "The UI Reform Challenge is now hidden from student dashboards.",
      });
    } catch (e: any) {
      toast({ title: "Failed to update visibility", description: e.message, variant: "destructive" });
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!formStartsAt || !formEndsAt) {
      toast({ title: "Missing Dates", description: "Please specify start and end dates.", variant: "destructive" });
      return;
    }

    const startDate = new Date(formStartsAt);
    const isNowActive = Date.now() >= startDate.getTime();

    try {
      const { data, error } = await supabase.from("ui_reform_campaigns" as any).insert([
        {
          title: formTitle,
          theme: formTheme,
          description: formDescription,
          starts_at: new Date(formStartsAt).toISOString(),
          ends_at: new Date(formEndsAt).toISOString(),
          is_active: isNowActive,
          status: isNowActive ? "active" : "scheduled",
          reward_points: formReward,
        }
      ]).select().single();

      if (error) throw error;

      toast({
        title: "🎉 Challenge Scheduled!",
        description: isNowActive ? "The challenge is live now!" : "The challenge is scheduled to launch after the Bug Bounty.",
      });
      setShowCreateModal(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to schedule challenge", variant: "destructive" });
    }
  };

  const handleOpenReview = (sub: Submission) => {
    setSelectedSub(sub);
    setNewStatus(sub.status || "reviewed");
    setAdminFeedback(sub.admin_feedback || "");
    setAwardPointsInput(sub.points_awarded || 150);
    setReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (!selectedSub) return;
    try {
      const { error } = await supabase
        .from("ui_reform_submissions" as any)
        .update({
          status: newStatus,
          admin_feedback: adminFeedback,
          points_awarded: awardPointsInput,
        })
        .eq("id", selectedSub.id);

      if (error) throw error;

      // If points awarded, increment user's points
      if (awardPointsInput > 0 && selectedSub.points_awarded === 0) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", selectedSub.student_id)
          .single();

        if (prof) {
          await supabase
            .from("profiles")
            .update({ points: (prof.points || 0) + awardPointsInput })
            .eq("id", selectedSub.student_id);
        }
      }

      // Send in-app notification to the student
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user) {
        await supabase.from("notifications").insert({
          target_user_id: selectedSub.student_id,
          sent_by: authUser.user.id,
          title: `UI Reform Update: ${newStatus.toUpperCase()}`,
          message: `Your redesign proposal for "${selectedSub.screen_name}" was marked as ${newStatus}! ${awardPointsInput > 0 ? `+${awardPointsInput} XP awarded.` : ""}`,
          type: "success",
        });
      }

      toast({ title: "Review Saved!", description: "Status updated and student notified." });
      setReviewModalOpen(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Failed to update review", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Palette className="h-3.5 w-3.5 text-purple-300" />
            UI Reform & Redesign Challenge Hub
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">Design & UX Reform Challenge</h2>
          <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
            Organize student design challenges, review interface suggestions, and award XP for creative UI/UX redesigns.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 z-10 w-full md:w-auto">
          <Button
            variant="outline"
            disabled={togglingVisibility}
            onClick={toggleStudentVisibility}
            className={`font-bold rounded-2xl text-xs sm:text-sm h-11 border transition-all ${
              studentVisible
                ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30"
                : "bg-white/10 text-slate-300 border-white/20 hover:bg-white/20"
            }`}
          >
            {studentVisible ? <Eye className="h-4 w-4 mr-1.5 text-emerald-300" /> : <EyeOff className="h-4 w-4 mr-1.5 text-slate-400" />}
            <span>{studentVisible ? "Students: Visible" : "Students: Hidden"}</span>
          </Button>
          <Button
            onClick={handleScheduleAfterBugBounty}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-2xl shadow-lg gap-2 text-xs sm:text-sm h-11"
          >
            <Calendar className="h-4 w-4" />
            Organise After Bug Bounty
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const now = new Date();
              const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              setFormStartsAt(now.toISOString().slice(0, 16));
              setFormEndsAt(end.toISOString().slice(0, 16));
              setShowCreateModal(true);
            }}
            className="border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl text-xs sm:text-sm h-11"
          >
            <Plus className="h-4 w-4 mr-1" /> Custom Event
          </Button>
        </div>
      </div>

      {/* Campaign Status Card */}
      {campaign ? (
        <Card className="rounded-3xl border border-indigo-200 dark:border-indigo-900 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge className={
                    campaign.status === "active"
                      ? "bg-emerald-600 text-white"
                      : campaign.status === "scheduled"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-500 text-white"
                  }>
                    {campaign.status === "active" ? "🟢 Live Campaign" : campaign.status === "scheduled" ? "⏳ Scheduled" : "Ended"}
                  </Badge>
                  <span className="text-xs font-bold text-muted-foreground">
                    Theme: {campaign.theme}
                  </span>
                </div>
                <CardTitle className="text-xl font-bold mt-1.5">{campaign.title}</CardTitle>
                <CardDescription className="text-xs mt-1">{campaign.description}</CardDescription>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Reward per idea</p>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">+{campaign.reward_points} XP</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-muted/40 rounded-2xl border border-border/40">
                <p className="text-xl font-black text-foreground">{submissions.length}</p>
                <p className="text-[11px] text-muted-foreground">Total Proposals</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                <p className="text-xl font-black text-amber-700 dark:text-amber-400">
                  {submissions.filter((s) => s.status === "pending").length}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Pending Review</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/50">
                <p className="text-xl font-black text-purple-700 dark:text-purple-400">
                  {submissions.filter((s) => s.status === "shortlisted" || s.status === "winner").length}
                </p>
                <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">Shortlisted / Winners</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {submissions.filter((s) => s.status === "implemented").length}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Implemented in DLMS</p>
              </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Student Submissions ({submissions.length})</span>
                <Button variant="ghost" size="sm" onClick={loadData} className="h-7 text-xs text-muted-foreground gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
              </h3>

              {submissions.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-3xl p-6 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-semibold">No design submissions yet</p>
                  <p className="text-xs">Once students submit their redesign ideas, they will appear here for review.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl bg-card border border-border/70 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40">
                            {sub.screen_name}
                          </Badge>
                          <Badge className={
                            sub.status === "winner" ? "bg-amber-500 text-white" :
                            sub.status === "shortlisted" ? "bg-purple-600 text-white" :
                            sub.status === "implemented" ? "bg-emerald-600 text-white" :
                            sub.status === "rejected" ? "bg-red-500 text-white" :
                            "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }>
                            {sub.status.toUpperCase()}
                          </Badge>
                          {sub.points_awarded > 0 && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              +{sub.points_awarded} XP
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-foreground truncate">{sub.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          <strong className="text-foreground">Problem:</strong> {sub.problem_statement}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          <strong className="text-foreground">Reform:</strong> {sub.proposed_solution}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                          <span>
                            By: <strong>{sub.student ? `${sub.student.first_name} ${sub.student.last_name}` : "Student"}</strong>
                            {sub.student?.student_class && ` (Class ${sub.student.student_class})`}
                          </span>
                          <span>•</span>
                          <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                          {sub.mockup_url && (
                            <>
                              <span>•</span>
                              <a
                                href={sub.mockup_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
                              >
                                View Mockup <ExternalLink className="h-3 w-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleOpenReview(sub)}
                          className="h-8 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                        >
                          Review & Award
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
          <Card className="rounded-3xl border border-dashed text-center p-8 sm:p-12 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
              <Palette className="h-8 w-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-bold">No UI Reform Challenge Created Yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You can organize the UI Reform Challenge to automatically start right after the 1-week Bug Bounty completes, or launch it immediately.
              </p>
            </div>
            <Button
              onClick={handleScheduleAfterBugBounty}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl gap-2 shadow-md"
            >
              <Calendar className="h-4 w-4" />
              Schedule After 1-Week Bug Bounty
            </Button>
          </Card>
        )}

      {/* Schedule / Create Challenge Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-600" />
              Schedule UI Reform Challenge
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set the timeline, themes, and XP bounty for the student redesign event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Event Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. DLMS UI Reform & Redesign Challenge"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Theme / Focus Area</Label>
              <Input
                value={formTheme}
                onChange={(e) => setFormTheme(e.target.value)}
                placeholder="e.g. Mobile Experience & Reading Gamification"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description / Instructions</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Starts At</Label>
                <Input
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Ends At</Label>
                <Input
                  type="datetime-local"
                  value={formEndsAt}
                  onChange={(e) => setFormEndsAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reward per Accepted Submission (XP)</Label>
              <Input
                type="number"
                value={formReward}
                onChange={(e) => setFormReward(parseInt(e.target.value, 10) || 0)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleSaveCampaign} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
              Confirm & Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Submission Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              Review Redesign Proposal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Evaluate the student's UI reform proposal and assign reward points.
            </DialogDescription>
          </DialogHeader>

          {selectedSub && (
            <div className="space-y-4 mt-2">
              <div className="p-3 bg-muted/50 rounded-xl space-y-1 text-xs">
                <p><strong>Title:</strong> {selectedSub.title}</p>
                <p><strong>Screen:</strong> {selectedSub.screen_name}</p>
                <p><strong>Student:</strong> {selectedSub.student ? `${selectedSub.student.first_name} ${selectedSub.student.last_name}` : "Student"}</p>
                {selectedSub.mockup_url && (
                  <p>
                    <strong>Mockup URL:</strong>{" "}
                    <a href={selectedSub.mockup_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      {selectedSub.mockup_url}
                    </a>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Decision Status</Label>
                <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed (Good Suggestion)</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted for Implementation</SelectItem>
                    <SelectItem value="winner">Winner 🏆 (Top Challenge Design)</SelectItem>
                    <SelectItem value="implemented">Implemented in Production 🚀</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Points Awarded (XP) — Prize Presets</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "🥇 1st Prize", pts: 10000, cls: "bg-amber-500 hover:bg-amber-600 text-white" },
                    { label: "🥈 2nd Prize", pts: 7500,  cls: "bg-slate-400 hover:bg-slate-500 text-white" },
                    { label: "🥉 3rd Prize", pts: 5000,  cls: "bg-orange-600 hover:bg-orange-700 text-white" },
                    { label: "✅ Good Submission", pts: 1000, cls: "bg-emerald-600 hover:bg-emerald-700 text-white" },
                  ].map(p => (
                    <Button
                      key={p.pts}
                      size="sm"
                      type="button"
                      className={`h-8 text-xs font-bold gap-1 ${p.cls} ${awardPointsInput === p.pts ? "ring-2 ring-offset-1 ring-foreground/30" : ""}`}
                      onClick={() => setAwardPointsInput(p.pts)}
                    >
                      {p.label} — {p.pts.toLocaleString()}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={awardPointsInput}
                  onChange={(e) => setAwardPointsInput(parseInt(e.target.value, 10) || 0)}
                  className="h-9 text-xs mt-1"
                  placeholder="Or enter custom XP…"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Admin Feedback Note</Label>
                <Textarea
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                  placeholder="Feedback for the student explaining why this design reform was chosen or how it will be implemented..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setReviewModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleSaveReview} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
              Save Review & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
