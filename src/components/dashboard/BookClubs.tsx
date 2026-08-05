import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Send } from "lucide-react";

interface Props { userId: string }

export default function BookClubs({ userId }: Props) {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  const load = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("book_clubs").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("book_club_members").select("club_id").eq("user_id", userId),
    ]);
    setClubs(c || []);
    setMemberships(new Set((m || []).map((x: any) => x.club_id)));
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const join = async (clubId: string) => {
    const { error } = await supabase.from("book_club_members").insert({ club_id: clubId, user_id: userId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Joined club" }); load(); }
  };

  const openClub = async (club: any) => {
    setActive(club);
    const { data } = await supabase.from("book_club_messages").select("*").eq("club_id", club.id).order("created_at", { ascending: true }).limit(100);
    const list = data || [];
    const ids = Array.from(new Set(list.map((m: any) => m.user_id)));
    let map: Record<string, any> = {};
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      (p || []).forEach((x) => { map[x.id] = x; });
    }
    setMessages(list.map((m: any) => ({ ...m, profile: map[m.user_id] })));
  };

  const send = async () => {
    if (!active || !text.trim()) return;
    const { error } = await supabase.from("book_club_messages").insert({
      club_id: active.id, user_id: userId, message: text.trim(),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setText(""); openClub(active); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Book Clubs</h2>
        <p className="text-sm text-muted-foreground">Join clubs and discuss books with classmates.</p>
      </div>
      {!active ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {clubs.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                <div className="flex gap-2">
                  {memberships.has(c.id) ? (
                    <Button size="sm" onClick={() => openClub(c)}>Open chat</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => join(c.id)}>Join</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {clubs.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No active clubs yet.</CardContent></Card>}
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{active.name}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setActive(null)}>Back</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
              {messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold text-xs">{m.profile?.first_name || "Member"}: </span>
                  {m.message}
                </div>
              ))}
              {messages.length === 0 && <p className="text-xs text-muted-foreground">No messages yet. Start the discussion!</p>}
            </div>
            <div className="flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" onKeyDown={(e) => e.key === "Enter" && send()} />
              <Button onClick={send}><Send className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
