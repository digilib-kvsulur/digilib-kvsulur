import { supabase } from "@/integrations/supabase/client";
import { sendAutoEmail } from "@/lib/autoEmail";

export interface EventWinnerRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  studentName: string;
  admissionNumber?: string;
  studentClass?: string;
  position: "1st" | "2nd" | "3rd" | "merit" | "participation" | "special";
  positionTitle: string; // e.g. "🥇 First Position"
  positionTitleHindi?: string; // e.g. "प्रथम स्थान"
  collectionDate?: string; // YYYY-MM-DD
  collectionVenue?: string;
  librarianNote?: string;
  certificateId?: string | null;
  isPublished: boolean;
  createdAt?: string;
  publishedAt?: string;
  acknowledgedUserIds?: string[];
}

export interface EventWinnerInput {
  id?: string;
  userId: string;
  studentName: string;
  admissionNumber?: string;
  studentClass?: string;
  position: "1st" | "2nd" | "3rd" | "merit" | "participation" | "special";
  positionTitle: string;
  positionTitleHindi?: string;
  collectionDate?: string;
  collectionVenue?: string;
  librarianNote?: string;
  certificateId?: string | null;
}

export interface CertCustomizationOptions {
  generateCertificates: boolean;
  templateUrl?: string;
  duringText?: string;
  description?: string;
  commonText?: string;
  unlockAt?: string; // ISO date string
}

/**
 * Fetch all winners for a given event ID.
 * Supports fallback to system_settings if event_winners table is not created yet.
 */
export async function getEventWinners(eventId: string, eventTitle?: string): Promise<EventWinnerRecord[]> {
  try {
    const { data, error } = await supabase
      .from("event_winners" as any)
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      // Fetch user details for profile info
      const userIds = Array.from(new Set(data.map((w: any) => w.user_id)));
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, admission_number, student_class")
          .in("id", userIds);

        (profs || []).forEach((p: any) => {
          profileMap[p.id] = p;
        });
      }

      return data.map((w: any) => {
        const prof = profileMap[w.user_id];
        const studentName = prof
          ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim()
          : "Student";
        return {
          id: w.id,
          eventId: w.event_id,
          eventTitle: eventTitle || "Library Event",
          userId: w.user_id,
          studentName,
          admissionNumber: prof?.admission_number || "—",
          studentClass: prof?.student_class || "—",
          position: w.position,
          positionTitle: w.position_title,
          positionTitleHindi: w.position_title_hindi,
          collectionDate: w.collection_date,
          collectionVenue: w.collection_venue || "Central Library Counter",
          librarianNote: w.librarian_note || "",
          certificateId: w.certificate_id,
          isPublished: w.is_published ?? false,
          createdAt: w.created_at,
          publishedAt: w.published_at,
          acknowledgedUserIds: w.acknowledged_user_ids || [],
        };
      });
    }

    // Fallback: system_settings
    const { data: sysData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", `event_winners_${eventId}`)
      .maybeSingle();

    if (sysData?.value) {
      const parsed = typeof sysData.value === "string" ? JSON.parse(sysData.value) : sysData.value;
      return Array.isArray(parsed) ? parsed : [];
    }

    return [];
  } catch (err) {
    console.warn("Could not query event_winners table, falling back:", err);
    return [];
  }
}

/**
 * Save draft event winners for an event
 */
export async function saveEventWinners(
  eventId: string,
  eventTitle: string,
  inputs: EventWinnerInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = inputs.map((inp) => ({
      id: inp.id || crypto.randomUUID(),
      event_id: eventId,
      user_id: inp.userId,
      position: inp.position,
      position_title: inp.positionTitle,
      position_title_hindi: inp.positionTitleHindi || null,
      collection_date: inp.collectionDate || null,
      collection_venue: inp.collectionVenue || "Central Library Counter",
      librarian_note: inp.librarianNote || null,
      certificate_id: inp.certificateId || null,
      is_published: false,
    }));

    // Try inserting into event_winners table first
    const { error } = await supabase.from("event_winners" as any).upsert(rows, { onConflict: "id" });

    if (error) {
      // Fallback: save to system_settings
      const systemWinners: EventWinnerRecord[] = inputs.map((inp, idx) => ({
        id: inp.id || `ew-${eventId}-${idx}`,
        eventId,
        eventTitle,
        userId: inp.userId,
        studentName: inp.studentName,
        admissionNumber: inp.admissionNumber,
        studentClass: inp.studentClass,
        position: inp.position,
        positionTitle: inp.positionTitle,
        positionTitleHindi: inp.positionTitleHindi,
        collectionDate: inp.collectionDate,
        collectionVenue: inp.collectionVenue,
        librarianNote: inp.librarianNote,
        certificateId: inp.certificateId,
        isPublished: false,
        acknowledgedUserIds: [],
      }));

      await supabase.from("system_settings").upsert({
        key: `event_winners_${eventId}`,
        value: systemWinners as any,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error saving event winners:", err);
    return { success: false, error: err?.message || "Failed to save winners." };
  }
}

/**
 * Release & publish event winners:
 * 1. Mark records as published
 * 2. Optionally generate e-certificates
 * 3. Send notifications to winners
 * 4. Send emails to winners
 */
export async function releaseEventWinners(
  eventId: string,
  eventTitle: string,
  inputs: EventWinnerInput[],
  certOptions: CertCustomizationOptions
): Promise<{ success: boolean; releasedCount: number; certsIssued: number; error?: string }> {
  try {
    const { data: authUser } = await supabase.auth.getUser();
    const adminId = authUser?.user?.id;
    const nowIso = new Date().toISOString();

    let certsIssuedCount = 0;
    const updatedInputs: EventWinnerInput[] = [...inputs];

    // 1. Generate certificates if requested
    if (certOptions.generateCertificates) {
      for (let i = 0; i < updatedInputs.length; i++) {
        const inp = updatedInputs[i];

        // Fetch student profile for Hindi name if missing
        let nameHindi: string | null = null;
        const { data: prof } = await supabase
          .from("profiles")
          .select("hindi_name")
          .eq("id", inp.userId)
          .maybeSingle();
        nameHindi = prof?.hindi_name || null;

        const certNo = `KVS-EVT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data: createdCert, error: certErr } = await supabase
          .from("issued_certificates")
          .insert({
            user_id: inp.userId,
            event_id: eventId,
            title: inp.positionTitle,
            title_hindi: inp.positionTitleHindi || null,
            name_hindi: nameHindi,
            event_hindi: eventTitle,
            during_text: certOptions.duringText || `Event: ${eventTitle}`,
            description: certOptions.description || `Winner of ${inp.positionTitle} in ${eventTitle}`,
            certificate_no: certNo,
            issued_at: new Date().toISOString().slice(0, 10),
            unlock_at: certOptions.unlockAt || null,
            template_url: certOptions.templateUrl || null,
            common_text: certOptions.commonText || null,
          })
          .select("id")
          .single();

        if (!certErr && createdCert) {
          updatedInputs[i].certificateId = createdCert.id;
          certsIssuedCount++;
        }
      }
    }

    // 2. Publish winner records
    const finalRows = updatedInputs.map((inp) => ({
      id: inp.id || crypto.randomUUID(),
      event_id: eventId,
      user_id: inp.userId,
      position: inp.position,
      position_title: inp.positionTitle,
      position_title_hindi: inp.positionTitleHindi || null,
      collection_date: inp.collectionDate || null,
      collection_venue: inp.collectionVenue || "Central Library Counter",
      librarian_note: inp.librarianNote || null,
      certificate_id: inp.certificateId || null,
      is_published: true,
      published_at: nowIso,
    }));

    const { error: dbErr } = await supabase
      .from("event_winners" as any)
      .upsert(finalRows, { onConflict: "id" });

    // Fallback: store in system_settings
    const systemWinners: EventWinnerRecord[] = updatedInputs.map((inp, idx) => ({
      id: inp.id || `ew-${eventId}-${idx}`,
      eventId,
      eventTitle,
      userId: inp.userId,
      studentName: inp.studentName,
      admissionNumber: inp.admissionNumber,
      studentClass: inp.studentClass,
      position: inp.position,
      positionTitle: inp.positionTitle,
      positionTitleHindi: inp.positionTitleHindi,
      collectionDate: inp.collectionDate,
      collectionVenue: inp.collectionVenue || "Central Library Counter",
      librarianNote: inp.librarianNote || "",
      certificateId: inp.certificateId,
      isPublished: true,
      publishedAt: nowIso,
      acknowledgedUserIds: [],
    }));

    await supabase.from("system_settings").upsert({
      key: `event_winners_${eventId}`,
      value: systemWinners as any,
    });

    // 3. Insert Notifications for every winner
    const notifications = updatedInputs.map((w) => {
      const formattedDate = w.collectionDate
        ? new Date(w.collectionDate).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "the specified date";

      return {
        target_user_id: w.userId,
        sent_by: adminId,
        title: `🏆 Winner Announced: ${w.positionTitle}!`,
        message: `Heartiest Congratulations! You have been declared a winner (${w.positionTitle}) for event "${eventTitle}". Physical certificate & trophy collection: ${formattedDate} at ${w.collectionVenue || "Central Library Counter"}. ${w.librarianNote || ""}`,
        type: "award",
        action_link: "/student-dashboard?tab=events",
      };
    });

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    // 4. Send Automated Emails to Winners (Fire and forget or async)
    for (const w of updatedInputs) {
      const formattedDate = w.collectionDate
        ? new Date(w.collectionDate).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "the specified date";

      const emailNote = `Event: "${eventTitle}"\nAward: ${w.positionTitle}\nPhysical Collection Date: ${formattedDate}\nVenue: ${w.collectionVenue || "Central Library Counter"}\n${w.librarianNote ? `Note: ${w.librarianNote}` : ""}`;

      sendAutoEmail({
        recipientId: w.userId,
        preset: "certificate_notice",
        customMessage: emailNote,
        details: {
          eventTitle,
          positionTitle: w.positionTitle,
          collectionDate: w.collectionDate,
          collectionVenue: w.collectionVenue,
          hasCertificate: !!w.certificateId,
        },
      });
    }

    return {
      success: true,
      releasedCount: updatedInputs.length,
      certsIssued: certsIssuedCount,
    };
  } catch (err: any) {
    console.error("Error releasing event winners:", err);
    return { success: false, releasedCount: 0, certsIssued: 0, error: err?.message || "Failed to release winners." };
  }
}

/**
 * Check if student has an unacknowledged published event winner record
 */
export async function getStudentEventWinnersInfo(userId: string): Promise<{
  hasUnacknowledged: boolean;
  unacknowledgedWinner: EventWinnerRecord | null;
}> {
  try {
    // Check system_settings for all active event winners first or event_winners table
    const { data: tableData } = await supabase
      .from("event_winners" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("is_published", true);

    let candidates: any[] = tableData || [];

    if (!candidates || candidates.length === 0) {
      // Search system_settings keys matching event_winners_
      const { data: sysSettings } = await supabase
        .from("system_settings")
        .select("key, value")
        .like("key", "event_winners_%");

      if (sysSettings) {
        sysSettings.forEach((item) => {
          let list: any[] = typeof item.value === "string" ? JSON.parse(item.value) : item.value;
          if (Array.isArray(list)) {
            list.forEach((w) => {
              if (w.userId === userId && w.isPublished) {
                candidates.push(w);
              }
            });
          }
        });
      }
    }

    for (const cand of candidates) {
      const winnerId = cand.id;
      const localKey = `event_winner_acknowledged_${winnerId}_${userId}`;
      const localAck = localStorage.getItem(localKey) === "true";
      const ackUserIds: string[] = cand.acknowledged_user_ids || cand.acknowledgedUserIds || [];
      const serverAck = ackUserIds.includes(userId);

      if (!localAck && !serverAck) {
        // Fetch event title if missing
        let eventTitle = cand.eventTitle || "Library Event";
        if (!cand.eventTitle && cand.event_id) {
          const { data: ev } = await supabase
            .from("library_events")
            .select("title")
            .eq("id", cand.event_id)
            .maybeSingle();
          if (ev?.title) eventTitle = ev.title;
        }

        const winnerRecord: EventWinnerRecord = {
          id: cand.id,
          eventId: cand.event_id || cand.eventId,
          eventTitle,
          userId: cand.user_id || cand.userId,
          studentName: cand.studentName || "Student",
          admissionNumber: cand.admissionNumber || "—",
          studentClass: cand.studentClass || "—",
          position: cand.position,
          positionTitle: cand.position_title || cand.positionTitle,
          positionTitleHindi: cand.position_title_hindi || cand.positionTitleHindi,
          collectionDate: cand.collection_date || cand.collectionDate,
          collectionVenue: cand.collection_venue || cand.collectionVenue || "Central Library Counter",
          librarianNote: cand.librarian_note || cand.librarianNote || "",
          certificateId: cand.certificate_id || cand.certificateId,
          isPublished: true,
        };

        return { hasUnacknowledged: true, unacknowledgedWinner: winnerRecord };
      }
    }

    return { hasUnacknowledged: false, unacknowledgedWinner: null };
  } catch (err) {
    console.error("Error checking student event winner info:", err);
    return { hasUnacknowledged: false, unacknowledgedWinner: null };
  }
}

/**
 * Acknowledge an event winning popup receipt
 */
export async function acknowledgeStudentEventWinner(userId: string, winnerId: string, eventId?: string): Promise<void> {
  try {
    const localKey = `event_winner_acknowledged_${winnerId}_${userId}`;
    localStorage.setItem(localKey, "true");

    // Update table
    const { data: existing } = await supabase
      .from("event_winners" as any)
      .select("acknowledged_user_ids")
      .eq("id", winnerId)
      .maybeSingle();

    if (existing) {
      const ackSet = new Set(existing.acknowledged_user_ids || []);
      ackSet.add(userId);
      await supabase
        .from("event_winners" as any)
        .update({ acknowledged_user_ids: Array.from(ackSet) as any })
        .eq("id", winnerId);
    }

    // Also update system_settings fallback if eventId provided
    if (eventId) {
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", `event_winners_${eventId}`)
        .maybeSingle();

      if (sysData?.value) {
        let list: any[] = typeof sysData.value === "string" ? JSON.parse(sysData.value) : sysData.value;
        if (Array.isArray(list)) {
          list = list.map((w) => {
            if (w.id === winnerId) {
              const aSet = new Set(w.acknowledgedUserIds || []);
              aSet.add(userId);
              return { ...w, acknowledgedUserIds: Array.from(aSet) };
            }
            return w;
          });

          await supabase.from("system_settings").upsert({
            key: `event_winners_${eventId}`,
            value: list as any,
          });
        }
      }
    }
  } catch (err) {
    console.error("Error acknowledging event winner:", err);
  }
}
