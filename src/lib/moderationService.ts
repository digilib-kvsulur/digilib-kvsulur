import { supabase } from "@/integrations/supabase/client";
import { sendModerationWarningEmail } from "./autoEmail";

export const MODERATION_POLICY = {
  STRIKE_1: "Formal warning 1: After three ordinary anti-spam reminders, community posting is paused for 24 hours.",
  STRIKE_2: "Formal warning 2: Community posting is paused for 48 hours. Further repeated violations may lead to a longer community restriction and administrator review.",
  STRIKE_3: "Formal warning 3: Community posting is paused for 7 days and referred to an administrator for review. Your DLMS account remains active.",
};

/** Increment a server-persisted ordinary spam reminder. Three reminders trigger the first formal warning. */
export async function recordCommunitySpamReminder(): Promise<{ count: number; formalWarningDue: boolean; blocked: boolean }> {
  const { data, error } = await supabase.rpc("record_community_spam_reminder");
  if (error) throw error;
  const result = data as { count?: number; formal_warning_due?: boolean; blocked?: boolean } | null;
  return {
    count: Number(result?.count) || 0,
    formalWarningDue: Boolean(result?.formal_warning_due),
    blocked: Boolean(result?.blocked),
  };
}

/** Detect near-copying only against already-loaded community posts; this does not issue an extra query. */
export function findLikelyCommunityCopy(
  content: string,
  candidates: Array<{ user_id?: string; content?: string; title?: string }>,
  currentUserId: string,
): boolean {
  const words = normalizeSpamContent(content).split(" ").filter(Boolean);
  if (words.length < 24) return false;
  const shingles = (tokens: string[]) => {
    const result = new Set<string>();
    for (let i = 0; i <= tokens.length - 5; i += 1) result.add(tokens.slice(i, i + 5).join(" "));
    return result;
  };
  const sourceShingles = shingles(words);
  if (!sourceShingles.size) return false;

  return candidates.some(candidate => {
    if (!candidate.user_id || candidate.user_id === currentUserId) return false;
    const sourceWords = normalizeSpamContent(`${candidate.title || ""} ${candidate.content || ""}`).split(" ").filter(Boolean);
    if (sourceWords.length < 24) return false;
    const candidateShingles = shingles(sourceWords);
    let shared = 0;
    sourceShingles.forEach(shingle => { if (candidateShingles.has(shingle)) shared += 1; });
    const union = sourceShingles.size + candidateShingles.size - shared;
    return union > 0 && shared / union >= 0.78;
  });
}

/**
 * Check whether a user or role is exempt from moderation policies.
 * Admins, librarians, and teachers are completely exempt.
 */
export function isUserExemptFromModeration(roleOrUser?: string | { role?: string | null } | null): boolean {
  if (!roleOrUser) return false;
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser.role;
  return role === "admin" || role === "librarian" || role === "teacher";
}

export interface ModerationResult {
  success: boolean;
  exempt?: boolean;
  warningLevel: number;
  blockedUntil: string | null;
  deactivated: boolean;
  title: string;
  message: string;
}

/**
 * Applies the official 3-tier moderation strike/warning to a user:
 * 1st formal warning: 24h community block
 * 2nd formal warning: 48h community block
 * 3rd Warning: 7-day community posting pause and administrator review; the DLMS account stays active.
 *
 * Automatically creates an in-app notification and dispatches an email notice.
 * Admins are completely exempt.
 */
export async function applyModerationWarning(params: {
  userId: string;
  targetLevel?: 1 | 2 | 3;
  reason?: string;
  adminId?: string;
  isAutoModeration?: boolean;
}): Promise<ModerationResult> {
  const { userId, targetLevel, reason, adminId } = params;

  // 1. Fetch user's current profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, community_warn_count, community_blocked_until, is_approved, first_name, last_name, email")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    throw new Error(profileErr?.message || "User profile not found");
  }

  // 2. Check admin / staff exemption: NO moderation policy for admins
  if (isUserExemptFromModeration(profile.role)) {
    return {
      success: false,
      exempt: true,
      warningLevel: profile.community_warn_count || 0,
      blockedUntil: null,
      deactivated: false,
      title: "Exempt from Moderation",
      message: "Administrators and teachers are exempt from moderation policies.",
    };
  }

  // 3. Determine next strike / warning level (1, 2, or 3)
  const currentCount = profile.community_warn_count || 0;
  const nextLevel: 1 | 2 | 3 = targetLevel ?? (Math.min(3, currentCount + 1) as 1 | 2 | 3);

  let blockedUntil: string | null = null;
  const isApproved = profile.is_approved !== false;
  let warningTitle = "";
  let warningMessage = "";

  if (nextLevel === 1) {
    blockedUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    warningTitle = "1st Warning: Content Moderation Notice";
    warningMessage = MODERATION_POLICY.STRIKE_1 + (reason ? `\nReason: ${reason}` : "");
  } else if (nextLevel === 2) {
    blockedUntil = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    warningTitle = "2nd Warning: Content Moderation Notice";
    warningMessage = MODERATION_POLICY.STRIKE_2 + (reason ? `\nReason: ${reason}` : "");
  } else {
    // Keep DLMS login available; only pause community posting while the case is reviewed.
    blockedUntil = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    warningTitle = "3rd Warning: Community Posting Paused for Review";
    warningMessage = MODERATION_POLICY.STRIKE_3 + (reason ? `\nReason: ${reason}` : "");
  }

  // 4. Update the user profile
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      community_warn_count: nextLevel,
      community_blocked_until: blockedUntil,
      community_soft_warn_count: 0,
      is_approved: isApproved,
    })
    .eq("id", userId);

  if (updateErr) {
    throw updateErr;
  }

  // 5. Send in-app notification
  try {
    await supabase.from("notifications").insert({
      target_user_id: userId,
      sent_by: adminId || null,
      title: warningTitle,
      message: warningMessage,
      type: "warning",
      action_link: "/community",
    });
  } catch (notifyErr) {
    console.warn("Failed to insert moderation notification:", notifyErr);
  }

  // 6. Send automated email notification to the student
  try {
    await sendModerationWarningEmail(userId, {
      warningTitle,
      warningMessage,
      warningLevel: nextLevel,
      actionType: nextLevel === 1 ? "suspended_24h" : nextLevel === 2 ? "suspended_48h" : "warning",
    });
  } catch (emailErr) {
    console.warn("Failed to dispatch moderation email:", emailErr);
  }

  return {
    success: true,
    warningLevel: nextLevel,
    blockedUntil,
    deactivated: !isApproved,
    title: warningTitle,
    message: warningMessage,
  };
}

/**
 * Resets user warnings and unblocks their DLMS/community access.
 */
export async function resetUserModeration(userId: string, adminId?: string): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({
      community_warn_count: 0,
      community_blocked_until: null,
      community_soft_warn_count: 0,
      is_approved: true,
    })
    .eq("id", userId);

  if (error) throw error;

  try {
    await supabase.from("notifications").insert({
      target_user_id: userId,
      sent_by: adminId || null,
      title: "Community Access Restored ✅",
      message: "Your DLMS Community privileges have been restored and your warning history has been cleared.",
      type: "success",
      action_link: "/community",
    });

    await sendModerationWarningEmail(userId, {
      warningTitle: "Community Access Restored",
      warningMessage: "Your DLMS Community access has been restored and previous warnings have been reset. Welcome back!",
      actionType: "unblocked",
    });
  } catch (e) {
    console.warn("Failed to notify user of reset:", e);
  }

  return true;
}

export interface SpamCheckResult {
  isSpam: boolean;
  reason: string;
  severity: "character-flood" | "repeated-content" | "duplicate-content" | "velocity" | null;
}

export interface RecentSpamContent {
  normalized: string;
  timestamp: number;
}

export function normalizeSpamContent(content: string): string {
  return (content || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/(.)\1{2,}/gu, "$1$1")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect obvious flooding while avoiding punishments for posting quickly alone. */
export function detectSpamPattern(
  content: string,
  history: {
    recentTimestamps: number[];
    recentContents: RecentSpamContent[];
    velocityLimitMax: number;
    velocityWindowMs: number;
  }
): SpamCheckResult {
  const text = (content || "").trim();
  const now = Date.now();
  const normalized = normalizeSpamContent(text);
  if (!normalized) return { isSpam: false, reason: "", severity: null };

  // 1. Character flooding: tolerate small emphasis, catch sustained key repeats.
  if (/(.)\1{9,}/u.test(text.normalize("NFKC"))) {
    return {
      isSpam: true,
      reason: "Excessive repeated characters detected",
      severity: "character-flood",
    };
  }

  // 2. Repeated short messages/words: "hi hi hi" should not pass because it is short.
  const words = normalized.split(" ").filter(Boolean);
  let repeatedRun = 1;
  for (let i = 1; i < words.length; i += 1) {
    repeatedRun = words[i] === words[i - 1] ? repeatedRun + 1 : 1;
    if (repeatedRun >= 3) {
      return {
        isSpam: true,
        reason: "The same word is repeated several times in one message",
        severity: "repeated-content",
      };
    }
  }
  if (words.length >= 5 && new Set(words).size === 1) {
    return { isSpam: true, reason: "Repetitive word flooding detected", severity: "repeated-content" };
  }

  // Catch repeated phrases such as "hi there hi there hi there" without
  // flagging a normal phrase that appears only twice.
  for (const phraseLength of [2, 3]) {
    const phraseCounts = new Map<string, number>();
    for (let i = 0; i <= words.length - phraseLength; i += 1) {
      const phrase = words.slice(i, i + phraseLength).join(" ");
      const count = (phraseCounts.get(phrase) || 0) + 1;
      phraseCounts.set(phrase, count);
      if (count >= 3) {
        return {
          isSpam: true,
          reason: "The same phrase is repeated several times in one message",
          severity: "repeated-content",
        };
      }
    }
  }

  // 3. Repeated submissions. Require three copies (including this one) so
  // ordinary replies like "Thanks" in separate threads are not blocked.
  const duplicateWindow = normalized.length <= 3 ? 20_000 : 60_000;
  const duplicateCount = history.recentContents.filter((entry) =>
    entry.normalized === normalized && now - entry.timestamp >= 0 && now - entry.timestamp <= duplicateWindow
  ).length;
  const duplicateThreshold = 2;
  if (duplicateCount >= duplicateThreshold) {
    return {
      isSpam: true,
      reason: "The same message was submitted repeatedly in a short time",
      severity: "duplicate-content",
    };
  }

  // 4. Rate limits reject a burst but do not by themselves count as misconduct.
  const recentInWindow = history.recentTimestamps.filter((t) => now - t >= 0 && now - t < history.velocityWindowMs);
  if (recentInWindow.length >= history.velocityLimitMax) {
    const secs = Math.round(history.velocityWindowMs / 1000);
    return {
      isSpam: true,
      reason: `Posting velocity exceeded (limit: max ${history.velocityLimitMax} within ${secs} seconds)`,
      severity: "velocity",
    };
  }

  return { isSpam: false, reason: "", severity: null };
}
