import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertCircle, Send, CheckCircle2, Clock, XCircle, Trophy,
  Loader2, Bug, Sparkles, Flame, AlertTriangle, ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BugReport {
  id: string;
  description: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  rewarded_at?: string;
}

export default function BugReportForm({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("general");
  const [severity, setSeverity] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkEligibility();
    loadReports();
  }, [currentUserId]);

  const checkEligibility = async () => {
    try {
      const { data } = await supabase
        .from("bug_bounty_campaigns")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        const endsAt = new Date(data.ends_at);
        setIsEligible(endsAt > new Date());
      } else {
        setIsEligible(false);
      }
    } catch (e) {
      setIsEligible(false);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      if (!currentUserId) return;
      const { data } = await supabase
        .from("bug_reports")
        .select("*")
        .eq("reporter_id", currentUserId)
        .order("created_at", { ascending: false });
      setReports(data || []);
    } catch (e) {
      console.error("Error loading reports:", e);
    }
  };

  const submitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !steps.trim()) {
      toast({ title: "Incomplete Details", description: "Please enter a bug summary and steps to reproduce.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Find active campaign
      const { data: campaign } = await supabase
        .from("bug_bounty_campaigns")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();

      if (!campaign) {
        throw new Error("No active campaign found.");
      }

      // 2. Submit report payload
      const payload = {
        title: title.trim(),
        module,
        severity,
        steps: steps.trim(),
        expected: expected.trim(),
        actual: actual.trim(),
        deviceInfo: `${navigator.platform} • ${navigator.userAgent.slice(0, 40)}`
      };

      const { error } = await supabase
        .from("bug_reports")
        .insert({
          campaign_id: campaign.id,
          reporter_id: currentUserId,
          description: JSON.stringify(payload),
          status: 'pending'
        });

      if (error) throw error;

      toast({ title: "Bug Reported! 🐛", description: "Thank you! The library admin will review and award 100 XP." });
      setTitle("");
      setSteps("");
      setExpected("");
      setActual("");
      loadReports();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!isEligible) return null;

  const parseReportSummary = (desc: string) => {
    try {
      if (desc.trim().startsWith("{")) {
        const parsed = JSON.parse(desc);
        return parsed.title || desc;
      }
    } catch (e) {}
    return desc;
  };

  return (
    <div className="space-y-5">
      {/* Bounty Banner Card */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-indigo-500/5 rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Active Bug Bounty Mission
                </CardTitle>
                <CardDescription className="text-xs">
                  Earn <span className="font-bold text-amber-500">100 XP</span> for every verified bug found!
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-extrabold animate-pulse">
              LIVE HUNT
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <form onSubmit={submitBug} className="space-y-3.5 bg-card/60 p-4 rounded-2xl border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Bug Title / Summary *</Label>
              <Input
                placeholder="e.g. Broken link on study materials page"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Module</Label>
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reels">🎬 Reels & Community</SelectItem>
                    <SelectItem value="catalog">📚 Book Catalog</SelectItem>
                    <SelectItem value="circulation">📖 Issues & Returns</SelectItem>
                    <SelectItem value="study">📝 Study Materials & AI</SelectItem>
                    <SelectItem value="games">🎮 Quizzes & Leaderboards</SelectItem>
                    <SelectItem value="general">⚙️ General / Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Severity</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 Low (Minor Cosmetic)</SelectItem>
                    <SelectItem value="medium">🟡 Medium (Glitch / Annoyance)</SelectItem>
                    <SelectItem value="high">⚠️ High (Feature Broken)</SelectItem>
                    <SelectItem value="critical">🔥 Critical (Crash / Data Loss)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Steps to Reproduce *</Label>
              <Textarea
                placeholder="1. Go to page...&#10;2. Click on button...&#10;3. See error..."
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                rows={3}
                className="text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Expected Behavior</Label>
                <Input
                  placeholder="What should happen?"
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Actual Behavior</Label>
                <Input
                  placeholder="What actually happened?"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-xl gradient-primary text-white font-bold text-xs gap-1.5 border-0 shadow-md"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit Finding (+100 XP)
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Student's Submissions List */}
      <Card className="rounded-3xl border-border">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> My Submitted Bugs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {reports.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              You haven't submitted any bugs in this campaign yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {reports.map(report => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border bg-muted/30 text-xs"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-bold text-foreground truncate">
                      {parseReportSummary(report.description)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {report.status === 'verified' && (
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> +100 XP
                      </Badge>
                    )}
                    {report.status === 'rejected' && (
                      <Badge variant="destructive" className="text-[10px]">
                        <XCircle className="h-3 w-3 mr-1" /> Rejected
                      </Badge>
                    )}
                    {report.status === 'pending' && (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]">
                        <Clock className="h-3 w-3 mr-1" /> In Review
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
