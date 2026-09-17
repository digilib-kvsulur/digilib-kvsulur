import React, { useState, useEffect, useMemo } from "react";
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
  Trophy, CheckCircle2, XCircle, Clock, Plus,
  AlertCircle, Loader2, Search, User, Shield, ShieldAlert,
  Flame, Sparkles, Send, Download, ExternalLink, RefreshCw,
  Bug, Eye, Laptop, Check, HelpCircle, Award, ChevronDown,
  ChevronUp, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface BugBountyCampaign {
  id: string;
  admin_id: string;
  student_id: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

interface ParsedBugContent {
  title?: string;
  module?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  deviceInfo?: string;
  raw: string;
  adminFeedback?: string;
}

interface BugReport {
  id: string;
  campaign_id: string;
  reporter_id: string;
  description: string;
  status: 'pending' | 'verified' | 'rejected';
  rewarded_at?: string;
  created_at: string;
  reporter_name?: string;
  reporter_username?: string;
  reporter_avatar?: string;
  reporter_role?: string;
  parsed?: ParsedBugContent;
}

// Parse description content (JSON or formatted text fallback)
function parseBugDescription(rawDesc: string): ParsedBugContent {
  if (!rawDesc) return { raw: "" };
  try {
    if (rawDesc.trim().startsWith("{") && rawDesc.trim().endsWith("}")) {
      const parsed = JSON.parse(rawDesc);
      return {
        title: parsed.title,
        module: parsed.module,
        severity: parsed.severity,
        category: parsed.category,
        steps: parsed.steps,
        expected: parsed.expected,
        actual: parsed.actual,
        deviceInfo: parsed.deviceInfo,
        adminFeedback: parsed.adminFeedback,
        raw: rawDesc,
      };
    }
  } catch (e) {
    // ignore json error
  }

  return {
    raw: rawDesc,
    title: rawDesc.slice(0, 50),
    severity: 'medium',
    category: 'General',
  };
}

export default function BugBountyManager() {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<BugBountyCampaign | null>(null);
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search & Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "rejected" | "my_reports">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);

  // Admin Start Campaign Form State
  const [showStartModal, setShowStartModal] = useState(false);
  const [durationHours, setDurationHours] = useState("24");
  const [campaignScope, setCampaignScope] = useState("all");
  const [allottingStudent, setAllottingStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Admin Verification / Rejection Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [actionReport, setActionReport] = useState<BugReport | null>(null);
  const [rewardXP, setRewardXP] = useState(100);
  const [adminNote, setAdminNote] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Admin Bulk Actions State
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [bulkVerifyModalOpen, setBulkVerifyModalOpen] = useState(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRewardXP, setBulkRewardXP] = useState(100);
  const [bulkAdminNote, setBulkAdminNote] = useState("");
  const [bulkRejectReason, setBulkRejectReason] = useState("Duplicate report");
  const [bulkRejectFeedback, setBulkRejectFeedback] = useState("");

  // Student Report Bug Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugModule, setBugModule] = useState("general");
  const [bugSeverity, setBugSeverity] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [bugCategory, setBugCategory] = useState("UI / Visual Glitch");
  const [bugSteps, setBugSteps] = useState("");
  const [bugExpected, setBugExpected] = useState("");
  const [bugActual, setBugActual] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);

  // Live Timer Countdown
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Update live countdown
  useEffect(() => {
    if (!campaign || !campaign.ends_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(campaign.ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || null);
      }

      // 1. Load active campaign (or latest campaign)
      const { data: campaignData } = await supabase
        .from("bug_bounty_campaigns")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setCampaign(campaignData || null);

      // 2. Load reports: verified reports (accessible to all) + own reports (for logged-in user) + all (if admin)
      let query = supabase
        .from("bug_reports")
        .select("*, profiles(first_name, last_name, username, avatar_url, role)")
        .order("created_at", { ascending: false });

      if (campaignData) {
        query = query.eq("campaign_id", campaignData.id);
      }

      const { data: reportsData, error: reportsErr } = await query;
      if (reportsErr) {
        console.warn("Error fetching reports:", reportsErr);
      }

      const formatted = (reportsData || []).map(r => ({
        ...r,
        reporter_name: r.profiles
          ? `${r.profiles.first_name || ""} ${r.profiles.last_name || ""}`.trim() || r.profiles.username
          : "User",
        reporter_username: r.profiles?.username,
        reporter_avatar: r.profiles?.avatar_url,
        reporter_role: r.profiles?.role,
        parsed: parseBugDescription(r.description),
      }));

      setReports(formatted);
    } catch (e) {
      console.error("Error loading bug bounty data:", e);
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async () => {
    try {
      setActionLoading("start");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const hours = parseInt(durationHours, 10) || 24;
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + hours);

      const { data, error } = await supabase
        .from("bug_bounty_campaigns")
        .insert({
          admin_id: user.id,
          student_id: allottingStudent || null,
          starts_at: new Date().toISOString(),
          ends_at: endsAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      setCampaign(data);
      setShowStartModal(false);
      toast({
        title: "Bug Bounty Campaign Live! 🚀",
        description: `Active for ${hours} hours. Reward: 100 XP per verified finding.`,
      });
      loadData();
    } catch (e: any) {
      toast({ title: "Failed to start campaign", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndCampaign = async () => {
    if (!campaign) return;
    if (!confirm("Are you sure you want to end this Bug Bounty Campaign?")) return;

    try {
      const { error } = await supabase
        .from("bug_bounty_campaigns")
        .update({ is_active: false })
        .eq("id", campaign.id);

      if (error) throw error;
      toast({ title: "Campaign Ended Successfully" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error ending campaign", description: e.message, variant: "destructive" });
    }
  };

  const handleStudentSearch = async (val: string) => {
    setStudentSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase.rpc("search_public_profiles", {
      _q: val.trim(),
      _exclude: userId
    });
    setSearchResults(data || []);
  };

  // Submit Bug Report (Student)
  const handleSubmitBugReport = async () => {
    if (!bugTitle.trim() || !bugSteps.trim()) {
      toast({
        title: "Incomplete Details",
        description: "Please provide a bug title and steps to reproduce.",
        variant: "destructive"
      });
      return;
    }

    if (!campaign) {
      toast({ title: "No Active Campaign", description: "Bug reporting is currently closed.", variant: "destructive" });
      return;
    }

    setSubmittingBug(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to report bugs");

      // Build structured payload
      const payload = {
        title: bugTitle.trim(),
        module: bugModule,
        severity: bugSeverity,
        category: bugCategory,
        steps: bugSteps.trim(),
        expected: bugExpected.trim(),
        actual: bugActual.trim(),
        deviceInfo: `${navigator.platform} • ${navigator.userAgent.slice(0, 40)}`,
      };

      const { error } = await supabase
        .from("bug_reports")
        .insert({
          campaign_id: campaign.id,
          reporter_id: user.id,
          description: JSON.stringify(payload),
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Bug Report Submitted! 🐛",
        description: "Your finding is in the review queue. You will earn XP once verified.",
      });

      // Reset form
      setBugTitle("");
      setBugSteps("");
      setBugExpected("");
      setBugActual("");
      setShowReportModal(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Submission Failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingBug(false);
    }
  };

  // Admin Verify Bug Report
  const handleConfirmVerify = async () => {
    if (!actionReport) return;
    setActionLoading(actionReport.id);
    try {
      const awardedXP = Number(rewardXP) || 100;

      // 1. Update report status
      const updatedDescription = actionReport.parsed
        ? JSON.stringify({ ...actionReport.parsed, adminFeedback: adminNote.trim() })
        : actionReport.description;

      const { error: reportErr } = await supabase
        .from("bug_reports")
        .update({
          status: 'verified',
          rewarded_at: new Date().toISOString(),
          description: updatedDescription
        })
        .eq("id", actionReport.id);

      if (reportErr) throw reportErr;

      // 2. Award XP to reporter
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", actionReport.reporter_id)
        .single();

      const currentPoints = profile?.points || 0;
      const { error: pointErr } = await supabase
        .from("profiles")
        .update({ points: currentPoints + awardedXP })
        .eq("id", actionReport.reporter_id);

      if (pointErr) throw pointErr;

      toast({
        title: "Bug Verified & Rewarded! 🎉",
        description: `Successfully awarded ${awardedXP} XP to ${actionReport.reporter_name}.`,
      });

      setVerifyModalOpen(false);
      setActionReport(null);
      setAdminNote("");
      loadData();
    } catch (e: any) {
      toast({ title: "Verification Failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Reject Bug Report
  const handleConfirmReject = async () => {
    if (!actionReport) return;
    setActionLoading(actionReport.id);
    try {
      const updatedDescription = actionReport.parsed
        ? JSON.stringify({ ...actionReport.parsed, adminFeedback: rejectReason.trim() || "Report rejected after review." })
        : actionReport.description;

      const { error } = await supabase
        .from("bug_reports")
        .update({
          status: 'rejected',
          description: updatedDescription
        })
        .eq("id", actionReport.id);

      if (error) throw error;

      toast({ title: "Report Marked as Rejected ❌" });
      setRejectModalOpen(false);
      setActionReport(null);
      setRejectReason("");
      loadData();
    } catch (e: any) {
      toast({ title: "Rejection Failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Bulk Verify Bug Reports
  const handleConfirmBulkVerify = async () => {
    if (selectedReportsList.length === 0) return;
    setActionLoading("bulk-verify");
    try {
      const awardedXP = Number(bulkRewardXP) || 100;
      const now = new Date().toISOString();

      // 1. Group points to award by reporter_id
      const reporterPointsMap: Record<string, number> = {};
      for (const report of selectedReportsList) {
        reporterPointsMap[report.reporter_id] = (reporterPointsMap[report.reporter_id] || 0) + awardedXP;
      }

      // 2. Update each selected bug report
      const reportUpdates = selectedReportsList.map(report => {
        const updatedDescription = report.parsed
          ? JSON.stringify({
              ...report.parsed,
              adminFeedback: bulkAdminNote.trim()
                ? `${bulkAdminNote.trim()} (Bulk Verified)`
                : (report.parsed.adminFeedback || "Verified during review.")
            })
          : report.description;

        return supabase
          .from("bug_reports")
          .update({
            status: 'verified',
            rewarded_at: now,
            description: updatedDescription
          })
          .eq("id", report.id);
      });

      const reportResults = await Promise.all(reportUpdates);
      const firstReportErr = reportResults.find(r => r.error)?.error;
      if (firstReportErr) throw firstReportErr;

      // 3. Award XP points to student profiles
      const reporterIds = Object.keys(reporterPointsMap);
      if (reporterIds.length > 0) {
        const { data: profiles, error: fetchErr } = await supabase
          .from("profiles")
          .select("id, points")
          .in("id", reporterIds);

        if (fetchErr) throw fetchErr;

        const currentPointsMap = new Map((profiles || []).map(p => [p.id, p.points || 0]));

        const profileUpdates = reporterIds.map(repId => {
          const current = currentPointsMap.get(repId) || 0;
          const additional = reporterPointsMap[repId] || 0;
          return supabase
            .from("profiles")
            .update({ points: current + additional })
            .eq("id", repId);
        });

        const profileResults = await Promise.all(profileUpdates);
        const firstProfileErr = profileResults.find(r => r.error)?.error;
        if (firstProfileErr) throw firstProfileErr;
      }

      const totalAwardedXP = selectedReportsList.length * awardedXP;
      toast({
        title: "Bulk Verification Complete! 🎉",
        description: `Verified ${selectedReportsList.length} report${selectedReportsList.length > 1 ? 's' : ''} and distributed ${totalAwardedXP} XP to ${reporterIds.length} student${reporterIds.length > 1 ? 's' : ''}.`,
      });

      setBulkVerifyModalOpen(false);
      clearSelection();
      setBulkAdminNote("");
      loadData();
    } catch (e: any) {
      console.error("Bulk verification failed:", e);
      toast({ title: "Bulk Verification Failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Bulk Reject Bug Reports
  const handleConfirmBulkReject = async () => {
    if (selectedReportsList.length === 0) return;
    setActionLoading("bulk-reject");
    try {
      const finalFeedback = [bulkRejectReason, bulkRejectFeedback.trim()].filter(Boolean).join(" - ");

      const reportUpdates = selectedReportsList.map(report => {
        const updatedDescription = report.parsed
          ? JSON.stringify({
              ...report.parsed,
              adminFeedback: finalFeedback || "Report rejected after review."
            })
          : report.description;

        return supabase
          .from("bug_reports")
          .update({
            status: 'rejected',
            description: updatedDescription
          })
          .eq("id", report.id);
      });

      const reportResults = await Promise.all(reportUpdates);
      const firstReportErr = reportResults.find(r => r.error)?.error;
      if (firstReportErr) throw firstReportErr;

      toast({
        title: "Bulk Rejection Complete ❌",
        description: `Successfully rejected ${selectedReportsList.length} report${selectedReportsList.length > 1 ? 's' : ''}.`,
      });

      setBulkRejectModalOpen(false);
      clearSelection();
      setBulkRejectFeedback("");
      loadData();
    } catch (e: any) {
      console.error("Bulk rejection failed:", e);
      toast({ title: "Bulk Rejection Failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // Export reports to CSV
  const exportToCSV = () => {
    if (reports.length === 0) return;
    const headers = ["Report ID", "Reporter", "Title / Description", "Severity", "Category", "Status", "Reported At"];
    const rows = reports.map(r => [
      r.id,
      r.reporter_name,
      `"${(r.parsed?.title || r.description).replace(/"/g, '""')}"`,
      r.parsed?.severity || "N/A",
      r.parsed?.category || "N/A",
      r.status,
      new Date(r.created_at).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KV_Sulur_Bug_Bounty_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (statusFilter === "my_reports") {
        if (r.reporter_id !== userId) return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      if (severityFilter !== "all" && r.parsed?.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = r.parsed?.title?.toLowerCase().includes(q);
        const nameMatch = r.reporter_name?.toLowerCase().includes(q);
        const descMatch = r.description.toLowerCase().includes(q);
        if (!titleMatch && !nameMatch && !descMatch) return false;
      }
      return true;
    });
  }, [reports, statusFilter, severityFilter, searchQuery, userId]);

  // Selection Helpers for Bulk Operations
  const toggleSelectReport = (id: string) => {
    setSelectedReportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedReportIds(new Set());
  };

  // Pending reports currently visible in filtered list
  const pendingInView = useMemo(() => {
    return filteredReports.filter(r => r.status === 'pending');
  }, [filteredReports]);

  const areAllPendingSelected = useMemo(() => {
    if (pendingInView.length === 0) return false;
    return pendingInView.every(r => selectedReportIds.has(r.id));
  }, [pendingInView, selectedReportIds]);

  const toggleSelectAllPending = () => {
    if (areAllPendingSelected) {
      setSelectedReportIds(prev => {
        const next = new Set(prev);
        pendingInView.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedReportIds(prev => {
        const next = new Set(prev);
        pendingInView.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  // Reports currently selected
  const selectedReportsList = useMemo(() => {
    return reports.filter(r => selectedReportIds.has(r.id));
  }, [reports, selectedReportIds]);

  // Unique student reporters among selected reports
  const selectedDistinctReporters = useMemo(() => {
    const s = new Set(selectedReportsList.map(r => r.reporter_id));
    return Array.from(s);
  }, [selectedReportsList]);

  // Metrics
  const metrics = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const verified = reports.filter(r => r.status === 'verified').length;
    const rejected = reports.filter(r => r.status === 'rejected').length;
    const myCount = userId ? reports.filter(r => r.reporter_id === userId).length : 0;
    const totalXp = verified * 100;
    return { total, pending, verified, rejected, myCount, totalXp };
  }, [reports, userId]);

  // Top Bug Hunters Leaderboard
  const topHunters = useMemo(() => {
    const map = new Map<string, { id: string; name: string; username?: string; avatar?: string; count: number; xp: number; role?: string }>();
    reports.filter(r => r.status === 'verified').forEach(r => {
      const prev = map.get(r.reporter_id) || {
        id: r.reporter_id,
        name: r.reporter_name || "Hunter",
        username: r.reporter_username,
        avatar: r.reporter_avatar,
        count: 0,
        xp: 0,
        role: r.reporter_role,
      };
      map.set(r.reporter_id, {
        ...prev,
        count: prev.count + 1,
        xp: prev.xp + 100,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.xp - a.xp).slice(0, 10);
  }, [reports]);

  const severityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]"><Flame className="h-3 w-3 mr-1 text-rose-500" /> Critical</Badge>;
      case 'high':
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1 text-amber-500" /> High</Badge>;
      case 'medium':
        return <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30 text-[10px]">Medium</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Low</Badge>;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> Verified (+XP)</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]"><Clock className="h-3 w-3 mr-1 text-amber-500" /> Pending Review</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading Bug Bounty Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-5 sm:p-7 md:p-8 text-white border border-indigo-900/50 shadow-xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 h-48 w-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-md shrink-0">
                <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                PM SHRI Bug Bounty Hub
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Help us test, harden, and polish the Digital Library system. Discover glitches, broken buttons, or UI flaws to earn instant XP points.
            </p>
          </div>

          {/* Campaign Live Countdown & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0">
            {campaign && !timeLeft.isExpired ? (
              <div className="flex items-center justify-between sm:justify-start gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 backdrop-blur-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>LIVE HUNT</span>
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Time Left</p>
                  <p className="text-xs sm:text-sm font-mono font-extrabold text-white">
                    {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </p>
                </div>
              </div>
            ) : (
              <Badge variant="outline" className="h-10 px-3 border-slate-700 text-slate-400 bg-slate-900/50 justify-center">
                Campaign Inactive
              </Badge>
            )}

            {/* Role Action Button */}
            {userRole === 'admin' ? (
              campaign && !timeLeft.isExpired ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl font-bold h-10 sm:h-11 text-xs px-4 shadow-md w-full sm:w-auto"
                  onClick={handleEndCampaign}
                >
                  End Campaign
                </Button>
              ) : (
                <Button
                  className="rounded-xl font-bold h-10 sm:h-11 text-xs px-5 gradient-primary border-0 shadow-lg hover:shadow-xl text-white gap-2 w-full sm:w-auto"
                  onClick={() => setShowStartModal(true)}
                >
                  <Plus className="h-4 w-4" /> Start New Campaign
                </Button>
              )
            ) : (
              campaign && !timeLeft.isExpired && (
                <Button
                  className="rounded-xl font-bold h-10 sm:h-11 text-xs px-5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg gap-2 border-0 w-full sm:w-auto"
                  onClick={() => setShowReportModal(true)}
                >
                  <Bug className="h-4 w-4" /> Report a Bug (+100 XP)
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <Card className="p-3.5 sm:p-4 rounded-2xl border-border bg-card/60 backdrop-blur-sm shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Total Reports</span>
            <Bug className="h-4 w-4 text-primary shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1.5 sm:mt-2 text-foreground">{metrics.total}</p>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-border bg-card/60 backdrop-blur-sm shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Under Review</span>
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1.5 sm:mt-2 text-amber-500">{metrics.pending}</p>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-border bg-card/60 backdrop-blur-sm shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">Verified Bugs</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1.5 sm:mt-2 text-emerald-500">{metrics.verified}</p>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-2xl border-border bg-card/60 backdrop-blur-sm shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">XP Distributed</span>
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1.5 sm:mt-2 text-primary">{metrics.totalXp} XP</p>
        </Card>
      </div>

      {/* Main Content: Reports Feed + Top Hunters Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Reports Queue (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-3xl border-border">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Bug className="h-5 w-5 text-indigo-500" /> Bug Reports Queue
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {userRole === 'admin'
                      ? "Review student findings, verify reproducibility, and reward XP."
                      : "Track community findings and status of reported bugs."}
                  </CardDescription>
                </div>

                {reports.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-xl gap-1.5 self-start sm:self-auto"
                    onClick={exportToCSV}
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </Button>
                )}
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-border mt-3">
                {/* Status Tabs - Scrollable on small screens */}
                <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border overflow-x-auto no-scrollbar shrink-0">
                  {(userRole === 'admin' ? [
                    { id: "all", label: "All" },
                    { id: "pending", label: "Pending", count: metrics.pending },
                    { id: "verified", label: "Verified / Accepted", count: metrics.verified },
                    { id: "rejected", label: "Rejected" },
                    { id: "my_reports", label: "My Reports", count: metrics.myCount },
                  ] : [
                    { id: "verified", label: "🏆 Accepted Bugs", count: metrics.verified },
                    { id: "my_reports", label: "📝 My Submissions", count: metrics.myCount },
                    { id: "all", label: "🌐 All Reports" },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                        statusFilter === tab.id
                          ? "bg-background text-foreground shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="h-4 px-1 text-[9px] rounded-full bg-primary/20 text-primary font-bold">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Search & Severity Filter */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 text-xs pl-8 rounded-xl w-full"
                    />
                  </div>

                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="h-8 text-xs w-28 sm:w-32 rounded-xl shrink-0">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin Selection Controls Bar */}
              {userRole === 'admin' && pendingInView.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-2.5 px-0.5 border-t border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-pending"
                      checked={areAllPendingSelected}
                      onCheckedChange={toggleSelectAllPending}
                      className="rounded-md h-4 w-4 data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor="select-all-pending"
                      className="cursor-pointer font-semibold text-foreground/80 hover:text-foreground select-none text-xs flex items-center gap-1.5"
                    >
                      <span>{areAllPendingSelected ? "Deselect All Pending" : `Select All Pending in View (${pendingInView.length})`}</span>
                    </label>
                  </div>

                  {selectedReportIds.size > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-medium">
                        {selectedReportIds.size} of {reports.length} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                        className="h-6 px-2 text-[11px] text-primary hover:text-primary/80 font-bold hover:bg-primary/10 rounded-lg"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              {/* Sticky / Prominent Bulk Action Toolbar */}
              {userRole === 'admin' && selectedReportIds.size > 0 && (
                <div className="sticky top-2 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-slate-900 text-white border border-indigo-500/40 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2.5">
                    <Badge className="bg-primary hover:bg-primary text-primary-foreground font-black px-2.5 py-0.5 text-xs shadow-xs">
                      {selectedReportIds.size} Selected
                    </Badge>
                    <span className="text-xs text-slate-200">
                      ({selectedDistinctReporters.length} {selectedDistinctReporters.length === 1 ? 'student hunter' : 'student hunters'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Button
                      size="sm"
                      className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                      onClick={() => setBulkVerifyModalOpen(true)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept & Award ({selectedReportIds.size})
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs rounded-xl font-bold gap-1.5 shadow-xs"
                      onClick={() => setBulkRejectModalOpen(true)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject ({selectedReportIds.size})
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {filteredReports.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No bug reports found</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {reports.length === 0
                      ? "No bugs reported in this campaign yet. Keep testing and hunting!"
                      : "No reports match the selected filters."}
                  </p>
                </div>
              ) : (
                filteredReports.map(report => {
                  const p = report.parsed || { raw: report.description };
                  const isExpanded = selectedReport?.id === report.id;

                  return (
                    <div
                      key={report.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                        selectedReportIds.has(report.id)
                          ? "border-primary bg-primary/[0.04] ring-1 ring-primary/20 shadow-md"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {userRole === 'admin' && (
                            <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedReportIds.has(report.id)}
                                onCheckedChange={() => toggleSelectReport(report.id)}
                                aria-label={`Select report ${report.id}`}
                                className="rounded-md h-4 w-4 data-[state=checked]:bg-primary"
                              />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">
                                {report.reporter_name}
                              </span>
                              {report.reporter_role && (
                                <Badge variant="outline" className="text-[9px] h-4">
                                  {report.reporter_role}
                                </Badge>
                              )}
                              {severityBadge(p.severity)}
                              {statusBadge(report.status)}
                            </div>

                            <h4 className="text-sm font-extrabold text-foreground truncate">
                              {p.title || report.description.slice(0, 60)}
                            </h4>
                          </div>
                        </div>

                        {/* Admin Action Buttons */}
                        {userRole === 'admin' && report.status === 'pending' && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                              onClick={() => {
                                setActionReport(report);
                                setVerifyModalOpen(true);
                              }}
                              disabled={actionLoading === report.id}
                            >
                              <Check className="h-3.5 w-3.5" /> Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
                              onClick={() => {
                                setActionReport(report);
                                setRejectModalOpen(true);
                              }}
                              disabled={actionLoading === report.id}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Structured Details */}
                      <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/60">
                        {p.module && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Module:</span>
                            <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                              {p.module}
                            </Badge>
                            {p.category && (
                              <span className="text-[11px] text-muted-foreground">• {p.category}</span>
                            )}
                          </div>
                        )}

                        {p.steps ? (
                          <div>
                            <p className="font-semibold text-foreground mb-0.5">Steps to Reproduce:</p>
                            <p className="text-foreground/90 whitespace-pre-line pl-2 border-l-2 border-primary/40">
                              {p.steps}
                            </p>
                          </div>
                        ) : (
                          <p className="text-foreground/90">{report.description}</p>
                        )}

                        {p.expected && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                              <span className="font-bold block">Expected Behavior:</span>
                              <span>{p.expected}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/20 text-rose-800 dark:text-rose-300">
                              <span className="font-bold block">Actual Behavior:</span>
                              <span>{p.actual || "Feature failed"}</span>
                            </div>
                          </div>
                        )}

                        {p.deviceInfo && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                            <Laptop className="h-3 w-3" />
                            <span>Device: {p.deviceInfo}</span>
                          </div>
                        )}

                        {p.adminFeedback && (
                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs mt-2">
                            <strong>Admin Feedback:</strong> {p.adminFeedback}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                        <span>Reported on: {new Date(report.created_at).toLocaleString()}</span>
                        {report.rewarded_at && (
                          <span className="text-emerald-600 font-bold">Rewarded +100 XP</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Leaderboard & Mission Brief (1 Col) */}
        <div className="space-y-6">
          {/* Top Bug Hunters Leaderboard */}
          <Card className="rounded-3xl border-border shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Bug Bounty Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">Top school bug hunters rewarded with XP</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-2.5">
              {topHunters.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No verified bugs awarded yet in this campaign.
                </p>
              ) : (
                topHunters.map((hunter, i) => {
                  const isMe = Boolean(userId && hunter.id === userId);
                  return (
                    <div
                      key={hunter.id || i}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs transition-all ${
                        isMe
                          ? "bg-amber-500/10 border-amber-500/40 shadow-xs ring-1 ring-amber-500/20"
                          : "bg-muted/40 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          i === 0 ? "bg-amber-400 text-slate-950 shadow-xs" :
                          i === 1 ? "bg-slate-300 text-slate-900" :
                          i === 2 ? "bg-amber-700 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                            <span className="truncate">{hunter.name}</span>
                            {isMe && (
                              <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] h-3.5 px-1 py-0 shrink-0">
                                YOU
                              </Badge>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{hunter.count} verified {hunter.count === 1 ? 'bug' : 'bugs'}</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-extrabold shrink-0">
                        +{hunter.xp} XP
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Reward & Scope Guidelines */}
          <Card className="rounded-3xl border-border bg-gradient-to-br from-amber-500/5 to-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Bug Bounty Rules</h4>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
              <li><strong>100 XP</strong> awarded for every verified functional or UI bug.</li>
              <li>Include reproducible steps to help administrators verify quickly.</li>
              <li>Duplicate submissions are rewarded to the first reporter.</li>
              <li>Spam or fraudulent reports will be rejected.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Admin Start Campaign Modal */}
      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Start Bug Bounty Campaign
            </DialogTitle>
            <DialogDescription className="text-xs">
              Activate a new testing cycle and incentivize students to find bugs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Campaign Duration</Label>
              <Select value={durationHours} onValueChange={setDurationHours}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 Hours (Flash Hunt)</SelectItem>
                  <SelectItem value="24">24 Hours (Standard)</SelectItem>
                  <SelectItem value="48">48 Hours (Weekend Hack)</SelectItem>
                  <SelectItem value="168">7 Days (Full Week)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Hunter Eligibility</Label>
              <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs space-y-2">
                <p className="font-semibold text-foreground">Open to All Students (Recommended)</p>
                <p className="text-[11px] text-muted-foreground">
                  Any enrolled student can report findings during the campaign period.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="rounded-xl text-xs w-full sm:w-auto" onClick={() => setShowStartModal(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl text-xs font-bold gradient-primary text-white border-0 w-full sm:w-auto"
              onClick={handleStartCampaign}
              disabled={actionLoading === "start"}
            >
              {actionLoading === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Launch Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Verify Bug Modal */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Verify Bug & Award XP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm finding for {actionReport?.reporter_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">XP Reward</Label>
              <Input
                type="number"
                value={rewardXP}
                onChange={(e) => setRewardXP(parseInt(e.target.value) || 100)}
                className="h-10 rounded-xl"
                min={10}
                max={500}
              />
              <p className="text-[10px] text-muted-foreground">Standard reward is 100 XP. Increase for critical bugs.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Admin Feedback (Optional)</Label>
              <Input
                placeholder="e.g. Great catch! Fixed in next release."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="rounded-xl text-xs w-full sm:w-auto" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              onClick={handleConfirmVerify}
              disabled={actionLoading === actionReport?.id}
            >
              {actionLoading === actionReport?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Award"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Reject Bug Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Reject Bug Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason so the student understands why this report was not accepted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Rejection Reason</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Duplicate report">Duplicate report (Already reported)</SelectItem>
                  <SelectItem value="Expected behavior">Expected behavior / Not a bug</SelectItem>
                  <SelectItem value="Cannot reproduce">Cannot reproduce with provided steps</SelectItem>
                  <SelectItem value="Incomplete details">Incomplete details</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="rounded-xl text-xs w-full sm:w-auto" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl text-xs font-bold w-full sm:w-auto"
              onClick={handleConfirmReject}
              disabled={actionLoading === actionReport?.id}
            >
              {actionLoading === actionReport?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Bulk Verify Modal */}
      <Dialog open={bulkVerifyModalOpen} onOpenChange={setBulkVerifyModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Bulk Verify & Award XP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify {selectedReportsList.length} selected report{selectedReportsList.length > 1 ? 's' : ''} and distribute XP rewards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Quick summary cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-muted/60 border border-border">
                <span className="text-[10px] text-muted-foreground block font-medium">Reports</span>
                <span className="text-base font-black text-foreground">{selectedReportsList.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/60 border border-border">
                <span className="text-[10px] text-muted-foreground block font-medium">Students</span>
                <span className="text-base font-black text-foreground">{selectedDistinctReporters.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Total XP</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {selectedReportsList.length * (Number(bulkRewardXP) || 100)}
                </span>
              </div>
            </div>

            {/* XP Per Report */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Reward Per Report</Label>
                <div className="flex items-center gap-1">
                  {[50, 100, 200].map(xpVal => (
                    <button
                      key={xpVal}
                      type="button"
                      onClick={() => setBulkRewardXP(xpVal)}
                      className={`px-2 py-0.5 text-[10px] rounded-md font-bold transition-all ${
                        bulkRewardXP === xpVal
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {xpVal} XP
                    </button>
                  ))}
                </div>
              </div>
              <Input
                type="number"
                value={bulkRewardXP}
                onChange={(e) => setBulkRewardXP(parseInt(e.target.value) || 100)}
                className="h-10 rounded-xl"
                min={10}
                max={500}
              />
              <p className="text-[10px] text-muted-foreground">
                Each verified report grants {bulkRewardXP} XP directly to the submitting student.
              </p>
            </div>

            {/* Admin Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Admin Feedback Note (Optional)</Label>
              <Input
                placeholder="e.g. Verified in bulk review cycle. Great findings!"
                value={bulkAdminNote}
                onChange={(e) => setBulkAdminNote(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {/* Selected Reports Preview List */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reports to Verify ({selectedReportsList.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-muted/40 border border-border">
                {selectedReportsList.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-background border border-border/60 text-[11px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-foreground">
                        {r.parsed?.title || r.description.slice(0, 40)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        By {r.reporter_name} • {r.parsed?.severity || 'medium'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                      +{bulkRewardXP} XP
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              className="rounded-xl text-xs w-full sm:w-auto"
              onClick={() => setBulkVerifyModalOpen(false)}
              disabled={actionLoading === "bulk-verify"}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              onClick={handleConfirmBulkVerify}
              disabled={actionLoading === "bulk-verify" || selectedReportsList.length === 0}
            >
              {actionLoading === "bulk-verify" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Confirm & Verify (${selectedReportsList.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Bulk Reject Modal */}
      <Dialog open={bulkRejectModalOpen} onOpenChange={setBulkRejectModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Bulk Reject Bug Reports
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reject {selectedReportsList.length} selected report{selectedReportsList.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Rejection Reason</Label>
              <Select value={bulkRejectReason} onValueChange={setBulkRejectReason}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Duplicate report">Duplicate report (Already reported)</SelectItem>
                  <SelectItem value="Expected behavior">Expected behavior / Not a bug</SelectItem>
                  <SelectItem value="Cannot reproduce">Cannot reproduce with provided steps</SelectItem>
                  <SelectItem value="Incomplete details">Incomplete details</SelectItem>
                  <SelectItem value="Out of campaign scope">Out of campaign scope</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Additional Feedback (Optional)</Label>
              <Textarea
                placeholder="Provide details or instructions for reporters..."
                value={bulkRejectFeedback}
                onChange={(e) => setBulkRejectFeedback(e.target.value)}
                rows={2}
                className="text-xs rounded-xl"
              />
            </div>

            {/* Selected Reports Preview List */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reports to Reject ({selectedReportsList.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-muted/40 border border-border">
                {selectedReportsList.map(r => (
                  <div key={r.id} className="p-1.5 rounded-lg bg-background border border-border/60 text-[11px]">
                    <p className="font-bold truncate text-foreground">
                      {r.parsed?.title || r.description.slice(0, 40)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      By {r.reporter_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              className="rounded-xl text-xs w-full sm:w-auto"
              onClick={() => setBulkRejectModalOpen(false)}
              disabled={actionLoading === "bulk-reject"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl text-xs font-bold w-full sm:w-auto"
              onClick={handleConfirmBulkReject}
              disabled={actionLoading === "bulk-reject" || selectedReportsList.length === 0}
            >
              {actionLoading === "bulk-reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Reject (${selectedReportsList.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Submit Bug Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Bug className="h-5 w-5 text-rose-500" /> Report a Bug / Glitch
            </DialogTitle>
            <DialogDescription className="text-xs">
              Describe what went wrong to earn 100 XP once verified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Bug Summary / Title *</Label>
              <Input
                placeholder="e.g. Reels like button does not increment count"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                className="h-10 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Module / Feature</Label>
                <Select value={bugModule} onValueChange={setBugModule}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reels">🎬 Reels & Community</SelectItem>
                    <SelectItem value="catalog">📚 Book Catalog</SelectItem>
                    <SelectItem value="circulation">📖 Issues / Renewals</SelectItem>
                    <SelectItem value="study">📝 Study Materials / AI</SelectItem>
                    <SelectItem value="games">🎮 Quizzes & Games</SelectItem>
                    <SelectItem value="login">🔐 Login / Profile</SelectItem>
                    <SelectItem value="other">⚙️ Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Severity</Label>
                <Select value={bugSeverity} onValueChange={(v) => setBugSeverity(v as any)}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 Low (Minor Cosmetic)</SelectItem>
                    <SelectItem value="medium">🟡 Medium (Normal Glitch)</SelectItem>
                    <SelectItem value="high">⚠️ High (Feature Broken)</SelectItem>
                    <SelectItem value="critical">🔥 Critical (Crash / Data)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Steps to Reproduce *</Label>
              <Textarea
                placeholder="1. Open Community tab&#10;2. Click on Reel #2&#10;3. Tap the like button..."
                value={bugSteps}
                onChange={(e) => setBugSteps(e.target.value)}
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
                  value={bugExpected}
                  onChange={(e) => setBugExpected(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Actual Behavior</Label>
                <Input
                  placeholder="What actually happened?"
                  value={bugActual}
                  onChange={(e) => setBugActual(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" className="rounded-xl text-xs w-full sm:w-auto" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl text-xs font-bold gradient-primary text-white border-0 gap-1.5 w-full sm:w-auto"
              onClick={handleSubmitBugReport}
              disabled={submittingBug}
            >
              {submittingBug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit Bug Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

