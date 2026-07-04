import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BookOpen } from "lucide-react";

export default function Recommendations({ userId, studentClass }: { userId: string; studentClass?: string }) {
  const [books, setBooks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // gather categories user has read
      const { data: rh } = await supabase.from("reading_history").select("book_title").eq("user_id", userId).limit(20);
      const { data: bi } = await supabase.from("book_issues").select("books(category, subject)").eq("user_id", userId).limit(20);
      const categories = new Set<string>();
      (bi || []).forEach((r: any) => { if (r.books?.category) categories.add(r.books.category); if (r.books?.subject) categories.add(r.books.subject); });

      let q = supabase.from("books").select("*").gt("available_copies", 0).limit(6);
      if (categories.size > 0) q = q.in("category", Array.from(categories));
      else if (studentClass) q = q.eq("class_level", studentClass);

      const { data } = await q;
      // fallback: if nothing matched, just show newest available
      if (!data || data.length === 0) {
        const { data: fb } = await supabase.from("books").select("*").gt("available_copies", 0).order("first_added_at", { ascending: false, nullsFirst: false }).limit(6);
        setBooks(fb || []);
      } else setBooks(data);
    })();
  }, [userId, studentClass]);

  if (books.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Recommended for you</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {books.map(b => (
            <div key={b.id} className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="font-medium text-sm truncate">{b.title}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate">{b.author}</p>
              {b.category && <Badge variant="outline" className="mt-1 text-[10px]">{b.category}</Badge>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
