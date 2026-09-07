import { supabase } from "@/integrations/supabase/client";

export interface StudentScoreCandidate {
  id: string;
  first_name: string;
  last_name?: string | null;
  student_class: string;
  standard: string;
  section: string;
  admission_number?: string | null;
  points: number;
  booksIssuedCount: number;
  compositeScore: number;
  isEligible: boolean;
  disqualificationReason?: string;
}

export interface RotationalAwardCandidate {
  badgeType: "best_library_user" | "reader_of_the_month";
  badgeName: string;
  scopeType: "standard" | "section";
  scopeValue: string; // e.g. "Class 11" or "11A"
  winner: StudentScoreCandidate | null;
  runnerUpNote?: string;
  status: "awarded" | "no_eligible_candidate";
}

export interface RotationalBadgeSettings {
  mode: "monthly" | "date_range" | "lifetime";
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  minPointsThreshold: number; // default: 50
  pointsWeight: number; // default: 1.0
  booksIssueWeight: number; // default: 25.0
  collectionDate: string; // e.g. "2026-09-15"
  collectionVenue: string; // e.g. "Central Library Counter"
  librarianNote: string; // e.g. "Bring your student ID to collect your physical badge"
}

export interface VerifiedWinnerRecord {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  studentClass: string;
  standard: string;
  section: string;
  badgeType: "best_library_user" | "reader_of_the_month";
  badgeName: string;
  scopeValue: string;
  points: number;
  booksIssuedCount: number;
  compositeScore: number;
}

export interface VerifiedRotationalCycle {
  cycleId: string; // e.g. "2026-09" or "lifetime-2026"
  cycleLabel: string; // e.g. "September 2026" or "Lifetime Cumulative"
  verifiedAt: string;
  verifiedBy?: string;
  settings: RotationalBadgeSettings;
  winners: VerifiedWinnerRecord[];
  acknowledgedUserIds?: string[];
}

export const DEFAULT_ROTATIONAL_SETTINGS: RotationalBadgeSettings = {
  mode: "monthly",
  minPointsThreshold: 50,
  pointsWeight: 1.0,
  booksIssueWeight: 25.0,
  collectionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  collectionVenue: "Central Library Counter during Lunch Break / Zero Period",
  librarianNote: "Heartiest congratulations! Please visit the library on the collection date to receive your official rotational badge & certificate."
};

/**
 * Robust parsing for Standard/Class and Section
 * e.g., "11A" -> { standard: "Class 11", section: "11A" }
 * "10-C" -> { standard: "Class 10", section: "10C" }
 * "Class 9 B" -> { standard: "Class 9", section: "9B" }
 * "6" -> { standard: "Class 6", section: "6" }
 */
export function parseStudentClass(rawClass: string | null | undefined): { standard: string; section: string } {
  if (!rawClass || !rawClass.trim()) {
    return { standard: "Unassigned", section: "Unassigned" };
  }

  const cleaned = rawClass.trim().toUpperCase().replace(/^CLASS\s*/i, "").trim();

  // Extract standard number
  const numMatch = cleaned.match(/\d+/);
  const stdNum = numMatch ? parseInt(numMatch[0], 10) : null;
  const standard = stdNum ? `Class ${stdNum}` : `Class ${cleaned}`;

  // Clean section string (e.g., "11A", "11B", "10C", "6A", "12 SCIENCE")
  const section = cleaned.replace(/[\s\-_]/g, "");

  return { standard, section };
}

/**
 * Intelligent Analysis Engine
 * Evaluates points and book issues, enforces minimum points threshold,
 * supports Monthly, Custom Date Range, and Lifetime modes,
 * and guarantees strictly one badge per user.
 */
export async function computeRotationalBadges(
  settings: RotationalBadgeSettings,
  cycleYear?: number,
  cycleMonth?: number // 1 - 12
): Promise<{
  allCandidates: StudentScoreCandidate[];
  classAwards: RotationalAwardCandidate[];
  sectionAwards: RotationalAwardCandidate[];
  statistics: {
    totalStudentsEvaluated: number;
    eligibleStudentsCount: number;
    classesCount: number;
    sectionsCount: number;
    totalBadgesAwarded: number;
    noAwardCount: number;
  };
}> {
  // 1. Fetch all approved student profiles safely (avoiding missing columns)
  let allStudents: any[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, student_class, admission_number, points, role, is_approved")
      .eq("role", "student")
      .eq("is_approved", true)
      .not("student_class", "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allStudents = [...allStudents, ...data];
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Determine effective date range
  let startStr: string | null = null;
  let endStr: string | null = null;

  if (settings.mode === "monthly" && cycleYear && cycleMonth) {
    const startObj = new Date(cycleYear, cycleMonth - 1, 1);
    const endObj = new Date(cycleYear, cycleMonth, 0); // Last day of month
    startStr = startObj.toISOString().split("T")[0];
    endStr = endObj.toISOString().split("T")[0];
  } else if (settings.mode === "date_range" && settings.startDate && settings.endDate) {
    startStr = settings.startDate;
    endStr = settings.endDate;
  }

  // 2. Fetch book issues based on mode
  const issueCountMap: Record<string, number> = {};
  const periodPointsMap: Record<string, number> = {};

  if (settings.mode === "lifetime" || !startStr || !endStr) {
    // Lifetime mode: query all issues
    const { data: allIssues } = await supabase.from("book_issues").select("user_id");
    (allIssues || []).forEach((bi: any) => {
      if (bi.user_id) issueCountMap[bi.user_id] = (issueCountMap[bi.user_id] || 0) + 1;
    });
  } else {
    // Date-filtered mode
    const [{ data: rangeIssues }, { data: readings }, { data: quizzes }] = await Promise.all([
      supabase
        .from("book_issues")
        .select("user_id, issue_date")
        .gte("issue_date", startStr)
        .lte("issue_date", endStr),
      supabase
        .from("reading_history")
        .select("user_id, points_earned, completed_date")
        .eq("status", "approved")
        .gte("completed_date", startStr)
        .lte("completed_date", endStr),
      supabase
        .from("quiz_results")
        .select("user_id, points_earned, completed_at")
        .gte("completed_at", `${startStr}T00:00:00Z`)
        .lte("completed_at", `${endStr}T23:59:59Z`)
    ]);

    (rangeIssues || []).forEach((bi: any) => {
      if (bi.user_id) issueCountMap[bi.user_id] = (issueCountMap[bi.user_id] || 0) + 1;
    });

    (readings || []).forEach((r: any) => {
      if (r.user_id) periodPointsMap[r.user_id] = (periodPointsMap[r.user_id] || 0) + (Number(r.points_earned) || 0);
    });

    (quizzes || []).forEach((q: any) => {
      if (q.user_id) periodPointsMap[q.user_id] = (periodPointsMap[q.user_id] || 0) + (Number(q.points_earned) || 0);
    });
  }

  const hasPeriodActivities = Object.keys(periodPointsMap).length > 0;

  // 3. Build candidate objects with parsed class & composite score
  const candidates: StudentScoreCandidate[] = allStudents.map((s: any) => {
    const { standard, section } = parseStudentClass(s.student_class);

    // In lifetime mode, use lifetime profile points.
    // In date-filtered mode, if period activities exist for this student, prioritize them;
    // otherwise fallback to profile points so users are recognized fairly.
    let points = Number(s.points) || 0;
    if (settings.mode !== "lifetime" && hasPeriodActivities) {
      const p = periodPointsMap[s.id];
      if (p !== undefined && p > 0) {
        points = p;
      }
    }

    const booksIssuedCount = issueCountMap[s.id] || 0;
    const compositeScore = Math.round(
      points * settings.pointsWeight + booksIssuedCount * settings.booksIssueWeight
    );

    // Minimum points threshold safeguard
    const isEligible = points >= settings.minPointsThreshold;
    const disqualificationReason = !isEligible
      ? `Points (${points} XP) below minimum threshold of ${settings.minPointsThreshold} XP`
      : undefined;

    return {
      id: s.id,
      first_name: s.first_name || "Student",
      last_name: s.last_name || "",
      student_class: (s.student_class || "").trim().toUpperCase(),
      standard,
      section,
      admission_number: s.admission_number || "—",
      points,
      booksIssuedCount,
      compositeScore,
      isEligible,
      disqualificationReason
    };
  });

  // Group by standard and section
  const standardGroups: Record<string, StudentScoreCandidate[]> = {};
  const sectionGroups: Record<string, StudentScoreCandidate[]> = {};

  candidates.forEach((c) => {
    if (!standardGroups[c.standard]) standardGroups[c.standard] = [];
    standardGroups[c.standard].push(c);

    if (!sectionGroups[c.section]) sectionGroups[c.section] = [];
    sectionGroups[c.section].push(c);
  });

  // Natural sorting for standards and sections
  const naturalSort = (a: string, b: string) => {
    const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  };

  const sortedStandards = Object.keys(standardGroups).sort(naturalSort);
  const sortedSections = Object.keys(sectionGroups).sort(naturalSort);

  // Strict constraint: Only one badge per user!
  const awardedStudentIds = new Set<string>();

  // STEP A: Calculate Class Standard Awards ("Best Library User")
  // The Class standard award is the top-tier standard-wide honor!
  const classAwards: RotationalAwardCandidate[] = [];

  sortedStandards.forEach((std) => {
    const list = standardGroups[std] || [];
    const eligibleList = list
      .filter((c) => c.isEligible && !awardedStudentIds.has(c.id))
      .sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
        if (b.booksIssuedCount !== a.booksIssuedCount) return b.booksIssuedCount - a.booksIssuedCount;
        return b.points - a.points;
      });

    if (eligibleList.length > 0) {
      const topStudent = eligibleList[0];
      awardedStudentIds.add(topStudent.id);

      classAwards.push({
        badgeType: "best_library_user",
        badgeName: "Best Library User",
        scopeType: "standard",
        scopeValue: std,
        winner: topStudent,
        status: "awarded"
      });
    } else {
      classAwards.push({
        badgeType: "best_library_user",
        badgeName: "Best Library User",
        scopeType: "standard",
        scopeValue: std,
        winner: null,
        status: "no_eligible_candidate",
        runnerUpNote: `No student in ${std} met the minimum points threshold (${settings.minPointsThreshold} XP).`
      });
    }
  });

  // STEP B: Calculate Section Awards ("Reader of the Month")
  // For every section (e.g. 11A, 11B, 10C):
  // Filter out any student who ALREADY received "Best Library User"!
  // If the top student in 11A won "Best Library User", the runner-up receives "Reader of the Month".
  const sectionAwards: RotationalAwardCandidate[] = [];

  sortedSections.forEach((sec) => {
    const list = sectionGroups[sec] || [];

    // Check if the section's top student was already awarded Best Library User
    const rawSorted = [...list].sort((a, b) => b.compositeScore - a.compositeScore);
    const originalTop = rawSorted[0];
    const topWonClassAward = originalTop && awardedStudentIds.has(originalTop.id);

    // Eligible students who don't have a badge yet and meet threshold
    const eligibleList = list
      .filter((c) => c.isEligible && !awardedStudentIds.has(c.id))
      .sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
        if (b.booksIssuedCount !== a.booksIssuedCount) return b.booksIssuedCount - a.booksIssuedCount;
        return b.points - a.points;
      });

    if (eligibleList.length > 0) {
      const winner = eligibleList[0];
      awardedStudentIds.add(winner.id);

      let runnerUpNote: string | undefined;
      if (topWonClassAward && originalTop.id !== winner.id) {
        runnerUpNote = `Section topper (${originalTop.first_name} ${originalTop.last_name || ""}) awarded Best Library User for ${originalTop.standard}. Award promoted to qualified runner-up!`;
      }

      sectionAwards.push({
        badgeType: "reader_of_the_month",
        badgeName: "Reader of the Month",
        scopeType: "section",
        scopeValue: sec,
        winner,
        runnerUpNote,
        status: "awarded"
      });
    } else {
      let runnerUpNote = `No student in section ${sec} met the minimum points threshold (${settings.minPointsThreshold} XP).`;
      if (topWonClassAward) {
        runnerUpNote = `Section topper was awarded Class Best Library User, and no remaining student in section ${sec} met the minimum points threshold (${settings.minPointsThreshold} XP).`;
      }

      sectionAwards.push({
        badgeType: "reader_of_the_month",
        badgeName: "Reader of the Month",
        scopeType: "section",
        scopeValue: sec,
        winner: null,
        status: "no_eligible_candidate",
        runnerUpNote
      });
    }
  });

  const totalBadgesAwarded =
    classAwards.filter((a) => a.status === "awarded").length +
    sectionAwards.filter((a) => a.status === "awarded").length;

  const noAwardCount =
    classAwards.filter((a) => a.status === "no_eligible_candidate").length +
    sectionAwards.filter((a) => a.status === "no_eligible_candidate").length;

  return {
    allCandidates: candidates,
    classAwards,
    sectionAwards,
    statistics: {
      totalStudentsEvaluated: candidates.length,
      eligibleStudentsCount: candidates.filter((c) => c.isEligible).length,
      classesCount: sortedStandards.length,
      sectionsCount: sortedSections.length,
      totalBadgesAwarded,
      noAwardCount
    }
  };
}

/**
 * Ensure the 2 rotational badges exist in the badges table
 */
export async function ensureRotationalBadgeDefinitions(): Promise<{
  bestUserBadgeId: string;
  readerMonthBadgeId: string;
}> {
  const { data: existingBadges } = await supabase
    .from("badges")
    .select("id, name")
    .in("name", ["Best Library User", "Reader of the Month"]);

  let bestUserBadge = existingBadges?.find((b) => b.name === "Best Library User");
  let readerMonthBadge = existingBadges?.find((b) => b.name === "Reader of the Month");

  if (!bestUserBadge) {
    const { data: created, error } = await supabase
      .from("badges")
      .insert({
        name: "Best Library User",
        description: "Prestigious rotational badge awarded to the #1 top library user across all sections in the class standard.",
        icon_name: "Crown",
        color: "text-amber-500",
        points: 50,
        criteria_type: "manual",
        criteria_value: null,
        is_active: true
      })
      .select("id, name")
      .single();
    if (!error && created) bestUserBadge = created;
  }

  if (!readerMonthBadge) {
    const { data: created, error } = await supabase
      .from("badges")
      .insert({
        name: "Reader of the Month",
        description: "Official rotational badge awarded to the premier reader of the section.",
        icon_name: "Award",
        color: "text-indigo-500",
        points: 30,
        criteria_type: "manual",
        criteria_value: null,
        is_active: true
      })
      .select("id, name")
      .single();
    if (!error && created) readerMonthBadge = created;
  }

  return {
    bestUserBadgeId: bestUserBadge?.id || "best-user-badge",
    readerMonthBadgeId: readerMonthBadge?.id || "reader-month-badge"
  };
}

/**
 * Fetch the currently active verified rotational cycle from system_settings
 */
export async function getActiveRotationalCycle(): Promise<VerifiedRotationalCycle | null> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "rotational_badge_active_cycle")
    .maybeSingle();

  if (!data?.value) return null;
  let cycle: any = data.value;
  if (typeof cycle === "string") {
    try {
      cycle = JSON.parse(cycle);
    } catch {
      return null;
    }
  }
  return cycle as VerifiedRotationalCycle;
}

/**
 * Admin Verification and Badge Issuance
 * Writes verified cycle to system_settings, badge_awards table, and notifications table
 */
export async function verifyAndPublishRotationalCycle(
  cycleId: string,
  cycleLabel: string,
  settings: RotationalBadgeSettings,
  classAwards: RotationalAwardCandidate[],
  sectionAwards: RotationalAwardCandidate[]
): Promise<{ success: boolean; winnersCount: number; error?: string }> {
  try {
    const { data: authUser } = await supabase.auth.getUser();
    const adminId = authUser?.user?.id;

    // 1. Ensure badge definitions exist
    const { bestUserBadgeId, readerMonthBadgeId } = await ensureRotationalBadgeDefinitions();

    // 2. Build verified winners list
    const winners: VerifiedWinnerRecord[] = [];

    classAwards.forEach((ca) => {
      if (ca.status === "awarded" && ca.winner) {
        winners.push({
          studentId: ca.winner.id,
          studentName: `${ca.winner.first_name} ${ca.winner.last_name || ""}`.trim(),
          admissionNumber: ca.winner.admission_number || "—",
          studentClass: ca.winner.student_class,
          standard: ca.winner.standard,
          section: ca.winner.section,
          badgeType: "best_library_user",
          badgeName: "Best Library User",
          scopeValue: ca.scopeValue,
          points: ca.winner.points,
          booksIssuedCount: ca.winner.booksIssuedCount,
          compositeScore: ca.winner.compositeScore
        });
      }
    });

    sectionAwards.forEach((sa) => {
      if (sa.status === "awarded" && sa.winner) {
        winners.push({
          studentId: sa.winner.id,
          studentName: `${sa.winner.first_name} ${sa.winner.last_name || ""}`.trim(),
          admissionNumber: sa.winner.admission_number || "—",
          studentClass: sa.winner.student_class,
          standard: sa.winner.standard,
          section: sa.winner.section,
          badgeType: "reader_of_the_month",
          badgeName: "Reader of the Month",
          scopeValue: sa.scopeValue,
          points: sa.winner.points,
          booksIssuedCount: sa.winner.booksIssuedCount,
          compositeScore: sa.winner.compositeScore
        });
      }
    });

    const verifiedCycle: VerifiedRotationalCycle = {
      cycleId,
      cycleLabel,
      verifiedAt: new Date().toISOString(),
      verifiedBy: adminId,
      settings,
      winners,
      acknowledgedUserIds: []
    };

    // 3. Upsert to system_settings: active cycle
    const { error: cycleError } = await supabase.from("system_settings").upsert(
      { key: "rotational_badge_active_cycle", value: verifiedCycle as any },
      { onConflict: "key" }
    );
    if (cycleError) throw cycleError;

    // 4. Save to history in system_settings
    const { data: histData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "rotational_badge_history")
      .maybeSingle();

    let history: any[] = [];
    if (histData?.value) {
      history = typeof histData.value === "string" ? JSON.parse(histData.value) : histData.value;
    }
    history = [verifiedCycle, ...history.filter((h: any) => h.cycleId !== cycleId)].slice(0, 24);

    await supabase.from("system_settings").upsert(
      { key: "rotational_badge_history", value: history as any },
      { onConflict: "key" }
    );

    // 5. Award badges in badge_awards table
    const badgeAwardRows = winners.map((w) => ({
      user_id: w.studentId,
      badge_id: w.badgeType === "best_library_user" ? bestUserBadgeId : readerMonthBadgeId,
      awarded_by: adminId,
      award_type: "rotational_award",
      note: `Rotational ${w.badgeName} for ${w.scopeValue} (${cycleLabel}). Physical Badge Collection Date: ${settings.collectionDate} at ${settings.collectionVenue}`
    }));

    if (badgeAwardRows.length > 0) {
      await supabase.from("badge_awards").insert(badgeAwardRows);
    }

    // 6. Send high-visibility notifications to winning students
    const formattedCollectionDate = new Date(settings.collectionDate).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const notificationRows = winners.map((w) => {
      const isClassAward = w.badgeType === "best_library_user";
      const icon = isClassAward ? "👑" : "📚";
      return {
        target_user_id: w.studentId,
        sent_by: adminId,
        title: `${icon} Congratulations! You won ${w.badgeName}!`,
        message: `Outstanding achievement! You have been awarded "${w.badgeName}" for ${w.scopeValue} (${cycleLabel}) with ${w.points} XP and ${w.booksIssuedCount} books borrowed. Please collect your physical badge on ${formattedCollectionDate} at ${settings.collectionVenue}. ${settings.librarianNote}`,
        type: "award",
        action_link: "/student-dashboard?tab=badges"
      };
    });

    if (notificationRows.length > 0) {
      await supabase.from("notifications").insert(notificationRows);
    }

    return { success: true, winnersCount: winners.length };
  } catch (err: any) {
    console.error("Error verifying rotational cycle:", err);
    return { success: false, winnersCount: 0, error: err?.message || "Verification failed" };
  }
}

/**
 * Check if the given student is a winner in the active rotational cycle
 * and whether they haven't acknowledged it yet.
 */
export async function getStudentRotationalAwardInfo(userId: string): Promise<{
  isWinner: boolean;
  hasAcknowledged: boolean;
  winnerRecord: VerifiedWinnerRecord | null;
  cycle: VerifiedRotationalCycle | null;
}> {
  try {
    const cycle = await getActiveRotationalCycle();
    if (!cycle || !cycle.winners) {
      return { isWinner: false, hasAcknowledged: false, winnerRecord: null, cycle: null };
    }

    const winnerRecord = cycle.winners.find((w) => w.studentId === userId) || null;
    if (!winnerRecord) {
      return { isWinner: false, hasAcknowledged: false, winnerRecord: null, cycle };
    }

    const localKey = `rotational_acknowledged_${cycle.cycleId}_${userId}`;
    const localAck = localStorage.getItem(localKey) === "true";
    const serverAck = (cycle.acknowledgedUserIds || []).includes(userId);

    return {
      isWinner: true,
      hasAcknowledged: localAck || serverAck,
      winnerRecord,
      cycle
    };
  } catch (err) {
    console.error("Error getting student rotational award:", err);
    return { isWinner: false, hasAcknowledged: false, winnerRecord: null, cycle: null };
  }
}

/**
 * Acknowledge receipt/viewing of the badge winning popup
 */
export async function acknowledgeStudentRotationalAward(userId: string, cycleId: string): Promise<void> {
  try {
    const localKey = `rotational_acknowledged_${cycleId}_${userId}`;
    localStorage.setItem(localKey, "true");

    const cycle = await getActiveRotationalCycle();
    if (cycle && cycle.cycleId === cycleId) {
      const ackSet = new Set(cycle.acknowledgedUserIds || []);
      ackSet.add(userId);
      cycle.acknowledgedUserIds = Array.from(ackSet);

      await supabase.from("system_settings").upsert(
        { key: "rotational_badge_active_cycle", value: cycle as any },
        { onConflict: "key" }
      );
    }
  } catch (err) {
    console.error("Error acknowledging rotational award:", err);
  }
}
