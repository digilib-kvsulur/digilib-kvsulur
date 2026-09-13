import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, CheckCircle2, XCircle, Clock, Plus,
  AlertCircle, Loader2, Search, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BugBountyCampaign {
  id: string;
  admin_id: string;
  student_id: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

interface BugReport {
  id: string;
  campaign_id: string;
  reporter_id: string;
  description: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  reporter_name?: string;
}

export default function BugBountyManager() {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<BugBountyCampaign | null>(null);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [allottingStudent, setAllottingStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load active campaign
      const { data: campaignData } = await supabase
        .from("bug_bounty_campaigns")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      setCampaign(campaignData);

      // 2. Load reports for the active campaign
      if (campaignData) {
        const { data: reportsData } = await supabase
          .from("bug_reports")
          .select("*, profiles(first_name, last_name, username)")
          .eq("campaign_id", campaignData.id)
          .order("created_at", { ascending: false });

        setReports((reportsData || []).map(r => ({
          ...r,
          reporter_name: r.profiles ? `${r.profiles.first_name || ""} ${r.profiles.last_name || ""}`.trim() || r.profiles.username : "User"
        })));
      }
    } catch (e) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async () => {
    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 24);

      const { data, error } = await supabase
        .from("bug_bounty_campaigns")
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          starts_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      setCampaign(data);
      toast({ title: "Bug Bounty Campaign Started! 🚀", description: "Duration: 24 Hours" });
      loadData();
    } catch (e: any) {
      toast({ title: "Failed to start campaign", description: e.message, variant: "destructive" });
    }
  };

  const allotStudent = async () => {
    if (!campaign || !allottingStudent) return;
    setActionLoading("allot");
    try {
      const { error } = await supabase
        .from("bug_bounty_campaigns")
        .update({ student_id: allottingStudent })
        .eq("id", campaign.id);

      if (error) throw error;
      toast({ title: "Student Allotted!", description: "The student can now report bugs." });
      setAllottingStudent("");
      setStudentSearch("");
      searchResults.length = 0;
      loadData();
    } catch (e: any) {
      toast({ title: "Failed to allot student", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const verifyBug = async (reportId: string, reporterId: string) => {
    setActionLoading(reportId);
    try {
      // 1. Update report status
      const { error: reportErr } = await supabase
        .from("bug_reports")
        .update({ status: 'verified', rewarded_at: new Date().toISOString() })
        .eq("id", reportId);

      if (reportErr) throw reportErr;

      // 2. Award points (100 points)
      const { data: profile } = await supabase.from("profiles").select("points").eq("id", reporterId).single();
      const currentPoints = profile?.points || 0;

      const { error: pointErr } = await supabase
        .from("profiles")
        .update({ points: currentPoints + 100 })
        .eq("id", reporterId);

      if (pointErr) throw pointErr;

      toast({ title: "Bug Verified! ✅", description: "100 XP awarded to student." });
      loadData();
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectBug = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      const { error } = await supabase
        .from("bug_reports")
        .update({ status: 'rejected' })
        .eq("id", reportId);

      if (error) throw error;
      toast({ title: "Bug Rejected ❌" });
      loadData();
    } catch (e: any) {
      toast({ title: "Rejection failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStudentSearch = async (val: string) => {
    setStudentSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase.rpc("search_public_profiles", { _q: val.trim() });
    setSearchResults(data || []);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-6 w-6 text-amber-500" /> Bug Bounty Campaign
            </CardTitle>
            <CardDescription>Reward students for finding and reporting system bugs.</CardDescription>
          </div>
          {!campaign ? (
            <Button onClick={startCampaign} className="gap-2">
              <Plus className="h-4 w-4" /> Start Campaign
            </Button>
          ) : (
            <Badge variant="default" className="bg-emerald-500 text-white">Active</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {campaign ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" /> Duration: 24 Hours
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Allotted Student:</span>
                    <span className="text-sm text-primary font-bold">
                      {campaign.student_id ? "Assigned" : "Not Assigned"}
                    </span>
                  </div>

                  {campaign.student_id && (
                    <p className="text-xs text-muted-foreground">
                      The assigned student can now report bugs in their community feed.
                    </p>
                  )}

                  {!campaign.student_id && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Search student..."
                            value={studentSearch}
                            onChange={(e) => handleStudentSearch(e.target.value)}
                            className="pr-8"
                          />
                          <Search className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button
                          disabled={!allottingStudent}
                          onClick={allotStudent}
                          disabled={actionLoading === "allot"}
                        >
                          {actionLoading === "allot" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Allot"}
                        </Button>
                      </div>
                      {searchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded-md bg-background">
                          {searchResults.map(s => (
                            <button
                              key={s.id}
                              onClick={() => {
                                setAllottingStudent(s.id);
                                setStudentSearch(`${s.first_name} ${s.last_name}`);
                                setSearchResults([]);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                            >
                              <User className="h-3 w-3" /> {s.first_name} {s.last_name} (@{s.username})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Trophy className="h-4 w-4" /> Reward Policy
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-sm">
                  Each verified bug found by the allotted student will be rewarded with <strong>100 XP</strong>.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No active bug bounty campaign. Start one to begin!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {campaign && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Bug Reports Queue
            </CardTitle>
            <CardDescription>Review and verify reported bugs to award points.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No bugs reported yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">{report.reporter_name}</span>
                        <Badge variant={report.status === 'verified' ? 'default' : report.status === 'rejected' ? 'destructive' : 'outline'} className="text-[10px] h-5">
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-2">{report.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Reported: {new Date(report.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {report.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => verifyBug(report.id, report.reporter_id)}
                            disabled={actionLoading === report.id}
                          >
                            {actionLoading === report.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
                            onClick={() => rejectBug(report.id)}
                            disabled={actionLoading === report.id}
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}
                      {report.status === 'verified' && (
                        <Badge className="bg-emerald-500 text-white h-8 px-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Rewarded
                        </Badge>
                      )}
                      {report.status === 'rejected' && (
                        <Badge variant="destructive" className="h-8 px-2 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Rejected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper icons used in the component
function ClipboardList(props: any) {
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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 2h4v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4h16Z" />
      <path d="M8 6h8" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
    </svg>
  );
}
