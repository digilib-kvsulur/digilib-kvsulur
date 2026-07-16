import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function WishlistView() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: wl } = await supabase.from("book_wishlist").select("*").order("created_at", { ascending: false });
      const userIds = Array.from(new Set((wl || []).map((w: any) => w.user_id)));
      const bookIds = Array.from(new Set((wl || []).map((w: any) => w.book_id)));
      const [{ data: profs }, { data: bks }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id, first_name, last_name, student_class").in("id", userIds) : Promise.resolve({ data: [] } as any),
        bookIds.length ? supabase.from("books").select("id, title, author, accession_number, available_copies").in("id", bookIds) : Promise.resolve({ data: [] } as any),
      ]);
      const pm = new Map((profs || []).map((p: any) => [p.id, p]));
      const bm = new Map((bks || []).map((b: any) => [b.id, b]));
      setRows((wl || []).map((w: any) => ({ ...w, profile: pm.get(w.user_id), book: bm.get(w.book_id) })));
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return r.book?.title?.toLowerCase().includes(s) || `${r.profile?.first_name || ""} ${r.profile?.last_name || ""}`.toLowerCase().includes(s);
  });

  const byBook: Record<string, any[]> = {};
  filtered.forEach(r => { const id = r.book?.id || r.book_id; if (!byBook[id]) byBook[id] = []; byBook[id].push(r); });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Bookmark className="h-6 w-6 text-primary" /> Student Wishlists</h2>
        <p className="text-sm text-muted-foreground">{rows.length} wishlist entries · Grouped by book</p>
      </div>
      <Input placeholder="Search book title or student name..." value={q} onChange={e => setQ(e.target.value)} className="max-w-md" />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No wishlist entries yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(byBook).map(([id, entries]) => {
            const book = entries[0].book;
            return (
              <Card key={id} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span className="truncate">{book?.title || "Unknown book"}</span>
                    <Badge variant="secondary">{entries.length} student{entries.length === 1 ? "" : "s"}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">{book?.author} · {book?.accession_number || "—"} · {book?.available_copies ?? 0} available</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs space-y-1">
                    {entries.map(e => (
                      <li key={e.id} className="flex items-center justify-between">
                        <span>{e.profile?.first_name} {e.profile?.last_name} · Class {e.profile?.student_class || "—"}</span>
                        <span className="text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
