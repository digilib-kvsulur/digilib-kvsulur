import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, MessageSquare, Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FeedbackManager() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err: any) {
      toast({ title: "Failed to fetch feedback", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">User Feedback</h2>
          <p className="text-sm text-muted-foreground">Review suggestions, bug reports, and compliments from students and staff.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeedbacks}>Refresh</Button>
      </div>

      {feedbacks.length === 0 ? (
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
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
