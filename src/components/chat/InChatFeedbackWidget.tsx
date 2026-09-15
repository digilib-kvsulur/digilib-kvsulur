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

const CATEGORIES = [
  { value: "suggestion", label: "Suggestion", emoji: "💡" },
  { value: "compliment", label: "Compliment", emoji: "⭐" },
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "other", label: "General", emoji: "💬" },
];

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

export const InChatFeedbackWidget = ({
  currentUser,
  onClose,
  onFeedbackSubmitted,
}: InChatFeedbackWidgetProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState("suggestion");
  const [subject, setSubject] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const displayRating = hoverRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !comments.trim()) {
      setErrorMsg("Please fill in both the topic and your feedback.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const fullName = currentUser
        ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
        : "Student";

      const { error } = await supabase.from("user_feedback").insert({
        user_id: currentUser?.id || null,
        full_name: fullName || "Anonymous",
        email: currentUser?.email || null,
        category,
        rating,
        subject: subject.trim().slice(0, 150),
        feedback_text: comments.trim().slice(0, 2000),
      } as any);

      if (error) {
        const { error: err2 } = await supabase.from("user_feedback").insert({
          user_id: currentUser?.id || null,
          full_name: fullName || "Anonymous",
          email: currentUser?.email || null,
          category,
          rating,
          subject: subject.trim().slice(0, 150),
          description: comments.trim().slice(0, 2000),
        } as any);
        if (err2) throw err2;
      }

      toast({ title: "Feedback received! 💌", description: "Thank you for helping us improve." });
      onFeedbackSubmitted({ rating, category, subject: subject.trim() });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 text-xs">
      {/* Coloured header strip */}
      <div className="bg-gradient-to-r from-violet-500/15 via-primary/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-[11px] text-foreground">Share Feedback</p>
            <p className="text-[9px] text-muted-foreground">Help us improve the library</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        {/* Star rating */}
        <div className="rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-50/20 dark:from-amber-500/10 dark:to-transparent border border-amber-200/60 dark:border-amber-500/20 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground">Your rating</span>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {RATING_LABELS[displayRating]}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 justify-center">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = displayRating >= star;
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="transition-transform hover:scale-125 active:scale-95"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      active
                        ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                        : "text-muted-foreground/30 hover:text-amber-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Category pills */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Feedback type</p>
          <div className="grid grid-cols-4 gap-1">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl border transition-all text-center ${
                  category === cat.value
                    ? "border-primary/60 bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <span className="text-sm">{cat.emoji}</span>
                <span className="text-[9px] leading-tight font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Topic / Subject</p>
          <Input
            placeholder="e.g. Add more science fiction books..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-8 text-xs rounded-xl border-border/60 focus-visible:ring-primary/30"
            required
          />
        </div>

        {/* Comments */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-medium text-muted-foreground">Your message</p>
            <span className="text-[9px] text-muted-foreground/60">{comments.length}/500</span>
          </div>
          <Textarea
            placeholder="Tell us what you love or what we can improve..."
            value={comments}
            onChange={(e) => setComments(e.target.value.slice(0, 500))}
            className="text-xs min-h-[52px] p-2 rounded-xl border-border/60 focus-visible:ring-primary/30 resize-none"
            required
          />
        </div>

        {errorMsg && (
          <p className="text-[11px] text-destructive flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-2 py-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" /> {errorMsg}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs flex-none px-3 rounded-xl text-muted-foreground">
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !subject.trim() || !comments.trim()}
            className="h-8 text-xs flex-1 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-xs"
          >
            {submitting ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Sending...</>
            ) : (
              <><Send className="h-3 w-3 mr-1.5" /> Send Feedback</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
