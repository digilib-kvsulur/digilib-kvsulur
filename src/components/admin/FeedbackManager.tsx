import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, MessageSquare, Star, User, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FeedbackManager() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    void fetchFeedbacks(true);
  }, []);

  const fetchFeedbacks = async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setErrorMessage("");
    try {
      const offset = reset ? 0 : feedbacks.length;
      const { data, error } = await supabase
        .from("user_feedback")
        .select("id,full_name,email,category,rating,subject,feedback_text,message,description,created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + 24);

      if (error) throw error;
      const page = data || [];
      setFeedbacks((current) => reset ? page : [...current, ...page]);
      setHasMore(page.length === 25);
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not load feedback. Please try again.");
      toast({ title: "Failed to fetch feedback", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      const { error } = await supabase.from("user_feedback").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Feedback deleted" });
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      toast({ title: "Failed to delete feedback", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">User Feedback</h2>
          <p className="text-sm text-muted-foreground">Review suggestions, bug reports, and compliments from students and staff.</p>
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void fetchFeedbacks(true)}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh
        </Button>
      </div>

      {errorMessage && (
        <Card className="border-destructive/40"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-destructive">Feedback could not be loaded: {errorMessage}</p>
          <Button size="sm" variant="outline" onClick={() => void fetchFeedbacks(true)}>Retry</Button>
        </CardContent></Card>
      )}

      {loading && feedbacks.length === 0 ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : feedbacks.length === 0 && !errorMessage ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">No feedback submissions found yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((f) => (
            <Card key={f.id} className="border-border/50">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={f.category === "bug" ? "destructive" : f.category === "compliment" ? "outline" : "secondary"}>
                      {f.category.toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${star <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold">{f.subject}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-2">
                    <User className="w-3 h-3" /> {f.full_name} {f.email && `(${f.email})`} · {new Date(f.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => deleteFeedback(f.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{f.feedback_text || f.message || f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {hasMore && <div className="flex justify-center"><Button variant="outline" disabled={loadingMore} onClick={() => void fetchFeedbacks(false)}>
        {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Load more feedback
      </Button></div>}
    </div>
  );
}
