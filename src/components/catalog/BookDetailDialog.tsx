import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import BookShelfLocator from "@/components/student/BookShelfLocator";

export default function BookDetailDialog({ book, userId, open, onOpenChange }: {
  book: any; userId: string | null; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState("");
  const [myReviewId, setMyReviewId] = useState<string | null>(null);

  const load = async () => {
    if (!book?.id) return;
    const { data } = await supabase.from("book_reviews")
      .select("*, profiles:user_id(first_name,last_name)")
      .eq("book_id", book.id).eq("is_hidden", false).order("created_at", { ascending: false });
    setReviews(data || []);
    if (userId) {
      const mine = (data || []).find((r: any) => r.user_id === userId);
      if (mine) { setMyRating(mine.rating); setMyText(mine.review_text || ""); setMyReviewId(mine.id); }
      else { setMyRating(0); setMyText(""); setMyReviewId(null); }
    }
  };
  useEffect(() => { if (open) load(); }, [open, book?.id]);

  const submit = async () => {
    if (!userId) { toast({ title: "Please sign in", variant: "destructive" }); return; }
    if (myRating < 1) { toast({ title: "Pick a rating", variant: "destructive" }); return; }
    const payload = { book_id: book.id, user_id: userId, rating: myRating, review_text: myText.trim() || null };
    const { error } = myReviewId
      ? await supabase.from("book_reviews").update(payload).eq("id", myReviewId)
      : await supabase.from("book_reviews").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Review saved" }); load();
  };

  const [showMap, setShowMap] = useState(false);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  if (!book) return null;
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{book.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">by {book.author}</p>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          {book.category && <Badge variant="outline">{book.category}</Badge>}
          {book.subject && <Badge variant="outline">{book.subject}</Badge>}
          {book.class_level && <Badge variant="outline">Class {book.class_level}</Badge>}
          {book.cupboard_number && <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Cupboard {book.cupboard_number}</Badge>}
          {book.shelf_number && <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Shelf {book.shelf_number}</Badge>}
          {book.language && <Badge variant="outline">{book.language}</Badge>}
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold" onClick={() => setShowMap(true)}>
             <MapPin className="h-4 w-4 mr-2" /> Locate on Library Map
           </Button>
        </div>

        {book.description && <p className="text-sm text-muted-foreground">{book.description}</p>}

        <div className="flex items-center gap-2 pt-2 border-t">
          <div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`h-4 w-4 ${Number(avg) >= n ? "fill-warning text-warning" : "text-muted-foreground"}`} />)}</div>
          <span className="text-sm font-medium">{avg}</span>
          <span className="text-xs text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
        </div>

        {userId && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">{myReviewId ? "Update your review" : "Write a review"}</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setMyRating(n)}>
                  <Star className={`h-6 w-6 ${myRating >= n ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Share your thoughts…" value={myText} onChange={e => setMyText(e.target.value)} rows={3} maxLength={500} />
            <Button size="sm" onClick={submit}>{myReviewId ? "Update" : "Post"} review</Button>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">Reviews</p>
          {reviews.length === 0 && <p className="text-xs text-muted-foreground">No reviews yet — be the first!</p>}
          {reviews.map(r => (
            <div key={r.id} className="p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{r.profiles?.first_name} {r.profiles?.last_name?.[0]}.</span>
                <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}</div>
              </div>
              {r.review_text && <p className="text-sm">{r.review_text}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    
    <BookShelfLocator 
      isOpen={showMap} 
      onClose={() => setShowMap(false)} 
      bookTitle={book.title} 
      shelfNumber={book.shelf_number}
      cupboardNumber={book.cupboard_number}
      category={book.category}
    />
    </>
  );
}
