import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, History, Loader2, RefreshCw, ShieldCheck, User as UserIcon, Zap } from "lucide-react";

type LedgerRow = {
  id: string;
  actor_id: string | null;
  delta: number;
  balance_after: number;
  event_type: "opening_balance" | "credit" | "debit";
  description: string;
  created_at: string;
};

type HistoryResponse = {
  balance: number;
  earned: number;
  deducted: number;
  event_count: number;
  events: LedgerRow[];
};

const PAGE_SIZE = 50;
const number = (value: unknown) => Number(value ?? 0).toLocaleString("en-IN");

const PointsHistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUserId = searchParams.get("userId");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState<HistoryResponse>({ balance: 0, earned: 0, deducted: 0, event_count: 0, events: [] });
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const historyOffset = useRef(0);

  const fetchHistory = useCallback(async (targetId: string, append = false) => {
    if (!targetId) return;
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const [profileResult, historyResult] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, student_class, admission_number, role").eq("id", targetId).single(),
        supabase.rpc("get_point_history", { p_user_id: targetId, p_limit: PAGE_SIZE, p_offset: append ? historyOffset.current : 0 }),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (historyResult.error) throw historyResult.error;
      const payload = historyResult.data as unknown as HistoryResponse;
      setProfile(profileResult.data);
      setSummary(payload);
      setRows(previous => append ? [...previous, ...(payload.events || [])] : (payload.events || []));
      historyOffset.current = (append ? historyOffset.current : 0) + (payload.events || []).length;
    } catch (cause: any) {
      console.error("Unable to load point history", cause);
      setError(cause?.message || "Could not load points history.");
      if (!append) { setRows([]); setProfile(null); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: ownProfile, error: ownProfileError } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
      if (ownProfileError) { setError(ownProfileError.message); setLoading(false); return; }
      const staff = ownProfile.role === "admin" || ownProfile.role === "teacher";
      if (cancelled) return;
      setIsStaff(staff);
      let targetId = user.id;
      if (staff) {
        const { data } = await supabase.from("profiles").select("id, first_name, last_name, student_class, admission_number, points").eq("role", "student").order("first_name");
        if (cancelled) return;
        setStudents(data || []);
        if (queryUserId) targetId = queryUserId;
      }
      if (cancelled) return;
      setUserId(targetId);
      await fetchHistory(targetId);
    };
    void init();
    return () => { cancelled = true; };
  }, [fetchHistory, navigate, queryUserId]);

  const selectStudent = (id: string) => {
    setUserId(id);
    setSearchParams({ userId: id });
    setRows([]);
    historyOffset.current = 0;
  };
  const filteredRows = rows.filter(row => filter === "all" || (filter === "credit" ? row.delta > 0 : row.delta < 0));
  const hasMore = rows.length < summary.event_count;

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
            <div><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Zap className="h-6 w-6 text-primary" />Points history</h1><p className="text-sm text-muted-foreground">A clear record of every change to the account balance.</p></div>
          </div>
          {isStaff && students.length > 0 && <div className="flex items-center gap-2 rounded-xl border bg-card p-2"><UserIcon className="ml-1 h-4 w-4 text-muted-foreground" /><Select value={userId} onValueChange={selectStudent}><SelectTrigger className="w-[240px]"><SelectValue placeholder="Choose a student" /></SelectTrigger><SelectContent className="max-h-72">{students.map(student => <SelectItem key={student.id} value={student.id}>{student.first_name} {student.last_name} · {number(student.points)} XP</SelectItem>)}</SelectContent></Select></div>}
        </header>

        {profile && <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-background"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{profile.first_name} {profile.last_name}</h2><Badge variant="outline" className="capitalize">{profile.role}</Badge>{profile.student_class && <Badge variant="secondary">Class {profile.student_class}</Badge>}{profile.admission_number && <span className="text-xs text-muted-foreground">Adm. {profile.admission_number}</span>}</div><p className="mt-1 text-sm text-muted-foreground">{isStaff ? "Account balance and verified point ledger" : "Your current account balance"}</p></div><div className="rounded-2xl bg-primary/10 px-5 py-3 text-right"><p className="text-3xl font-black text-primary">{number(summary.balance)}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current points</p></div></CardContent></Card>}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-2xl font-extrabold text-emerald-600">+{number(summary.earned)}</p><p className="text-xs text-muted-foreground">Points credited</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-extrabold text-rose-600">−{number(summary.deducted)}</p><p className="text-xs text-muted-foreground">Points deducted</p></CardContent></Card>
          <Card className="col-span-2 sm:col-span-1"><CardContent className="p-4"><p className="text-2xl font-extrabold">{number(summary.event_count)}</p><p className="text-xs text-muted-foreground">Ledger entries</p></CardContent></Card>
        </section>
        <p className="-mt-3 text-xs text-muted-foreground">For accounts that existed before point tracking, credited totals include the starting balance recorded at setup.</p>

        <Card>
          <CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><History className="h-4 w-4 text-primary" />Account activity</CardTitle><CardDescription>Each entry shows the change and the balance after it was applied.</CardDescription></div><div className="flex gap-2">{(["all", "credit", "debit"] as const).map(value => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>{value === "all" ? "All" : value === "credit" ? "Added" : "Deducted"}</Button>)}<Button size="icon" variant="outline" aria-label="Refresh history" onClick={() => void fetchHistory(userId)}><RefreshCw className="h-4 w-4" /></Button></div></div></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading point history…</div> : error ? <div className="py-8 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-3" variant="outline" onClick={() => void fetchHistory(userId)}>Try again</Button><p className="mt-3 text-xs text-muted-foreground">If this is the new point history, apply the canonical points ledger migration in Supabase first.</p></div> : filteredRows.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">No {filter === "all" ? "point" : filter} entries yet.</div> : filteredRows.map(row => {
              const positive = row.delta >= 0;
              const opening = row.event_type === "opening_balance";
              return <div key={row.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>{positive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{row.description}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Badge variant="outline" className="text-[10px]">{opening ? "Starting balance" : positive ? "Credit" : "Deduction"}</Badge>{row.actor_id && row.actor_id !== userId && <Badge variant="secondary" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" />Staff action</Badge>}<span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div></div><div className="shrink-0 text-right"><p className={`font-bold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{positive ? "+" : "−"}{number(Math.abs(row.delta))}</p><p className="text-[10px] text-muted-foreground">Balance {number(row.balance_after)}</p></div></div>;
            })}
            {!loading && !error && hasMore && <div className="pt-2 text-center"><Button variant="outline" disabled={loadingMore} onClick={() => void fetchHistory(userId, true)}>{loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Load older entries</Button></div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PointsHistoryPage;
