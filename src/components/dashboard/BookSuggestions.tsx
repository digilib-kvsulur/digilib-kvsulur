import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";

interface Props { userId: string; embedded?: boolean }

export default function BookSuggestions({ userId, embedded = false }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", author: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("book_suggestions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setRows(data || []);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const submit = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("book_suggestions").insert({
      user_id: userId,
      title: form.title.trim(),
      author: form.author.trim() || null,
      reason: form.reason.trim() || null,
    });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Suggestion submitted" });
      setForm({ title: "", author: "", reason: "" });
      load();
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Suggest a Book</h2>
          <p className="text-sm text-muted-foreground">Recommend titles for the library to procure.</p>
        </div>
      )}
      <Card>
        {embedded ? null : <CardHeader><CardTitle className="text-base">New suggestion</CardTitle></CardHeader>}
        <CardContent className={`space-y-3 ${embedded ? "pt-0" : ""}`}>
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Author</Label><Input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} /></div>
          <Button onClick={submit} disabled={saving}>{saving ? "Submitting..." : "Submit"}</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.author}{r.admin_note ? ` · Note: ${r.admin_note}` : ""}</p>
              </div>
              <Badge variant="secondary">{r.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
