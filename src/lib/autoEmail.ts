import { supabase } from "@/integrations/supabase/client";

/**
 * Automated Email Dispatcher
 * Sends automatic notifications for library actions (book issue, book return, badge award, level up).
 */

interface SendAutoEmailOptions {
  recipientId: string;
  preset: "book_issued" | "book_returned" | "badge_awarded" | "level_up" | "library_update" | "due_reminder" | string;
  customMessage?: string;
  details?: Record<string, any>;
}

export async function sendAutoEmail(options: SendAutoEmailOptions): Promise<boolean> {
  try {
    const { recipientId, preset, customMessage } = options;
    if (!recipientId) return false;

    // Call edge function asynchronously (fire-and-forget for smooth UI performance)
    const { error } = await supabase.functions.invoke("send-email-campaign", {
      body: {
        recipientIds: [recipientId],
        preset,
        customMessage: customMessage || "",
        details: options.details || {},
      },
    });

    if (error) {
      console.warn("Auto email dispatch warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Auto email dispatch failed:", err);
    return false;
  }
}

/** Trigger automatic email when a book is issued to a student */
export async function sendBookIssueEmail(studentId: string, bookTitle: string, dueDate?: string) {
  const note = `Book: "${bookTitle}"${dueDate ? ` · Due Date: ${dueDate}` : ""}`;
  return sendAutoEmail({
    recipientId: studentId,
    preset: "book_issued",
    customMessage: note,
    details: { bookTitle, dueDate },
  });
}

/** Trigger automatic email when a book is returned */
export async function sendBookReturnEmail(studentId: string, bookTitle: string) {
  const note = `Book: "${bookTitle}"`;
  return sendAutoEmail({
    recipientId: studentId,
    preset: "book_returned",
    customMessage: note,
    details: { bookTitle },
  });
}

/** Trigger automatic email when a badge is awarded to a student */
export async function sendBadgeAwardedEmail(studentId: string, badgeName: string, badgeDescription?: string) {
  const note = `Badge: 🏆 ${badgeName}${badgeDescription ? ` — ${badgeDescription}` : ""}`;
  return sendAutoEmail({
    recipientId: studentId,
    preset: "badge_awarded",
    customMessage: note,
    details: { badgeName, badgeDescription },
  });
}

/** Trigger automatic email when a student levels up or earns milestone points */
export async function sendLevelUpEmail(studentId: string, levelName: string, newPoints?: number) {
  const note = `Level: 🌟 ${levelName}${newPoints ? ` (${newPoints} total points)` : ""}`;
  return sendAutoEmail({
    recipientId: studentId,
    preset: "level_up",
    customMessage: note,
    details: { levelName, newPoints },
  });
}

/** Trigger automatic email when a user completes their first login setup */
export async function sendFirstLoginEmail(studentId: string, name?: string) {
  return sendAutoEmail({
    recipientId: studentId,
    preset: "first_login",
    customMessage: name ? `Welcome aboard, ${name}!` : "First login setup complete.",
  });
}

/** Trigger automatic email when a user successfully verifies their email address */
export async function sendEmailVerifiedEmail(studentId: string, emailAddress: string) {
  return sendAutoEmail({
    recipientId: studentId,
    preset: "email_verified",
    customMessage: `Confirmed email: ${emailAddress}`,
    details: { emailAddress },
  });
}
