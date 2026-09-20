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
  Palette, Sparkles, Trophy, Plus, CheckCircle2, Clock,
  ExternalLink, Layers, Send, Lightbulb, Star, Award, Heart
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
  upvotes: number;
  created_at: string;
  student?: {
    first_name: string;
    last_name: string;
    student_class: string;
  };
}

interface UIReformChallengeViewProps {
  userId?: string;
  onOpenCatalog?: () => void;
}

export default function UIReformChallengeView({ userId }: UIReformChallengeViewProps) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [showcaseSubmissions, setShowcaseSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Submission Form State
  const [screenName, setScreenName] = useState("Student Dashboard");
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [mockupUrl, setMockupUrl] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch latest or active campaign
      const { data: cData, error: cErr } = await supabase
        .from("ui_reform_campaigns" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!cErr && cData && (cData as unknown as Campaign[]).length > 0) {
        const camp = (cData as unknown as Campaign[])[0];
        setCampaign(camp);

        // 2. Fetch my submissions
        if (userId) {
          const { data: myData } = await supabase
            .from("ui_reform_submissions" as never)
            .select("*")
            .eq("campaign_id", camp.id)
            .eq("student_id", userId)
            .order("created_at", { ascending: false });

          if (myData) setMySubmissions(myData as unknown as Submission[]);
        }

        // 3. Fetch showcase (shortlisted / winners / implemented)
        const { data: showData } = await supabase
          .from("ui_reform_submissions" as never)
          .select("*, profiles:student_id(first_name, last_name, student_class)")
          .eq("campaign_id", camp.id)
          .in("status", ["shortlisted", "winner", "implemented", "reviewed"])
          .order("points_awarded", { ascending: false })
          .limit(15);

        if (showData) {
          const rawList = showData as unknown as Array<Submission & { profiles?: Submission["student"] }>;
          setShowcaseSubmissions(
            rawList.map((s) => ({
              ...s,
              student: s.profiles,
            }))
          );
        }
      }
    } catch (e) {
      console.warn("Error loading UI reform campaign:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleSubmitProposal = async () => {
    if (!userId) {
      toast({ title: "Please Log In", description: "Log in to submit your redesign idea.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !problemStatement.trim() || !proposedSolution.trim()) {
      toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }
    if (!campaign) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ui_reform_submissions" as never).insert([
        {
          campaign_id: campaign.id,
          student_id: userId,
          screen_name: screenName,
          title: title.trim(),
          problem_statement: problemStatement.trim(),
          proposed_solution: proposedSolution.trim(),
          mockup_url: mockupUrl.trim() || null,
          status: "pending",
        }
      ] as never);

      if (error) throw error;

      toast({
        title: "🎉 Redesign Idea Submitted!",
        description: `Your suggestion has been received. You can earn +${campaign.reward_points} XP once reviewed!`,
      });

      setTitle("");
      setProblemStatement("");
      setProposedSolution("");
      setMockupUrl("");
      setSubmitModalOpen(false);
      loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Submission Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const isLive = campaign && (campaign.status === "active" || (campaign.is_active && new Date(campaign.starts_at) <= new Date()));
  const isScheduled = campaign && campaign.status === "scheduled" && new Date(campaign.starts_at) > new Date();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Palette className="h-3.5 w-3.5 text-purple-300" />
              UI Reform & Redesign Challenge
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              {campaign?.title || "DLMS Redesign & UX Challenge"}
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
              Have an idea to make the library app smoother, prettier, or faster? 
              Propose your UI designs and see your ideas built into the DLMS!
            </p>

            {/* Prize Structure */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { emoji: "\u{1F947}", label: "1st Prize", pts: "10,000 XP", cls: "bg-amber-500/20 border-amber-400/40 text-amber-200" },
                { emoji: "\u{1F948}", label: "2nd Prize", pts: "7,500 XP", cls: "bg-slate-400/20 border-slate-300/40 text-slate-200" },
                { emoji: "\u{1F949}", label: "3rd Prize", pts: "5,000 XP", cls: "bg-orange-500/20 border-orange-400/40 text-orange-200" },
                { emoji: "\u2705", label: "Good Submission", pts: "1,000 XP", cls: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200" },
              ].map(p => (
                <div key={p.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${p.cls}`}>
                  <span>{p.emoji}</span>
                  <span>{p.label}:</span>
                  <span className="font-black">{p.pts}</span>
                </div>
              ))}
            </div>

            {isScheduled && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-500/30 mt-2">
                <Clock className="h-4 w-4 text-amber-300" />
                Scheduled to start after 1-Week Bug Bounty: {new Date(campaign.starts_at).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <Button
              size="lg"
              disabled={!campaign}
              onClick={() => setSubmitModalOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-2xl shadow-lg gap-2 text-sm h-12 px-6"
            >
              <Plus className="h-5 w-5" />
              Submit Redesign Idea
            </Button>
          </div>
        </div>
      </div>

      {/* Focus Areas / Inspiration */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Layers, title: "Student Dashboard", desc: "Gamification, widgets & quick stats" },
          { icon: Sparkles, title: "Book Details & Reader", desc: "Immersive book summaries & reviews" },
          { icon: Trophy, title: "Quizzes & Leaderboards", desc: "Live match animations & badges" },
          { icon: Palette, title: "Mobile Navigation & Themes", desc: "Thumb-friendly bars & dark mode" },
        ].map((area, i) => (
          <Card key={i} className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-1 hover:border-indigo-300 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
              <area.icon className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-foreground">{area.title}</h4>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{area.desc}</p>
          </Card>
        ))}
      </div>

      {/* My Submissions */}
      {mySubmissions.length > 0 && (
        <Card className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              My Design Proposals ({mySubmissions.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Status and review feedback from the Library Admin team.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {mySubmissions.map((sub) => (
              <div key={sub.id} className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40">
                      {sub.screen_name}
                    </Badge>
                    <h4 className="text-xs font-bold text-foreground">{sub.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
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
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        +{sub.points_awarded} XP
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  <strong>Proposed Reform:</strong> {sub.proposed_solution}
                </p>

                {sub.admin_feedback && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                    <p className="font-bold text-indigo-950 dark:text-indigo-200">Admin Feedback:</p>
                    <p className="text-indigo-900/80 dark:text-indigo-300/80">{sub.admin_feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Community Showcase */}
      <Card className="rounded-3xl border border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Redesign Concepts & Winners
          </CardTitle>
          <CardDescription className="text-xs">
            Student designs shortlisted or chosen to be implemented in DLMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {showcaseSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-1">
              <p className="text-xs font-semibold">No shortlisted ideas yet</p>
              <p className="text-[11px]">Be the first to submit a redesign concept for this challenge!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {showcaseSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 rounded-2xl bg-card border border-border/60 hover:border-indigo-300 transition-colors shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40">
                      {sub.screen_name}
                    </Badge>
                    <Badge className={
                      sub.status === "winner" ? "bg-amber-500 text-white" :
                      sub.status === "implemented" ? "bg-emerald-600 text-white" :
                      "bg-purple-600 text-white"
                    }>
                      {sub.status.toUpperCase()}
                    </Badge>
                  </div>

                  <h4 className="text-xs font-bold text-foreground line-clamp-1">{sub.title}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{sub.proposed_solution}</p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span>
                      By {sub.student ? `${sub.student.first_name} ${sub.student.last_name}` : "Student"}
                    </span>
                    {sub.mockup_url && (
                      <a
                        href={sub.mockup_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        View Concept <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Redesign Modal */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-600" />
              Submit UI Reform Proposal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Suggest layout improvements, new components, or wireframe sketches to improve DLMS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Target Screen / Component</Label>
              <Select value={screenName} onValueChange={setScreenName}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student Dashboard">Student Dashboard & Home</SelectItem>
                  <SelectItem value="Books Catalog">Books Catalog & Search</SelectItem>
                  <SelectItem value="Book Reader & Details">Book Details & E-Reader</SelectItem>
                  <SelectItem value="Quizzes & Gamification">Quizzes, Badges & Leaderboard</SelectItem>
                  <SelectItem value="Community & Clubs">Community, Notes & Clubs</SelectItem>
                  <SelectItem value="Mobile Bottom Bar & Menus">Mobile Bottom Bar & Navigation</SelectItem>
                  <SelectItem value="Library Map & Physical Locator">Library Map & Visuals</SelectItem>
                  <SelectItem value="Other UI Feature">Other UI / Design Feature</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Proposal Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Modern Card Layout for Book Discovery"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">What is the problem with current UI?</Label>
              <Textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Explain what is clunky, slow, or could look better..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Your Proposed Reform / Solution</Label>
              <Textarea
                value={proposedSolution}
                onChange={(e) => setProposedSolution(e.target.value)}
                placeholder="Describe your design idea, button arrangement, visual style..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Mockup / Sketch URL (Optional)</Label>
              <Input
                value={mockupUrl}
                onChange={(e) => setMockupUrl(e.target.value)}
                placeholder="Link to Figma, Canva, Imgur, or Google Drive image"
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Tip: Submissions with sketches or wireframe links get prioritized and earn extra bonus XP!
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setSubmitModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              disabled={submitting}
              onClick={handleSubmitProposal}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
            >
              {submitting ? "Submitting..." : "Submit Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
