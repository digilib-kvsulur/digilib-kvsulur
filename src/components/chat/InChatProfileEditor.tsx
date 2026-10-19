import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InChatConversation } from "./InChatConversation";

interface InChatProfileEditorProps {
  currentUser: any;
  onClose: () => void;
  onProfileUpdated: (updatedUser: any) => void;
}

export const InChatProfileEditor = ({ currentUser, onClose, onProfileUpdated }: InChatProfileEditorProps) => {
  const { toast } = useToast();

  const saveProfile = async (answers: Record<string, string>) => {
    if (!currentUser?.id) throw new Error("Please sign in to update your profile.");
    const cleanUsername = (answers.username || "").trim().toLowerCase().replace(/\s+/g, "_");
    const updatePayload: Record<string, any> = {
      bio: (answers.bio || "").trim(),
      phone: (answers.phone || "").trim(),
      roll_number: (answers.roll_number || "").trim(),
      student_class: (answers.student_class || "").trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    };
    if (cleanUsername) updatePayload.username = cleanUsername;

    const { error } = await supabase.from("profiles").update(updatePayload).eq("id", currentUser.id);
    if (error) throw error;

    toast({ title: "Profile updated ✨", description: "Your changes have been saved." });
    onProfileUpdated({ ...currentUser, ...updatePayload });
  };

  const initialAnswers = {
    bio: currentUser?.bio || "",
    student_class: currentUser?.student_class || "",
    roll_number: currentUser?.roll_number || "",
    phone: currentUser?.phone || "",
    username: currentUser?.username || "",
  };

  return (
    <InChatConversation
      title="Quick Profile Edit"
      subtitle="I’ll ask about one detail at a time"
      onClose={onClose}
      onSubmit={saveProfile}
      submitLabel="Save profile"
      initialAnswers={initialAnswers}
      steps={[
        { key: "bio", question: "What would you like your bio to say? Skip to keep your current bio.", type: "text", maxLength: 180, placeholder: "Your bio and interests", optional: true },
        { key: "student_class", question: "What class and section should appear on your profile? Skip to keep the current value.", type: "text", maxLength: 20, placeholder: "For example: 11A", optional: true },
        { key: "roll_number", question: "What is your roll number? Skip to keep the current value.", type: "text", maxLength: 20, placeholder: "Roll number", optional: true },
        { key: "phone", question: "What phone number should be on your profile? Skip to keep the current value.", type: "text", maxLength: 15, placeholder: "Phone number", optional: true },
        { key: "username", question: "What username would you like? Skip to keep the current one.", type: "text", maxLength: 30, placeholder: "Username", optional: true },
      ]}
      summary={(answers) => [
        `Bio: ${answers.bio || "(blank)"}`,
        `Class: ${answers.student_class || "(blank)"}`,
        `Roll number: ${answers.roll_number || "(blank)"}`,
        `Phone: ${answers.phone || "(blank)"}`,
        `Username: ${answers.username || "(unchanged)"}`,
      ]}
    />
  );
};
