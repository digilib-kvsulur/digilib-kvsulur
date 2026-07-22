import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Eye, EyeOff, Trash2 } from "lucide-react";

export default function ReviewsModeration() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  const load = async () => {
    let q = supabase.from("book_reviews")
      .select("*, books(title)")
      .order("created_at", { ascending: false }).limit(200);
    if (!showHidden) q = q.eq("is_hidden", false);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to load reviews.", variant: "destructive" });
      return;
    }
    const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
    let profileMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, first_name, last_name").in("id", userIds);
      (profs || []).forEach((p: any) => { profileMap[p.id] = p; });
    }
    setRows((data || []).map((r: any) => ({ ...r, profiles: profileMap[r.user_id] })));
  };
  useEffect(() => { load(); }, [showHidden]);

  const toggleHide = async (r: any) => {
    await supabase.from("book_reviews").update({ is_hidden: !r.is_hidden }).eq("id", r.id);
    toast({ title: r.is_hidden ? "Unhidden" : "Hidden" });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("book_reviews").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reviews Moderation</h2>
          <p className="text-sm text-muted-foreground">Auto-published. Hide anything inappropriate.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHidden(v => !v)}>
          {showHidden ? "Only visible" : "Include hidden"}
        </Button>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No reviews.</p>}
      <div className="space-y-3">
        {rows.map(r => (
          <Card key={r.id} className={r.is_hidden ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{r.books?.title || "Book"}</p>
                    <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}</div>
                    {r.is_hidden && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">by {r.profiles?.first_name} {r.profiles?.last_name}</p>
                  {r.review_text && <p className="text-sm mt-2">{r.review_text}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleHide(r)}>
                    {r.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
