import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Save, Send, Download, Check, Ban } from "lucide-react";
import { buildUpiPaymentLink } from "@/lib/librarySettings";

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

  const load = async () => {
    const [{ data }, { data: fs }] = await Promise.all([
      supabase.from("library_fines").select("*").order("created_at", { ascending: false }),
      supabase.from("fine_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (fs) {
      setSettings({
        rate_per_day: Number(fs.rate_per_day) || 1,
        grace_period_days: Number(fs.grace_period_days) || 0,
        upi_id: fs.upi_id || "",
        upi_payee_name: fs.upi_payee_name || "PM SHRI KV AFS Sulur Library",
      });
    }
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
