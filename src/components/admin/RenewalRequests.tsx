import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RenewalRequests() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("book_renewals")
      .select("*, book_issues(id, due_date, books(title), user_id), profiles:user_id(first_name,last_name,student_class)")
      .eq("status", "pending").order("created_at", { ascending: true });
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  const decide = async (row: any, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (approve && row.book_issues?.due_date) {
      const newDue = new Date(row.book_issues.due_date);
      newDue.setDate(newDue.getDate() + (row.requested_days || 7));
      await supabase.from("book_issues").update({
        due_date: newDue.toISOString().split("T")[0],
        renewal_count: (row.book_issues.renewal_count || 0) + 1,
      }).eq("id", row.book_issues.id);
    }
    await supabase.from("book_renewals").update({
      status: approve ? "approved" : "rejected",
      decided_by: user?.id, decided_at: new Date().toISOString(),
    }).eq("id", row.id);
    await supabase.from("notifications").insert({
      target_user_id: row.user_id,
      sent_by: user!.id,
      title: approve ? "Renewal approved" : "Renewal rejected",
      message: `Your renewal request for "${row.book_issues?.books?.title || "book"}" was ${approve ? "approved" : "rejected"}.`,
      type: approve ? "success" : "info",
    });
    toast({ title: approve ? "Approved" : "Rejected" });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Renewal Requests</h2>
        <p className="text-sm text-muted-foreground">Approve or reject student book extension requests.</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
      {rows.map(r => (
        <Card key={r.id}>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-medium">{r.book_issues?.books?.title || "Book"}</p>
              <p className="text-xs text-muted-foreground">
                {r.profiles?.first_name} {r.profiles?.last_name} · Class {r.profiles?.student_class || "—"} · +{r.requested_days} days
              </p>
              {r.student_note && <p className="text-sm mt-1 italic">"{r.student_note}"</p>}
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">Due {r.book_issues?.due_date}</Badge>
              <Button size="sm" onClick={() => decide(r, true)}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => decide(r, false)}>Reject</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
