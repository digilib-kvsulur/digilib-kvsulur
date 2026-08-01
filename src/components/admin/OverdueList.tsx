import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Send } from "lucide-react";

export default function OverdueList() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const today = new Date().toISOString().split("T")[0];

  const load = async () => {
    const { data, error } = await supabase.from("book_issues")
      .select("id, due_date, user_id, accession_number, books(title, accession_number, accession_numbers)")
      .eq("status", "issued").lt("due_date", today).order("due_date", { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to load overdue books.", variant: "destructive" });
      return;
    }
    const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
    let profileMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, first_name, last_name, student_class, roll_number, admission_number, employee_code").in("id", userIds);
      (profs || []).forEach((p: any) => { profileMap[p.id] = p; });
    }
    setRows((data || []).map((r: any) => ({ ...r, profiles: profileMap[r.user_id] })));
  };
  useEffect(() => { load(); }, []);

  const remind = async (r: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("notifications").insert({
      target_user_id: r.user_id,
      sent_by: user!.id,
      title: "Overdue book",
      message: `Please return "${r.books?.title}" — it was due on ${r.due_date}.`,
      type: "warning",
    });
    toast({ title: "Reminder sent" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> Overdue Books</h2>
        <p className="text-sm text-muted-foreground">{rows.length} book(s) past due date.</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue. 🎉</p>}
      <div className="space-y-2">
        {rows.map(r => {
          const days = Math.floor((Date.now() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24));
          return (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium text-sm">{r.books?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.profiles?.first_name} {r.profiles?.last_name} · Class {r.profiles?.student_class || "—"} · Roll {r.profiles?.roll_number || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.profiles?.admission_number ? `Admn: ${r.profiles.admission_number}` : r.profiles?.employee_code ? `Emp: ${r.profiles.employee_code}` : ""}
                    {(r.accession_number || r.books?.accession_number) && (
                      <span className="ml-2 font-mono">Acc: {r.accession_number || r.books?.accession_number}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{days}d overdue</Badge>
                  <Button size="sm" variant="outline" onClick={() => remind(r)}><Send className="h-4 w-4 mr-1" />Remind</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
