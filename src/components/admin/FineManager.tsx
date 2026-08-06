import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Save, Send, Download, Check, Ban, Plus, ChevronsUpDown } from "lucide-react";
import { buildUpiPaymentLink } from "@/lib/librarySettings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function FineManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState({
    rate_per_day: 1,
    grace_period_days: 0,
    upi_id: "",
    upi_payee_name: "PM SHRI KV AFS Sulur Library",
  });
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [openStudent, setOpenStudent] = useState(false);
  const [adding, setAdding] = useState(false);
  const [fineForm, setFineForm] = useState({
    user_id: "",
    book_title: "",
    days_overdue: "0",
    total_amount: "",
  });

  const load = async () => {
    try { await supabase.rpc("sync_overdue_fines" as any); } catch { /* non-blocking */ }
    const [{ data }, { data: fs }, { data: studs }] = await Promise.all([
      supabase.from("library_fines").select("*").order("created_at", { ascending: false }),
      supabase.from("fine_settings").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, student_class, admission_number")
        .eq("is_approved", true)
        .in("role", ["student", "teacher"])
        .order("first_name")
        .limit(2000),
    ]);
    if (fs) {
      setSettings({
        rate_per_day: Number(fs.rate_per_day) || 1,
        grace_period_days: Number(fs.grace_period_days) || 0,
        upi_id: fs.upi_id || "",
        upi_payee_name: fs.upi_payee_name || "PM SHRI KV AFS Sulur Library",
      });
    }
    setStudents(studs || []);
    const list = data || [];
    const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
    let map: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, student_class, admission_number")
        .in("id", ids);
      (profs || []).forEach((p) => { map[p.id] = p; });
    }
    setRows(list.map((r: any) => ({ ...r, profiles: map[r.user_id] })));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      const name = `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.toLowerCase();
      return name.includes(q) || (r.book_title || "").toLowerCase().includes(q);
    });
  }, [rows, filter, search]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("fine_settings").upsert({
        id: 1,
        rate_per_day: settings.rate_per_day,
        grace_period_days: settings.grace_period_days,
        upi_id: settings.upi_id,
        upi_payee_name: settings.upi_payee_name,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from("system_settings").upsert([
        { key: "fine_per_day", value: settings.rate_per_day as any },
        { key: "upi_id", value: settings.upi_id as any },
        { key: "upi_payee_name", value: settings.upi_payee_name as any },
      ], { onConflict: "key" });
      toast({ title: "Fine settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: "paid" | "waived") => {
    const patch: any = { status };
    if (status === "paid") {
      patch.paid_at = new Date().toISOString();
      patch.payment_method = patch.payment_method || "manual";
    }
    const { error } = await supabase.from("library_fines").update(patch).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: status === "paid" ? "Marked paid" : "Waived" }); load(); }
  };

  const remind = async (r: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const link = buildUpiPaymentLink({
      upiId: settings.upi_id,
      payeeName: settings.upi_payee_name,
      amount: Number(r.total_amount),
      note: `Fine: ${r.book_title || "Library"}`,
    });
    await supabase.from("notifications").insert({
      target_user_id: r.user_id,
      sent_by: user!.id,
      title: "Library fine pending",
      message: `You have a pending fine of ₹${r.total_amount} for "${r.book_title || "a book"}".${link ? " Pay via UPI from My Fines." : ""}`,
      type: "warning",
    });
    toast({ title: "Reminder sent" });
  };

  const exportCsv = () => {
    const pending = rows.filter((r) => r.status === "pending");
    const headers = ["Student", "Class", "Book", "Days", "Amount", "Created"];
    const lines = pending.map((r) => [
      `"${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}"`,
      r.profiles?.student_class || "",
      `"${r.book_title || ""}"`,
      r.days_overdue,
      r.total_amount,
      r.created_at,
    ].join(","));
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "outstanding_fines.csv";
    a.click();
  };

  const selectedStudent = students.find((s) => s.id === fineForm.user_id);

  const addFine = async () => {
    const amount = parseFloat(fineForm.total_amount);
    if (!fineForm.user_id) {
      toast({ title: "Select a student", variant: "destructive" });
      return;
    }
    if (!amount || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const days = Math.max(0, parseInt(fineForm.days_overdue) || 0);
      const rate = settings.rate_per_day || 1;
      const { error } = await supabase.from("library_fines").insert({
        user_id: fineForm.user_id,
        book_issue_id: null,
        days_overdue: days,
        rate_per_day: rate,
        total_amount: amount,
        status: "pending",
        book_title: fineForm.book_title.trim() || "Manual fine",
      });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("notifications").insert({
        target_user_id: fineForm.user_id,
        sent_by: user!.id,
        title: "Library fine added",
        message: `A fine of ₹${amount.toFixed(2)} was added${fineForm.book_title.trim() ? ` for "${fineForm.book_title.trim()}"` : ""}. Pay via My Fines.`,
        type: "warning",
      });

      toast({ title: "Fine added" });
      setFineForm({ user_id: "", book_title: "", days_overdue: "0", total_amount: "" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <IndianRupee className="h-6 w-6" /> Fine Management
          </h2>
          <p className="text-sm text-muted-foreground">Track overdue fines, payments, and UPI settings.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Add Fine</CardTitle>
          <CardDescription>Manually add a fine for a student or teacher (lost book, damage, etc.).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>User</Label>
            <Popover open={openStudent} onOpenChange={setOpenStudent}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedStudent
                    ? `${selectedStudent.first_name} ${selectedStudent.last_name}${selectedStudent.student_class ? ` · ${selectedStudent.student_class}` : ""}`
                    : "Search student / teacher…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Name, class, admission…" />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {students.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.first_name} ${s.last_name} ${s.admission_number || ""} ${s.student_class || ""}`}
                          onSelect={() => {
                            setFineForm((f) => ({ ...f, user_id: s.id }));
                            setOpenStudent(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", fineForm.user_id === s.id ? "opacity-100" : "opacity-0")} />
                          {s.first_name} {s.last_name}
                          {s.admission_number ? ` · ${s.admission_number}` : ""}
                          {s.student_class ? ` · ${s.student_class}` : ""}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Reason / book title</Label>
            <Input
              value={fineForm.book_title}
              onChange={(e) => setFineForm((f) => ({ ...f, book_title: e.target.value }))}
              placeholder="e.g. Lost book / Damaged cover"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              value={fineForm.total_amount}
              onChange={(e) => setFineForm((f) => ({ ...f, total_amount: e.target.value }))}
              placeholder="e.g. 50"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Days overdue (optional)</Label>
            <Input
              type="number"
              min={0}
              value={fineForm.days_overdue}
              onChange={(e) => {
                const days = e.target.value;
                setFineForm((f) => {
                  const next = { ...f, days_overdue: days };
                  const d = parseInt(days) || 0;
                  if (d > 0 && !f.total_amount) {
                    next.total_amount = String(d * (settings.rate_per_day || 1));
                  }
                  return next;
                });
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={addFine} disabled={adding}>
              <Plus className="h-4 w-4 mr-2" /> {adding ? "Adding…" : "Add Fine"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fine Settings</CardTitle>
          <CardDescription>Rate, grace period, and UPI payment details</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Rate per day (₹)</Label>
            <Input type="number" min={0} value={settings.rate_per_day}
              onChange={(e) => setSettings((s) => ({ ...s, rate_per_day: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Grace period (days)</Label>
            <Input type="number" min={0} value={settings.grace_period_days}
              onChange={(e) => setSettings((s) => ({ ...s, grace_period_days: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-1.5">
            <Label>UPI ID</Label>
            <Input value={settings.upi_id} placeholder="library@upi"
              onChange={(e) => setSettings((s) => ({ ...s, upi_id: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Payee name</Label>
            <Input value={settings.upi_payee_name}
              onChange={(e) => setSettings((s) => ({ ...s, upi_payee_name: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search student or book…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No fines found.</p>}
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-sm">{r.book_title || "Book"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.profiles?.first_name} {r.profiles?.last_name}
                  {r.profiles?.student_class ? ` · Class ${r.profiles.student_class}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.days_overdue}d × ₹{r.rate_per_day} = ₹{r.total_amount}
                  {r.accruing && r.status === "pending" ? " · accruing" : ""}
                  {r.payment_ref === "pending_confirmation" ? " · Student marked paid" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>{r.status}</Badge>
                {r.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => setStatus(r.id, "paid")}><Check className="h-3.5 w-3.5 mr-1" /> Paid</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "waived")}><Ban className="h-3.5 w-3.5 mr-1" /> Waive</Button>
                    <Button size="sm" variant="ghost" onClick={() => remind(r)}><Send className="h-3.5 w-3.5 mr-1" /> Remind</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
