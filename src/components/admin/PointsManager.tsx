import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Award, Plus, CheckSquare, BookOpen, Settings2, CheckCircle, XCircle, Clock,
  CheckCheck, X, ChevronsUpDown, Check, AlertTriangle, History, Eraser,
} from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  student_class?: string;
  points: number;
  admission_number?: string | null;
  roll_number?: string | null;
}

const PAGE_SIZE = 1000;

const PointsManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [openStudentPicker, setOpenStudentPicker] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [pointsToAward, setPointsToAward] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkPoints, setBulkPoints] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [customBulkReason, setCustomBulkReason] = useState("");
  const [bulkAwarding, setBulkAwarding] = useState(false);

  const [queueReadings, setQueueReadings] = useState<any[]>([]);
  const [pastReadings, setPastReadings] = useState<any[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedReadingIds, setSelectedReadingIds] = useState<Set<string>>(new Set());
  const [bulkProcessingReadings, setBulkProcessingReadings] = useState(false);
  const [pastFilter, setPastFilter] = useState("all");

  const [pointsRules, setPointsRules] = useState<Record<string, number>>({
    points_per_book_read: 25,
    points_per_quiz_passed: 50,
    points_per_daily_streak: 10,
    points_per_review: 15,
    points_per_issue: 100,
    points_per_timely_return: 100,
    points_per_study_minute: 1,
  });
  const [savingRules, setSavingRules] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadReadings();
    loadPointsRules();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const all: User[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, student_class, admission_number, roll_number, points")
          .eq("role", "student")
          .eq("is_approved", true)
          .order("first_name")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        all.push(...((data as User[]) || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      setUsers(all);
      setSelectedUserIds(new Set());
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({ title: "Error", description: error.message || "Failed to load students.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.student_class) set.add(u.student_class);
    });
    return Array.from(set).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (classFilter === "all") return users;
    return users.filter((u) => u.student_class === classFilter);
  }, [users, classFilter]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleAwardPoints = async () => {
    if (!selectedUserId) {
      toast({ title: "Error", description: "Please select a student.", variant: "destructive" });
      return;
    }
    const points = parseInt(pointsToAward);
    if (!points || points <= 0) {
      toast({ title: "Error", description: "Please enter a valid number of points.", variant: "destructive" });
      return;
    }
    const actualReason = reason === "other" ? customReason.trim() : reason;
    if (!actualReason) {
      toast({ title: "Error", description: "Please provide a reason for awarding points.", variant: "destructive" });
      return;
    }

    try {
      setAwarding(true);
      const { data: currentUser, error: fetchError } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", selectedUserId)
        .single();
      if (fetchError) throw fetchError;

      const newPoints = (currentUser.points || 0) + points;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", selectedUserId);
      if (updateError) throw updateError;

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        const formattedReason = actualReason.replace(/_/g, " ").toUpperCase();
        await supabase.from("notifications").insert({
          title: "Points Awarded!",
          message: `You have been awarded ${points} points. Reason: ${formattedReason}`,
          type: "points",
          target_user_id: selectedUserId,
          sent_by: adminUser.id,
        });
      }

      toast({ title: "Success", description: `Successfully awarded ${points} points!` });
      setSelectedUserId("");
      setPointsToAward("");
      setReason("");
      setCustomReason("");
      loadUsers();
    } catch (error) {
      console.error("Error awarding points:", error);
      toast({ title: "Error", description: "Failed to award points.", variant: "destructive" });
    } finally {
      setAwarding(false);
    }
  };

  const handleBulkAwardPoints = async () => {
    if (selectedUserIds.size === 0) return;
    const points = parseInt(bulkPoints);
    if (!points || points <= 0) {
      toast({ title: "Error", description: "Please enter valid bulk points.", variant: "destructive" });
      return;
    }
    const actualReason = bulkReason === "other" ? customBulkReason.trim() : bulkReason;
    if (!actualReason) {
      toast({ title: "Error", description: "Please provide or select a reason.", variant: "destructive" });
      return;
    }

    setBulkAwarding(true);
    try {
      await Promise.all(
        Array.from(selectedUserIds).map(async (uid) => {
          const student = users.find((u) => u.id === uid);
          if (!student) return;
          return supabase.from("profiles").update({ points: (student.points || 0) + points }).eq("id", uid);
        })
      );

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        const formattedReason = actualReason.replace(/_/g, " ").toUpperCase();
        await supabase.from("notifications").insert(
          Array.from(selectedUserIds).map((uid) => ({
            title: "Points Awarded!",
            message: `You have been awarded ${points} points. Reason: ${formattedReason}`,
            type: "points",
            target_user_id: uid,
            sent_by: adminUser.id,
          }))
        );
      }

      toast({ title: "Bulk Points Awarded", description: `Successfully awarded +${points} points to ${selectedUserIds.size} students.` });
      setBulkPoints("");
      setBulkReason("");
      setCustomBulkReason("");
      setSelectedUserIds(new Set());
      loadUsers();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || "Failed to award bulk points.", variant: "destructive" });
    } finally {
      setBulkAwarding(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
  };

  const enrichReadings = async (data: any[]) => {
    const userIds = Array.from(new Set(data.map((r) => r.user_id)));
    let profileMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, student_class, admission_number")
        .in("id", userIds);
      (profs || []).forEach((p: any) => {
        profileMap[p.id] = p;
      });
    }
    return data.map((r) => ({ ...r, profile: profileMap[r.user_id] }));
  };

  const loadReadings = async () => {
    setLoadingReadings(true);
    try {
      const [{ data: queue }, { data: past }] = await Promise.all([
        supabase
          .from("reading_history")
          .select("id, book_title, book_author, completed_date, points_earned, user_id, status, created_at")
          .in("status", ["pending", "suspicious"])
          .order("completed_date", { ascending: false }),
        supabase
          .from("reading_history")
          .select("id, book_title, book_author, completed_date, points_earned, user_id, status, created_at")
          .in("status", ["approved", "rejected", "suspicious"])
          .order("completed_date", { ascending: false })
          .limit(200),
      ]);
      setQueueReadings(await enrichReadings(queue || []));
      // Past: approved + rejected (and keep suspicious only in queue primary; still show in past if filtered)
      setPastReadings(await enrichReadings((past || []).filter((r: any) => r.status === "approved" || r.status === "rejected")));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReadings(false);
    }
  };

  const handleApproveReading = async (id: string) => {
    setApprovingId(id);
    const { data: awarded, error } = await supabase.rpc("approve_reading_entry", { p_reading_id: id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Approved", description: `Reading approved and ${awarded || 0} points awarded.` });
    setApprovingId(null);
    loadReadings();
    loadUsers();
  };

  const handleScrapReading = async (id: string) => {
    if (!confirm("Discard this reading entry and scrap any points awarded for it?")) return;
    setApprovingId(id);
    const { data: deducted, error } = await supabase.rpc("scrap_reading_entry" as any, { p_reading_id: id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({
      title: "Scrapped",
      description: deducted ? `Entry discarded (−${deducted} points).` : "Entry discarded.",
    });
    setApprovingId(null);
    setSelectedReadingIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    loadReadings();
    loadUsers();
  };

  const handleBulkApproveReadings = async () => {
    if (selectedReadingIds.size === 0) return;
    setBulkProcessingReadings(true);
    let approved = 0;
    for (const id of Array.from(selectedReadingIds)) {
      const { error } = await supabase.rpc("approve_reading_entry", { p_reading_id: id });
      if (!error) approved++;
    }
    toast({ title: `${approved} Approved`, description: `${approved} reading entries approved and points awarded.` });
    setSelectedReadingIds(new Set());
    setBulkProcessingReadings(false);
    loadReadings();
    loadUsers();
  };

  const handleBulkScrapReadings = async () => {
    if (selectedReadingIds.size === 0) return;
    if (!confirm(`Scrap / reject ${selectedReadingIds.size} reading entries and revoke any points?`)) return;
    setBulkProcessingReadings(true);
    let n = 0;
    for (const id of Array.from(selectedReadingIds)) {
      const { error } = await supabase.rpc("scrap_reading_entry" as any, { p_reading_id: id });
      if (!error) n++;
    }
    toast({ title: `${n} Scrapped`, description: "Entries discarded; points revoked where applicable." });
    setSelectedReadingIds(new Set());
    setBulkProcessingReadings(false);
    loadReadings();
    loadUsers();
  };

  const handleRejectReading = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase.from("reading_history").update({ status: "rejected" }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Rejected", description: "Reading entry rejected." });
    setApprovingId(null);
    loadReadings();
  };

  const loadPointsRules = async () => {
    const { data } = await supabase.from("system_settings").select("key, value").in("key", [
      "points_per_book_read", "points_per_quiz_passed", "points_per_daily_streak", "points_per_review",
      "points_per_issue", "points_per_timely_return", "points_per_study_minute",
    ]);
    if (data && data.length > 0) {
      const rules: Record<string, number> = {};
      data.forEach((row: any) => {
        rules[row.key] = Number(row.value);
      });
      setPointsRules((prev) => ({ ...prev, ...rules }));
    }
  };

  const handleSavePointsRules = async () => {
    setSavingRules(true);
    const upserts = Object.entries(pointsRules).map(([key, value]) => ({ key, value: value as any }));
    const { error } = await supabase.from("system_settings").upsert(upserts, { onConflict: "key" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved", description: "Points configuration updated." });
    setSavingRules(false);
  };

  const statusBadge = (status: string) => {
    if (status === "pending") return <Badge className="bg-amber-500/15 text-amber-700 border-0">Pending</Badge>;
    if (status === "suspicious") return <Badge variant="destructive">Suspicious</Badge>;
    if (status === "approved") return <Badge className="bg-success/15 text-success border-0">Approved</Badge>;
    if (status === "rejected") return <Badge variant="secondary">Rejected</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const filteredPast = pastReadings.filter((r) => pastFilter === "all" || r.status === pastFilter);

  const renderReadingRow = (r: any, opts: { showScrap?: boolean; showApprove?: boolean; showReject?: boolean; selectable?: boolean }) => (
    <div key={r.id} className={cn(
      "p-4 rounded-xl border bg-card flex flex-wrap items-center justify-between gap-3",
      r.status === "suspicious" ? "border-destructive/40 bg-destructive/5" : "border-border/50"
    )}>
      <div className="flex items-start gap-2 min-w-0">
        {opts.selectable && (
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded shrink-0"
            checked={selectedReadingIds.has(r.id)}
            onChange={(e) => setSelectedReadingIds((prev) => {
              const s = new Set(prev);
              e.target.checked ? s.add(r.id) : s.delete(r.id);
              return s;
            })}
          />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground truncate">{r.book_title}</p>
            {statusBadge(r.status)}
          </div>
          <p className="text-xs text-muted-foreground">
            by {r.book_author || "—"} · {r.profile?.first_name} {r.profile?.last_name}
            {r.profile?.student_class ? ` · Class ${r.profile.student_class}` : ""}
            {r.profile?.admission_number ? ` · ${r.profile.admission_number}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {r.completed_date ? new Date(r.completed_date).toLocaleDateString() : "—"}
            {r.points_earned != null ? ` · ${r.points_earned} pts` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {opts.showApprove && (
          <Button size="sm" onClick={() => handleApproveReading(r.id)} disabled={approvingId === r.id || bulkProcessingReadings}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
          </Button>
        )}
        {opts.showReject && r.status !== "suspicious" && (
          <Button size="sm" variant="outline" onClick={() => handleRejectReading(r.id)} disabled={approvingId === r.id || bulkProcessingReadings}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
        )}
        {opts.showScrap && (
          <Button size="sm" variant="destructive" onClick={() => handleScrapReading(r.id)} disabled={approvingId === r.id || bulkProcessingReadings}>
            <Eraser className="h-3.5 w-3.5 mr-1" /> Scrap points
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Points Management</h2>
        <p className="text-sm text-muted-foreground">Award points, approve reading entries, and configure point rules.</p>
      </div>
      <Tabs defaultValue="award">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="award" className="gap-2"><Award className="h-4 w-4" /> Award Points</TabsTrigger>
          <TabsTrigger value="readings" className="gap-2">
            <BookOpen className="h-4 w-4" /> Reading Approvals
            {queueReadings.length > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{queueReadings.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2"><Settings2 className="h-4 w-4" /> Points Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="award" className="space-y-6">
          {selectedUserIds.size > 0 && (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" /> Bulk Action: Award Points ({selectedUserIds.size} Selected)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Points to Award</Label>
                    <Input type="number" min={1} value={bulkPoints} onChange={(e) => setBulkPoints(e.target.value)} placeholder="e.g. 50" />
                  </div>
                  <div className="space-y-1">
                    <Label>Reason</Label>
                    <Select value={bulkReason} onValueChange={setBulkReason}>
                      <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent_reading">Excellent Reading</SelectItem>
                        <SelectItem value="quiz_performance">Quiz Performance</SelectItem>
                        <SelectItem value="participation">Class Participation</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                        <SelectItem value="helping_others">Helping Others</SelectItem>
                        <SelectItem value="extra_effort">Extra Effort</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {bulkReason === "other" && (
                      <Input className="mt-2" value={customBulkReason} onChange={(e) => setCustomBulkReason(e.target.value)} placeholder="Enter custom reason..." />
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedUserIds(new Set())}>Clear Selection</Button>
                  <Button size="sm" disabled={bulkAwarding} onClick={handleBulkAwardPoints}>
                    {bulkAwarding ? "Awarding..." : `Award to ${selectedUserIds.size} Students`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Award Points to Student
              </CardTitle>
              <CardDescription>
                {users.length} approved student{users.length === 1 ? "" : "s"} loaded. Search by name, admission, or class.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <div className="flex gap-2">
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger className="w-[110px] shrink-0"><SelectValue placeholder="Class" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All classes</SelectItem>
                        {classOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover open={openStudentPicker} onOpenChange={setOpenStudentPicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal text-left truncate">
                          {selectedUser
                            ? `${selectedUser.first_name} ${selectedUser.last_name}${selectedUser.student_class ? ` (${selectedUser.student_class})` : ""}`
                            : "Search student…"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Name, admission, roll, class…" />
                          <CommandList className="max-h-72">
                            <CommandEmpty>No student found.</CommandEmpty>
                            <CommandGroup>
                              {filteredUsers.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.first_name} ${user.last_name} ${user.admission_number || ""} ${user.roll_number || ""} ${user.student_class || ""}`}
                                  onSelect={() => {
                                    setSelectedUserId(user.id);
                                    setOpenStudentPicker(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")} />
                                  <span className="truncate">
                                    {user.first_name} {user.last_name}
                                    {user.admission_number ? ` · ${user.admission_number}` : ""}
                                    {user.student_class ? ` · ${user.student_class}` : ""}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Points to Award</Label>
                  <Input id="points" type="number" value={pointsToAward} onChange={(e) => setPointsToAward(e.target.value)} placeholder="Enter points" min={1} />
                </div>

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent_reading">Excellent Reading</SelectItem>
                      <SelectItem value="quiz_performance">Quiz Performance</SelectItem>
                      <SelectItem value="participation">Class Participation</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="helping_others">Helping Others</SelectItem>
                      <SelectItem value="extra_effort">Extra Effort</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {reason === "other" && (
                    <Input className="mt-2" value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Enter custom reason..." />
                  )}
                </div>
              </div>

              <div className="mt-4">
                <Button onClick={handleAwardPoints} disabled={awarding} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {awarding ? "Awarding..." : "Award Points"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Points Overview</CardTitle>
              <CardDescription>
                {filteredUsers.length} student{filteredUsers.length === 1 ? "" : "s"}
                {classFilter !== "all" ? ` in class ${classFilter}` : ""}. Select rows for bulk award.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No students found</p>
              ) : (
                <div className="max-h-[480px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                            onChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Admission</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Current Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...filteredUsers]
                        .sort((a, b) => (b.points || 0) - (a.points || 0))
                        .map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => toggleSelectUser(user.id)} />
                            </TableCell>
                            <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                            <TableCell className="font-mono text-xs">{user.admission_number || "—"}</TableCell>
                            <TableCell>{user.student_class || "N/A"}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {user.points || 0} points
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" /> Queue ({queueReadings.length})
              </CardTitle>
              <CardDescription>
                Pending and suspicious submissions. Scrap suspicious ones to discard without awarding points.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReadings ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : queueReadings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending or suspicious reading entries.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 border border-border/50 flex-wrap">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={selectedReadingIds.size === queueReadings.length && queueReadings.length > 0}
                        onChange={(e) => setSelectedReadingIds(e.target.checked ? new Set(queueReadings.map((r) => r.id)) : new Set())}
                      />
                      <span className="text-xs text-muted-foreground">
                        {selectedReadingIds.size > 0 ? `${selectedReadingIds.size} selected` : `${queueReadings.length} in queue`}
                      </span>
                      {queueReadings.some((r) => r.status === "suspicious") && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {queueReadings.filter((r) => r.status === "suspicious").length} suspicious
                        </Badge>
                      )}
                    </div>
                    {selectedReadingIds.size > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" className="h-7 text-xs" onClick={handleBulkApproveReadings} disabled={bulkProcessingReadings}>
                          <CheckCheck className="h-3 w-3 mr-1" /> Approve ({selectedReadingIds.size})
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleBulkScrapReadings} disabled={bulkProcessingReadings}>
                          <Eraser className="h-3 w-3 mr-1" /> Scrap ({selectedReadingIds.size})
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedReadingIds(new Set())}>Clear</Button>
                      </div>
                    )}
                  </div>
                  {queueReadings.map((r) =>
                    renderReadingRow(r, {
                      selectable: true,
                      showApprove: true,
                      showReject: r.status === "pending",
                      showScrap: true,
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" /> Past Approvals
                </CardTitle>
                <CardDescription>Recent approved/rejected entries. Scrap to revoke points from approved ones.</CardDescription>
              </div>
              <Select value={pastFilter} onValueChange={setPastFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredPast.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No past reading approvals yet.</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto">
                  {filteredPast.map((r) =>
                    renderReadingRow(r, {
                      showScrap: r.status === "approved",
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Points Configuration</CardTitle>
              <CardDescription>Set how many points students earn for each activity. Changes apply to future actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                {([
                  { key: "points_per_book_read", label: "Points per Reading Entry (approved)" },
                  { key: "points_per_quiz_passed", label: "Max Points per Quiz" },
                  { key: "points_per_daily_streak", label: "Points per Daily Streak" },
                  { key: "points_per_review", label: "Points per Book Review" },
                  { key: "points_per_issue", label: "Points when a book is issued" },
                  { key: "points_per_timely_return", label: "Points for timely return" },
                  { key: "points_per_study_minute", label: "Study Tracker XP per minute" },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      value={pointsRules[key] ?? ""}
                      onChange={(e) => setPointsRules((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
              <Button className="mt-6" onClick={handleSavePointsRules} disabled={savingRules}>
                {savingRules ? "Saving…" : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PointsManager;
