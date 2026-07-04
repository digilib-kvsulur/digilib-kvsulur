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
    const { data } = await supabase.from("book_issues")
      .select("id, due_date, user_id, books(title), profiles:user_id(first_name,last_name,student_class,roll_number)")
      .eq("status", "issued").lt("due_date", today).order("due_date", { ascending: true });
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  const remind = async (r: any) => {
    await supabase.from("notifications").insert({
      user_id: r.user_id,
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
