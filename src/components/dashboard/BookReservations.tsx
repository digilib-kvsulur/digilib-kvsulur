import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark } from "lucide-react";

interface Props { userId: string }

export default function BookReservations({ userId }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("book_reservations").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    const list = data || [];
    const ids = Array.from(new Set(list.map((r: any) => r.book_id)));
    let books: Record<string, any> = {};
    if (ids.length) {
      const { data: b } = await supabase.from("books").select("id, title, author").in("id", ids);
      (b || []).forEach((x) => { books[x.id] = x; });
    }
    setRows(list.map((r: any) => ({ ...r, book: books[r.book_id] })));
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const cancel = async (id: string) => {
    const { error } = await supabase.from("book_reservations").update({ status: "cancelled" }).eq("id", id).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Reservation cancelled" }); load(); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Bookmark className="h-5 w-5" /> My Reservations</h2>
        <p className="text-sm text-muted-foreground">Books you waitlisted when unavailable.</p>
      </div>
      {rows.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No reservations yet.</CardContent></Card>}
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-sm">{r.book?.title || "Book"}</p>
                <p className="text-xs text-muted-foreground">{r.book?.author}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{r.status}</Badge>
                {r.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
