import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, StickyNote, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  { id: "yellow", cls: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700" },
  { id: "pink", cls: "bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700" },
  { id: "blue", cls: "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700" },
  { id: "green", cls: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" },
  { id: "purple", cls: "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700" },
];
const colorClass = (id: string) => COLORS.find((c) => c.id === id)?.cls || COLORS[0].cls;

const StudentNotes = ({ userId }: { userId: string }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "", color: "yellow" });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setNotes(data || []); setLoading(false);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const save = async (id?: string) => {
    if (!draft.title.trim() && !draft.content.trim()) return;
    if (id) {
      await supabase.from("notes").update({ title: draft.title || "Untitled", content: draft.content, color: draft.color }).eq("id", id);
    } else {
      await supabase.from("notes").insert({ user_id: userId, title: draft.title || "Untitled", content: draft.content, color: draft.color });
    }
    setEditing(null); setDraft({ title: "", content: "", color: "yellow" });
    toast({ title: "Saved" }); load();
  };

  const del = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  const startEdit = (n?: any) => {
    if (n) { setEditing(n.id); setDraft({ title: n.title, content: n.content, color: n.color }); }
    else { setEditing("new"); setDraft({ title: "", content: "", color: "yellow" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><StickyNote className="h-5 w-5 text-warning" /> My Notes</h2>
          <p className="text-sm text-muted-foreground">Personal study notes & reminders</p>
        </div>
        {editing === null && (
          <Button size="sm" className="gradient-primary border-0" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-2" />New Note</Button>
        )}
      </div>

      {editing === "new" && (
        <Card className={`border-2 ${colorClass(draft.color)}`}>
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Note title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Textarea placeholder="Write your note..." rows={5} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button key={c.id} onClick={() => setDraft({ ...draft, color: c.id })}
                    className={`w-6 h-6 rounded-full border-2 ${c.cls} ${draft.color === c.id ? "ring-2 ring-foreground ring-offset-2" : ""}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                <Button size="sm" onClick={() => save()}><Save className="h-4 w-4 mr-1" />Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n) => (
            <Card key={n.id} className={`border-2 ${colorClass(n.color)} hover-lift`}>
              <CardContent className="p-4">
                {editing === n.id ? (
                  <div className="space-y-2">
                    <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    <Textarea rows={4} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
                    <div className="flex gap-1.5">
                      {COLORS.map((c) => (
                        <button key={c.id} onClick={() => setDraft({ ...draft, color: c.id })}
                          className={`w-5 h-5 rounded-full border-2 ${c.cls} ${draft.color === c.id ? "ring-2 ring-foreground ring-offset-1" : ""}`} />
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => save(n.id)}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => startEdit(n)} className="cursor-pointer">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{n.title}</h3>
                      <button onClick={(e) => { e.stopPropagation(); del(n.id); }} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs whitespace-pre-wrap line-clamp-6">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.updated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && editing !== "new" && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notes yet. Create your first note!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentNotes;
