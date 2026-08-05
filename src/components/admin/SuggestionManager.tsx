import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Check, X } from "lucide-react";

export default function SuggestionManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from("book_suggestions").select("*").order("created_at", { ascending: false });
    const list = data || [];
    const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
    let map: Record<string, any> = {};
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, first_name, last_name, student_class").in("id", ids);
      (p || []).forEach((x) => { map[x.id] = x; });
    }
    setRows(list.map((r: any) => ({ ...r, profile: map[r.user_id] })));
  };

  useEffect(() => { load(); }, []);

  const decide = async (r: any, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const admin_note = notes[r.id] || null;
    const { error } = await supabase.from("book_suggestions").update({ status, admin_note }).eq("id", r.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("notifications").insert({
      target_user_id: r.user_id,
      sent_by: user!.id,
      title: status === "approved" ? "Book suggestion approved" : "Book suggestion rejected",
      message: status === "approved"
        ? `Your suggestion "${r.title}" was approved.${admin_note ? ` Note: ${admin_note}` : ""}`
        : `Your suggestion "${r.title}" was not accepted.${admin_note ? ` Note: ${admin_note}` : ""}`,
      type: status === "approved" ? "success" : "info",
    });
    toast({ title: status === "approved" ? "Approved" : "Rejected" });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Lightbulb className="h-6 w-6" /> Book Suggestions</h2>
        <p className="text-sm text-muted-foreground">Review student procurement suggestions.</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No suggestions yet.</p>}
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.author || "Unknown author"} · {r.profile?.first_name} {r.profile?.last_name}
                  </p>
                  {r.reason && <p className="text-xs mt-1">{r.reason}</p>}
                </div>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
              {r.status === "pending" && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Input className="max-w-xs" placeholder="Admin note (optional)"
                    value={notes[r.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
                  <Button size="sm" onClick={() => decide(r, "approved")}><Check className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(r, "rejected")}><X className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
