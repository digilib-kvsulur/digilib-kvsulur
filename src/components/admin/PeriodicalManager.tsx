import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Newspaper, Plus, Trash2 } from "lucide-react";

export default function PeriodicalManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState({ title: "", type: "magazine", frequency: "", publisher: "" });
  const [issueForm, setIssueForm] = useState({ issue_date: "", volume: "", issue_number: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("periodicals").select("*").order("title");
    setItems(data || []);
  };

  const loadIssues = async (id: string) => {
    const { data } = await supabase.from("periodical_issues").select("*").eq("periodical_id", id).order("issue_date", { ascending: false });
    setIssues(data || []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) loadIssues(selected); else setIssues([]); }, [selected]);

  const addPeriodical = async () => {
    if (!form.title.trim()) return;
    const { error } = await supabase.from("periodicals").insert({
      title: form.title.trim(), type: form.type, frequency: form.frequency || null, publisher: form.publisher || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Added" }); setForm({ title: "", type: "magazine", frequency: "", publisher: "" }); load(); }
  };

  const addIssue = async () => {
    if (!selected || !issueForm.issue_date) return;
    const { error } = await supabase.from("periodical_issues").insert({
      periodical_id: selected,
      issue_date: issueForm.issue_date,
      volume: issueForm.volume || null,
      issue_number: issueForm.issue_number || null,
      notes: issueForm.notes || null,
      on_shelf: true,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Issue added" }); setIssueForm({ issue_date: "", volume: "", issue_number: "", notes: "" }); loadIssues(selected); }
  };

  const toggleShelf = async (id: string, on_shelf: boolean) => {
    await supabase.from("periodical_issues").update({ on_shelf }).eq("id", id);
    loadIssues(selected);
  };

  const remove = async (id: string) => {
    await supabase.from("periodicals").delete().eq("id", id);
    if (selected === id) setSelected("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="h-6 w-6" /> Periodicals</h2>
        <p className="text-sm text-muted-foreground">Newspapers, magazines, and journals.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Add periodical</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newspaper">Newspaper</SelectItem>
                <SelectItem value="magazine">Magazine</SelectItem>
                <SelectItem value="journal">Journal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Frequency</Label><Input value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} placeholder="Daily / Weekly / Monthly" /></div>
          <div className="space-y-1.5"><Label>Publisher</Label><Input value={form.publisher} onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))} /></div>
          <Button onClick={addPeriodical}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {items.map((p) => (
            <Card key={p.id} className={selected === p.id ? "border-primary" : ""}>
              <CardContent className="p-3 flex justify-between items-center gap-2">
                <button className="text-left flex-1" onClick={() => setSelected(p.id)}>
                  <p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.type} · {p.frequency || "—"}</p>
                </button>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {selected && (
          <Card>
            <CardHeader><CardTitle className="text-base">Issues</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={issueForm.issue_date} onChange={(e) => setIssueForm((f) => ({ ...f, issue_date: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Issue #</Label><Input value={issueForm.issue_number} onChange={(e) => setIssueForm((f) => ({ ...f, issue_number: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Volume</Label><Input value={issueForm.volume} onChange={(e) => setIssueForm((f) => ({ ...f, volume: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Notes</Label><Input value={issueForm.notes} onChange={(e) => setIssueForm((f) => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <Button size="sm" onClick={addIssue}>Add issue</Button>
              <div className="space-y-2 pt-2">
                {issues.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
                    <span>{i.issue_date}{i.issue_number ? ` · #${i.issue_number}` : ""}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">On shelf</span>
                      <Switch checked={i.on_shelf} onCheckedChange={(c) => toggleShelf(i.id, c)} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
