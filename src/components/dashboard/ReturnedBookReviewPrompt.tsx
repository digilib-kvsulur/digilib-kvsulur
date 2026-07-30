import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ReturnedBookReviewPrompt({ userId }: { userId?: string }) {
  const [issue, setIssue] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: returned } = await supabase.from("book_issues").select("id, book_id, return_date, books(title, author)").eq("user_id", userId).eq("status", "returned").order("return_date", { ascending: false }).limit(5);
      for (const candidate of returned || []) {
        const { data: existing } = await supabase.from("book_reviews").select("id").eq("user_id", userId).eq("book_id", candidate.book_id).maybeSingle();
        if (!existing) { setIssue(candidate); break; }
      }
    })();
  }, [userId]);

  const submit = async () => {
    if (!issue || !userId) return;
    setSaving(true);
    const { error } = await supabase.from("book_reviews").insert({ book_id: issue.book_id, user_id: userId, rating, review_text: review.trim() || null });
    setSaving(false);
    if (error) { toast({ title: "Could not save review", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Thanks for your review!" }); setIssue(null);
  };

  return <Dialog open={!!issue} onOpenChange={open => !open && setIssue(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>How was the book?</DialogTitle><DialogDescription>You've returned <strong>{issue?.books?.title}</strong>. Share a quick review to help other students choose.</DialogDescription></DialogHeader><div className="flex gap-1">{[1, 2, 3, 4, 5].map(value => <Button key={value} type="button" variant="ghost" size="icon" onClick={() => setRating(value)}><Star className={`h-6 w-6 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} /></Button>)}</div><Textarea value={review} onChange={event => setReview(event.target.value)} placeholder="What did you enjoy or learn? (optional)" /><DialogFooter><Button variant="outline" onClick={() => setIssue(null)}>Maybe later</Button><Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Submit review"}</Button></DialogFooter></DialogContent></Dialog>;
}
