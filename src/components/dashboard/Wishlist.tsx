import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Wishlist({ userId }: { userId: string }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("book_wishlist")
      .select("id, created_at, books(id, title, author, category, available_copies)")
      .eq("user_id", userId).order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { if (userId) load(); }, [userId]);

  const remove = async (id: string) => {
    await supabase.from("book_wishlist").delete().eq("id", id);
    toast({ title: "Removed from wishlist" });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Bookmark className="h-6 w-6" /> My Wishlist</h2>
        <p className="text-sm text-muted-foreground">Books you've saved for later.</p>
      </div>
      {rows.length === 0 && (
        <Card><CardContent className="p-8 text-center">
          <Bookmark className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No saved books yet.</p>
          <Button onClick={() => navigate("/catalog")}>Browse catalog</Button>
        </CardContent></Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.books?.title}</p>
                <p className="text-xs text-muted-foreground">{r.books?.author}</p>
                <div className="mt-2 flex gap-2">
                  {r.books?.category && <Badge variant="outline" className="text-[10px]">{r.books.category}</Badge>}
                  <Badge className={r.books?.available_copies > 0 ? "gradient-primary text-primary-foreground" : ""} variant={r.books?.available_copies > 0 ? "default" : "secondary"}>
                    {r.books?.available_copies > 0 ? "Available now" : "Not available"}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
