import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InChatConversation } from "./InChatConversation";

interface InChatFeedbackWidgetProps {
  currentUser: any;
  onClose: () => void;
  onFeedbackSubmitted: (feedbackInfo: { rating: number; category: string; subject: string }) => void;
}

const RATINGS = [
  { value: "1", label: "⭐ 1 · Needs attention" },
  { value: "2", label: "⭐⭐ 2 · Fair" },
  { value: "3", label: "⭐⭐⭐ 3 · Satisfied" },
  { value: "4", label: "⭐⭐⭐⭐ 4 · Great" },
  { value: "5", label: "⭐⭐⭐⭐⭐ 5 · Exceptional" },
];
const CATEGORIES = [
  { value: "suggestion", label: "💡 Suggestion" },
  { value: "compliment", label: "💛 Compliment" },
  { value: "bug", label: "🐞 Bug report" },
  { value: "other", label: "💬 General" },
];

export const InChatFeedbackWidget = ({ currentUser, onClose, onFeedbackSubmitted }: InChatFeedbackWidgetProps) => {
  const { toast } = useToast();

  const submitFeedback = async (answers: Record<string, string>) => {
    const rating = Number(answers.rating);
    const fullName = currentUser
      ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
      : "Student";
    const shared = {
      user_id: currentUser?.id || null,
      full_name: fullName || "Anonymous",
      email: currentUser?.email || null,
      category: answers.category,
      rating,
      subject: answers.subject.trim().slice(0, 150),
    };

    const { error: firstError } = await supabase.from("user_feedback").insert({
      ...shared,
      description: answers.comments.trim().slice(0, 2000),
    } as any);
    if (firstError) {
      const { error: fallbackError } = await supabase.from("user_feedback").insert({
        ...shared,
        feedback_text: answers.comments.trim().slice(0, 2000),
      } as any);
      if (fallbackError) throw fallbackError;
    }

    toast({ title: "Feedback Received", description: "Thank you for helping us improve KV Sulur DLMS." });
    onFeedbackSubmitted({ rating, category: answers.category, subject: answers.subject.trim() });
  };

  return (
    <InChatConversation
      title="Share Feedback"
      subtitle="A few quick questions, one at a time"
      onClose={onClose}
      onSubmit={submitFeedback}
      submitLabel="Send feedback"
      steps={[
        { key: "rating", question: "How would you rate your library experience?", type: "choice", options: RATINGS },
        { key: "category", question: "What kind of feedback is this?", type: "choice", options: CATEGORIES },
        { key: "subject", question: "What’s the topic in a few words?", type: "text", maxLength: 150, placeholder: "Short topic" },
        { key: "comments", question: "What would you like us to know?", type: "textarea", maxLength: 500, placeholder: "Write your feedback…" },
      ]}
      summary={(answers) => [
        `Rating: ${RATINGS.find((item) => item.value === answers.rating)?.label || answers.rating}`,
        `Type: ${CATEGORIES.find((item) => item.value === answers.category)?.label || answers.category}`,
        `Topic: ${answers.subject}`,
        `Message: ${answers.comments}`,
      ]}
    />
  );
};
