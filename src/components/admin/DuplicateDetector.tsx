import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Merge } from "lucide-react";

export default function DuplicateDetector() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<{ key: string; books: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("books").select("id, title, author, accession_number, available_copies, total_copies").order("title");
    const map = new Map<string, any[]>();
    (data || []).forEach((b) => {
      const key = `${(b.title || "").trim().toLowerCase()}||${(b.author || "").trim().toLowerCase()}`;
      if (!key || key === "||") return;
      map.set(key, [...(map.get(key) || []), b]);
    });
    setGroups(Array.from(map.entries()).filter(([, books]) => books.length > 1).map(([key, books]) => ({ key, books })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const merge = async (primary: any, duplicates: any[]) => {
    if (!confirm(`Keep "${primary.title}" and merge ${duplicates.length} duplicate(s)? Related records will be re-pointed.`)) return;
    setMerging(primary.id);
    try {
      const dupIds = duplicates.map((d) => d.id);
      const tables = ["book_issues", "book_requests", "book_reservations", "book_wishlist", "book_reviews"];
      for (const table of tables) {
        await (supabase as any).from(table).update({ book_id: primary.id }).in("book_id", dupIds);
      }
      const extraCopies = duplicates.reduce((s, d) => s + (d.total_copies || 0), 0);
      await supabase.from("books").update({
        total_copies: (primary.total_copies || 0) + extraCopies,
        available_copies: (primary.available_copies || 0) + duplicates.reduce((s, d) => s + (d.available_copies || 0), 0),
      }).eq("id", primary.id);
      const { error } = await supabase.from("books").delete().in("id", dupIds);
      if (error) throw error;
      toast({ title: "Merged", description: `${dupIds.length} duplicate(s) merged into primary.` });
      load();
    } catch (e: any) {
      toast({ title: "Merge failed", description: e.message, variant: "destructive" });
    } finally {
      setMerging(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Copy className="h-6 w-6" /> Duplicate Detector</h2>
        <p className="text-sm text-muted-foreground">Books with the same title + author. {groups.length} group(s) found.</p>
      </div>
      {groups.length === 0 && <p className="text-sm text-muted-foreground">No title/author duplicates found.</p>}
      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.key}>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium text-sm">{g.books[0].title} <span className="text-muted-foreground">by {g.books[0].author || "—"}</span></p>
              <div className="space-y-1">
                {g.books.map((b, i) => (
                  <div key={b.id} className="flex justify-between text-xs border rounded p-2">
                    <span>#{i + 1} Acc: {b.accession_number || "—"} · copies {b.available_copies}/{b.total_copies}</span>
                    {i === 0 && <Badge variant="secondary">Primary</Badge>}
                  </div>
                ))}
              </div>
              <Button size="sm" disabled={merging === g.books[0].id}
                onClick={() => merge(g.books[0], g.books.slice(1))}>
                <Merge className="h-3.5 w-3.5 mr-1" /> Merge into first
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
