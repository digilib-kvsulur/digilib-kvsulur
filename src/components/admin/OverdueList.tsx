import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Send, Users } from "lucide-react";
import {
  buildUpiPaymentLink,
  calculateFine,
  fetchFineSettings,
  getDaysOverdue,
  type LibraryFineSettings,
} from "@/lib/librarySettings";

function localTodayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isIssueOverdue(dueDate: string | null | undefined, status: string) {
  if (!dueDate || status === "returned") return false;
  if (status !== "issued" && status !== "overdue") return false;
  return String(dueDate).slice(0, 10) < localTodayISODate();
}

export default function OverdueList() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fineSettings, setFineSettings] = useState<LibraryFineSettings | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data, error }, settings] = await Promise.all([
        supabase
          .from("book_issues")
          .select("id, due_date, user_id, book_id, status, accession_number")
          .in("status", ["issued", "overdue"])
          .order("due_date", { ascending: true }),
        fetchFineSettings(),
      ]);
      setFineSettings(settings);
      if (error) {
        console.error(error);
        toast({ title: "Error", description: error.message || "Failed to load overdue books.", variant: "destructive" });
        setRows([]);
        return;
      }

      const overdue = (data || []).filter((r: any) => isIssueOverdue(r.due_date, r.status));
      const userIds = Array.from(new Set(overdue.map((r: any) => r.user_id).filter(Boolean)));
      const bookIds = Array.from(new Set(overdue.map((r: any) => r.book_id).filter(Boolean)));

      let profileMap: Record<string, any> = {};
      let bookMap: Record<string, any> = {};

      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, student_class, roll_number, admission_number, role")
          .in("id", userIds);
        (profs || []).forEach((p: any) => {
          profileMap[p.id] = p;
        });
      }
      if (bookIds.length) {
        const { data: books } = await supabase
          .from("books")
          .select("id, title, accession_number, accession_numbers")
          .in("id", bookIds);
        (books || []).forEach((b: any) => {
          bookMap[b.id] = b;
        });
      }

      setRows(
        overdue.map((r: any) => ({
          ...r,
          profiles: profileMap[r.user_id],
          books: bookMap[r.book_id],
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fineFor = (r: any) => {
    const days = getDaysOverdue(r.due_date);
    const amount = fineSettings ? calculateFine(days, fineSettings.finePerDay) : 0;
    return { days, amount };
  };

  const remindMessage = (r: any) => {
    const { days, amount } = fineFor(r);
    const title = r.books?.title || "book";
    let msg = `Please return "${title}" — it was due on ${r.due_date} (${days} day(s) overdue).`;
    if (amount > 0) msg += ` Current fine: ₹${amount}.`;
    if (fineSettings?.upiId && amount > 0) {
      const link = buildUpiPaymentLink({
        upiId: fineSettings.upiId,
        payeeName: fineSettings.upiPayeeName,
        amount,
        note: `Fine: ${title}`,
      });
      if (link) msg += ` Pay via UPI: ${fineSettings.upiId} (open Pay via UPI on your My Books page).`;
    }
    return msg;
  };

  const remind = async (r: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("notifications").insert({
      target_user_id: r.user_id,
      sent_by: user!.id,
      title: "Overdue book",
      message: remindMessage(r),
      type: "warning",
    });
    toast({ title: "Reminder sent" });
  };

  const remindAll = async () => {
    if (!rows.length) return;
    setBulkSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const inserts = rows.map((r) => ({
        target_user_id: r.user_id,
        sent_by: user!.id,
        title: "Overdue book",
        message: remindMessage(r),
        type: "warning",
      }));
      const { error } = await supabase.from("notifications").insert(inserts);
      if (error) throw error;
      toast({ title: "Reminders sent", description: `Notified ${rows.length} overdue borrower(s).` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBulkSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Overdue Books
          </h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} book(s) past due date
            {fineSettings ? ` · ₹${fineSettings.finePerDay}/day fine` : ""}.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={async () => {
              const { data, error } = await supabase.rpc("send_due_soon_reminders" as any, { p_days: 2 });
              if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
              else toast({ title: "Due-soon reminders sent", description: `${data || 0} notification(s).` });
            }}
          >
            Due Soon Reminders
          </Button>
          {rows.length > 0 && (
            <Button variant="outline" onClick={remindAll} disabled={bulkSending}>
              <Users className="h-4 w-4 mr-2" />
              {bulkSending ? "Sending..." : "Remind All Overdue"}
            </Button>
          )}
        </div>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue.</p>}
      <div className="space-y-2">
        {rows.map((r) => {
          const { days, amount } = fineFor(r);
          return (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium text-sm">{r.books?.title || "Unknown title"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.profiles?.first_name} {r.profiles?.last_name} · Class {r.profiles?.student_class || "—"} · Roll{" "}
                    {r.profiles?.roll_number || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due {r.due_date}
                    {r.profiles?.admission_number && (
                      <span className="ml-2">
                        {r.profiles.role === "teacher" ? "Emp Code" : "Admn"}: {r.profiles.admission_number}
                      </span>
                    )}
                    {(r.accession_number || r.books?.accession_number) && (
                      <span className="ml-2 font-mono">Acc: {r.accession_number || r.books?.accession_number}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="destructive">{days}d overdue</Badge>
                  {amount > 0 && <Badge variant="outline">₹{amount} fine</Badge>}
                  <Button size="sm" variant="outline" onClick={() => remind(r)}>
                    <Send className="h-4 w-4 mr-1" />
                    Remind
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
