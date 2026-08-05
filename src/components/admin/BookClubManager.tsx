import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Trash2 } from "lucide-react";

export default function BookClubManager() {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", description: "", book_id: "", is_active: true });
  const [selected, setSelected] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);

  const load = async () => {
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from("book_clubs").select("*").order("created_at", { ascending: false }),
      supabase.from("books").select("id, title").order("title").limit(200),
    ]);
    setClubs(c || []);
    setBooks(b || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("book_clubs").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      book_id: form.book_id || null,
      created_by: user?.id,
      is_active: form.is_active,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Club created" }); setForm({ name: "", description: "", book_id: "", is_active: true }); load(); }
  };

  const remove = async (id: string) => {
    await supabase.from("book_clubs").delete().eq("id", id);
    load();
  };

  const moderate = async (clubId: string) => {
    setSelected(clubId);
    const { data } = await supabase.from("book_club_messages").select("*").eq("club_id", clubId).order("created_at", { ascending: false }).limit(50);
    setMessages(data || []);
  };

  const deleteMsg = async (id: string) => {
    await supabase.from("book_club_messages").delete().eq("id", id);
    if (selected) moderate(selected);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Book Clubs</h2>
        <p className="text-sm text-muted-foreground">Create clubs and moderate discussions.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Create club</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <div className="space-y-1.5">
            <Label>Linked book (optional)</Label>
            <select className="w-full h-10 rounded-md border px-3 text-sm" value={form.book_id}
              onChange={(e) => setForm((f) => ({ ...f, book_id: e.target.value }))}>
              <option value="">None</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} /><Label>Active</Label></div>
          <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Create</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {clubs.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.is_active ? "Active" : "Inactive"}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => moderate(c.id)}>Messages</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {selected && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent messages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="flex justify-between gap-2 text-sm border rounded p-2">
                <span className="line-clamp-2">{m.message}</span>
                <Button size="sm" variant="ghost" onClick={() => deleteMsg(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            {messages.length === 0 && <p className="text-xs text-muted-foreground">No messages</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
