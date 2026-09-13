import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Send, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BugReport {
  id: string;
  description: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export default function BugReportForm({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkEligibility();
    loadReports();
  }, []);

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

  const submitBug = async () => {
    if (!description.trim()) {
      toast({ title: "Add description", description: "Please describe the bug you found.", variant: "destructive" });
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

      // 2. Submit report
      const { error } = await supabase
        .from("bug_reports")
        .insert({
          campaign_id: campaign.id,
          reporter_id: currentUserId,
          description: description.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast({ title: "Bug Reported! 🐛", description: "The admin will review your finding." });
      setDescription("");
      loadReports();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (!isEligible) {
    return null; // Don't show if not eligible
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" /> Bug Bounty Program
          </CardTitle>
          <CardDescription>
            You have been allotted to a special bug bounty campaign! Report any bugs you find in the DLMS to earn points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-background border border-border space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertCircle className="h-4 w-4" /> Reward: <span className="text-primary font-bold">100 XP per verified bug</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Bug Description</Label>
              <Textarea
                placeholder="Describe the bug, steps to reproduce, and expected vs actual behavior..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={submitBug}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Bug Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-md flex items-center gap-2">
            <Clock className="h-4 w-4" /> My Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No bugs reported yet.</p>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-foreground line-clamp-1">{report.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={report.status === 'verified' ? 'default' : report.status === 'rejected' ? 'destructive' : 'outline'} className="text-[10px] h-5">
                    {report.status === 'verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {report.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                    {report.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Trophy(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1-2.5-2.5V4a2.5 2.5 0 0 1 2.5-2.5H19.5a2.5 2.5 0 0 1 2.5 2.5V6.5a2.5 2.5 0 0 1-2.5 2.5H18" />
      <path d="M6 13.5V17a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3.5" />
      <path d="M12 13.5V15" />
      <path d="M10 13.5H14" />
    </svg>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85 1.23 6.42 3.2C17.48 7.5 18.5 8.5 19 9.5" />
      <path d="M12 2v4" />
      <path d="m16.2 7.8-2.9 2.9" />
      <path d="m18 12-4 4" />
      <path d="m12 18-4-4" />
      <path d="m7.8 16.2 2.9-2.9" />
      <path d="m12 12-4-4" />
      <path d="m16.2 16.2 2.9-2.9" />
    </svg>
  );
}
