import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, X, Send, Loader2, Star, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InChatFeedbackWidgetProps {
  currentUser: any;
  onClose: () => void;
  onFeedbackSubmitted: (feedbackInfo: { rating: number; category: string; subject: string }) => void;
}

export const InChatFeedbackWidget = ({
  currentUser,
  onClose,
  onFeedbackSubmitted
}: InChatFeedbackWidgetProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState("suggestion");
  const [subject, setSubject] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !comments.trim()) {
      setErrorMsg("Please provide both a topic and your feedback.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      const fullName = currentUser
        ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
        : "Student / Member";

      // Insert into user_feedback
      const { error } = await supabase.from("user_feedback").insert({
        user_id: currentUser?.id || null,
        full_name: fullName || "Anonymous",
        email: currentUser?.email || null,
        category: category,
        rating: rating,
        subject: subject.trim().slice(0, 150),
        feedback_text: comments.trim().slice(0, 2000),
      } as any);

      if (error) {
        // Fallback for schema variants (e.g. description column)
        const { error: err2 } = await supabase.from("user_feedback").insert({
          user_id: currentUser?.id || null,
          full_name: fullName || "Anonymous",
          email: currentUser?.email || null,
          category: category,
          rating: rating,
          subject: subject.trim().slice(0, 150),
          description: comments.trim().slice(0, 2000),
        } as any);
        if (err2) throw err2;
      }

      toast({
        title: "Feedback Received! 💌",
        description: "Thank you for helping us make the library experience better."
      });

      onFeedbackSubmitted({
        rating,
        category,
        subject: subject.trim()
      });
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      setErrorMsg(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 bg-card border border-primary/30 rounded-2xl shadow-lg space-y-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          <span>Library Feedback & Rating</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Rating Stars */}
        <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border border-border/50">
          <span className="text-[11px] font-semibold text-foreground">Your Rating:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating !== null ? hoverRating : rating) >= star;
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-0.5 hover:scale-115 transition-transform"
                >
                  <Star
                    className={`h-5 w-5 ${
                      active
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40 hover:text-amber-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Feedback Type</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-xs h-7.5 px-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden"
          >
            <option value="suggestion">💡 Feature Suggestion / Book Request</option>
            <option value="compliment">⭐ Library Appreciation / Compliment</option>
            <option value="bug">🐛 Bug Report / App Issue</option>
            <option value="other">💬 General Feedback</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Topic / Subject</label>
          <Input
            placeholder="e.g. Add more science fiction books..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-7.5 text-xs rounded-lg"
            required
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Comments & Suggestions</label>
          <Textarea
            placeholder="Tell us what you love or what we can improve..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="text-xs min-h-[50px] p-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden resize-none"
            required
          />
        </div>

        {errorMsg && (
          <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
            <AlertCircle className="h-3 w-3 shrink-0" /> {errorMsg}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs flex-1 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !subject.trim() || !comments.trim()}
            className="h-7 text-xs flex-1 rounded-lg bg-primary text-primary-foreground font-semibold"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Send Feedback
          </Button>
        </div>
      </form>
    </div>
  );
};
