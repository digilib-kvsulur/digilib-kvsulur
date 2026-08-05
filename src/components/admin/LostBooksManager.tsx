import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check } from "lucide-react";

export default function LostBooksManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from("lost_book_reports").select("*").order("reported_at", { ascending: false });
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

  const settle = async (id: string) => {
    const { error } = await supabase.from("lost_book_reports").update({
      status: "settled",
      admin_note: notes[id] || null,
      settled_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Marked settled" }); load(); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6" /> Lost Books</h2>
        <p className="text-sm text-muted-foreground">Student lost-book reports and settlements.</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No lost book reports.</p>}
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{r.book_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.profile?.first_name} {r.profile?.last_name}
                    {r.accession_number ? ` · Acc ${r.accession_number}` : ""}
                    {` · ₹${r.replacement_cost}`}
                  </p>
                </div>
                <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
              </div>
              {r.status === "open" && (
                <div className="flex flex-wrap gap-2">
                  <Input className="max-w-xs" placeholder="Settlement note"
                    value={notes[r.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
                  <Button size="sm" onClick={() => settle(r.id)}><Check className="h-3.5 w-3.5 mr-1" /> Mark Settled</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
