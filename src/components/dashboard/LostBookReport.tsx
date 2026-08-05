import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Props { userId: string }

export default function LostBookReport({ userId }: Props) {
  const { toast } = useToast();
  const [issues, setIssues] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: iss }, { data: reps }] = await Promise.all([
      supabase.from("book_issues").select("id, accession_number, book_id, books(title)").eq("user_id", userId).eq("status", "issued"),
      supabase.from("lost_book_reports").select("*").eq("user_id", userId).order("reported_at", { ascending: false }),
    ]);
    setIssues(iss || []);
    setReports(reps || []);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const report = async (issue: any) => {
    if (!confirm(`Report "${issue.books?.title}" as lost? Replacement cost ₹300 may apply.`)) return;
    setBusy(issue.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const cost = 300;
      const { error } = await supabase.from("lost_book_reports").insert({
        user_id: userId,
        book_issue_id: issue.id,
        book_title: issue.books?.title || "Unknown",
        accession_number: issue.accession_number || null,
        replacement_cost: cost,
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        target_user_id: null,
        sent_by: user!.id,
        title: "Lost book report",
        message: `${userId} reported "${issue.books?.title}" as lost (₹${cost}).`,
        type: "warning",
      });
      toast({ title: "Report submitted", description: "The librarian has been notified." });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Lost Book Report</h2>
        <p className="text-sm text-muted-foreground">Report currently issued books as lost.</p>
      </div>
      {issues.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No currently issued books.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {issues.map((i) => (
            <Card key={i.id}>
              <CardContent className="p-4 flex justify-between items-center gap-3">
                <div>
                  <p className="font-medium text-sm">{i.books?.title}</p>
                  {i.accession_number && <p className="text-xs text-muted-foreground font-mono">Acc: {i.accession_number}</p>}
                </div>
                <Button size="sm" variant="destructive" disabled={busy === i.id} onClick={() => report(i)}>
                  Report as Lost
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {reports.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Your reports</p>
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex justify-between">
                <div>
                  <p className="text-sm">{r.book_title}</p>
                  <p className="text-xs text-muted-foreground">₹{r.replacement_cost}</p>
                </div>
                <Badge variant="secondary">{r.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
