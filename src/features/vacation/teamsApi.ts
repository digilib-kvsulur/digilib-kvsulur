import { supabase } from "@/integrations/supabase/client";
import type { VacationPeerProfile, VacationTeam, VacationTeamMember } from "./types";

const LOCAL_TEAMS_STORAGE_KEY = "dlms_vacation_teams_store_v1";

// Helper to get local teams storage
function getStoredTeams(): VacationTeam[] {
  try {
    const raw = localStorage.getItem(LOCAL_TEAMS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Helper to save local teams storage
function saveStoredTeams(teams: VacationTeam[]) {
  try {
    localStorage.setItem(LOCAL_TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch {}
}

/**
 * Helper to fetch friend user IDs for a user from friendships table (status = 'accepted')
 */
export async function fetchUserFriendIds(userId: string): Promise<Set<string>> {
  const friendIds = new Set<string>();
  if (!userId) return friendIds;
  try {
    const { data, error } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted");

    if (!error && data) {
      data.forEach((row: any) => {
        if (row.requester_id === userId) {
          friendIds.add(row.addressee_id);
        } else if (row.addressee_id === userId) {
          friendIds.add(row.requester_id);
        }
      });
    }
  } catch (err) {
    console.error("Error fetching friend IDs:", err);
  }
  return friendIds;
}

/**
 * Search students by Admission Number or Name
 */
export async function searchVacationPeers(
  query: string,
  excludeId?: string
): Promise<VacationPeerProfile[]> {
  const clean = query.trim();
  if (!clean || clean.length < 1) return [];

  const results: VacationPeerProfile[] = [];
  const seenIds = new Set<string>();
  const friendIds = excludeId ? await fetchUserFriendIds(excludeId) : new Set<string>();

  // 1. Direct query on profiles table (matching admission_number or first_name or last_name)
  try {
    const isNumeric = /^\d+$/.test(clean);
    let q = supabase
      .from("profiles")
      .select("id, first_name, last_name, student_class, admission_number, avatar_url, role")
      .eq("role", "student")
      .limit(12);

    if (isNumeric) {
      q = q.ilike("admission_number", `%${clean}%`);
    } else {
      q = q.or(
        `admission_number.ilike.%${clean}%,first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,username.ilike.%${clean}%`
      );
    }

    const { data, error } = await q;

    if (!error && data) {
      data.forEach((p: any) => {
        if (p.id !== excludeId && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          results.push({
            id: p.id,
            first_name: p.first_name || "",
            last_name: p.last_name || "",
            student_class: p.student_class || null,
            admission_number: p.admission_number || null,
            avatar_url: p.avatar_url || null,
            role: p.role,
            is_friend: friendIds.has(p.id),
          });
        }
      });
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback to search_public_profiles RPC if direct query restricted
  if (results.length === 0) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("search_public_profiles", {
        _q: clean,
        _exclude: excludeId || "00000000-0000-0000-0000-000000000000",
      });

      if (!rpcError && rpcData) {
        rpcData.forEach((p: any) => {
          if (p.id !== excludeId && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            results.push({
              id: p.id,
              first_name: p.first_name || "",
              last_name: p.last_name || "",
              student_class: p.student_class || null,
              admission_number: p.admission_number || null,
              avatar_url: null,
              role: p.role,
              is_friend: friendIds.has(p.id),
            });
          }
        });
      }
    } catch {
      // Continue to local mock/fallback
    }
  }

  return results;
}

/**
 * Helper to fetch all teams with members from Supabase, falling back to localStorage
 */
export async function fetchAllVacationTeamsFromDb(campaignId?: string): Promise<VacationTeam[]> {
  try {
    let query = (supabase as any)
      .from("vacation_teams")
      .select(`
        id,
        campaign_id,
        name,
        event_title,
        activity_id,
        leader_id,
        created_at,
        leader:profiles!vacation_teams_leader_id_fkey(first_name, last_name, student_class, admission_number),
        members:vacation_team_members(
          id,
          team_id,
          user_id,
          role,
          status,
          created_at,
          updated_at,
          user:profiles!vacation_team_members_user_id_fkey(first_name, last_name, student_class, admission_number, avatar_url)
        )
      `)
      .order("created_at", { ascending: false });

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data, error } = await query;

    if (!error && data && Array.isArray(data)) {
      const dbTeams: VacationTeam[] = data.map((t: any) => {
        const leadObj = t.leader || {};
        const leaderName = `${leadObj.first_name || ""} ${leadObj.last_name || ""}`.trim() || "Team Leader";
        const membersList: VacationTeamMember[] = (t.members || []).map((m: any) => {
          const uObj = m.user || {};
          const memName = `${uObj.first_name || ""} ${uObj.last_name || ""}`.trim() || "Member";
          return {
            id: m.id,
            team_id: m.team_id,
            user_id: m.user_id,
            name: memName,
            student_class: uObj.student_class || undefined,
            admission_number: uObj.admission_number || undefined,
            avatar_url: uObj.avatar_url || undefined,
            role: m.role || "member",
            status: m.status || "pending",
            invited_at: m.created_at || new Date().toISOString(),
            responded_at: m.updated_at || undefined,
          };
        });

        return {
          id: t.id,
          campaign_id: t.campaign_id,
          name: t.name,
          event_title: t.event_title,
          activity_id: t.activity_id,
          leader_id: t.leader_id,
          leader_name: leaderName,
          created_at: t.created_at,
          members: membersList,
        };
      });

      // Merge and update localStorage cache
      if (dbTeams.length > 0) {
        saveStoredTeams(dbTeams);
        return dbTeams;
      }
    }
  } catch {
    // Fallback to local storage
  }

  return getStoredTeams();
}

/**
 * Create a new team and invite member peers
 */
export async function createVacationTeam(params: {
  campaignId?: string;
  name: string;
  eventTitle: string;
  activityId?: string;
  leader: VacationPeerProfile;
  invitedMembers: VacationPeerProfile[];
}): Promise<VacationTeam> {
  const leaderName = `${params.leader.first_name} ${params.leader.last_name}`.trim() || "Team Leader";

  // Fetch leader's friends so friends are auto-accepted!
  const leaderFriendIds = await fetchUserFriendIds(params.leader.id);

  // 1. Try persisting to Supabase vacation_teams & vacation_team_members
  let dbTeamId: string | null = null;
  try {
    const { data: insertedTeam, error: teamErr } = await (supabase as any)
      .from("vacation_teams")
      .insert({
        campaign_id: params.campaignId || null,
        name: params.name.trim(),
        event_title: params.eventTitle,
        activity_id: params.activityId || null,
        leader_id: params.leader.id,
      })
      .select()
      .single();

    if (!teamErr && insertedTeam) {
      dbTeamId = insertedTeam.id;

      // Insert leader as accepted member
      const memberRows = [
        {
          team_id: dbTeamId,
          user_id: params.leader.id,
          role: "leader",
          status: "accepted",
        },
        ...params.invitedMembers.map((m) => {
          const isFriend = leaderFriendIds.has(m.id);
          return {
            team_id: dbTeamId,
            user_id: m.id,
            role: "member",
            status: isFriend ? "accepted" : "pending",
          };
        }),
      ];

      await (supabase as any).from("vacation_team_members").insert(memberRows);
    }
  } catch {
    // If Supabase table is not yet migrated, fall back gracefully to client ID
  }

  const teamId = dbTeamId || `team-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const leaderMember: VacationTeamMember = {
    id: `mem-${Date.now()}-lead`,
    team_id: teamId,
    user_id: params.leader.id,
    name: leaderName,
    student_class: params.leader.student_class || undefined,
    admission_number: params.leader.admission_number || undefined,
    avatar_url: params.leader.avatar_url || undefined,
    role: "leader",
    status: "accepted",
    invited_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
  };

  const invitees: VacationTeamMember[] = params.invitedMembers.map((m, idx) => {
    const isFriend = leaderFriendIds.has(m.id);
    return {
      id: `mem-${Date.now()}-${idx}`,
      team_id: teamId,
      user_id: m.id,
      name: `${m.first_name} ${m.last_name}`.trim() || "Teammate",
      student_class: m.student_class || undefined,
      admission_number: m.admission_number || undefined,
      avatar_url: m.avatar_url || undefined,
      role: "member",
      status: isFriend ? "accepted" : "pending",
      invited_at: new Date().toISOString(),
      responded_at: isFriend ? new Date().toISOString() : undefined,
    };
  });

  const newTeam: VacationTeam = {
    id: teamId,
    campaign_id: params.campaignId,
    name: params.name.trim(),
    event_title: params.eventTitle,
    activity_id: params.activityId || null,
    leader_id: params.leader.id,
    leader_name: leaderName,
    created_at: new Date().toISOString(),
    members: [leaderMember, ...invitees],
  };

  // Send DB notifications to invited members
  for (const inv of invitees) {
    try {
      const isAutoJoined = inv.status === "accepted";
      await supabase.from("notifications").insert({
        target_user_id: inv.user_id,
        sent_by: params.leader.id,
        title: isAutoJoined ? "Joined Vacation Team! 🤝" : "Vacation Team Invite 🤝",
        message: isAutoJoined
          ? `${leaderName} added you to team "${newTeam.name}" for ${newTeam.event_title}! Since you are friends, you were auto-joined. You can participate together or decline/change your team before 10:00 AM.`
          : `${leaderName} invited you to join team "${newTeam.name}" for ${newTeam.event_title}. Open the Vacation Festival to accept or decline!`,
        type: isAutoJoined ? "success" : "info",
      });
    } catch {}
  }

  // Update local storage sync
  const current = getStoredTeams();
  const updated = [newTeam, ...current.filter((t) => t.id !== newTeam.id)];
  saveStoredTeams(updated);

  return newTeam;
}

/**
 * Fetch all teams for current user (both their teams and incoming invitations)
 * Auto-accepts pending invites if the inviter/leader is an accepted friend in friendships!
 */
export async function fetchMyVacationTeams(userId?: string): Promise<{
  myTeams: VacationTeam[];
  incomingInvites: VacationTeam[];
}> {
  if (!userId) return { myTeams: [], incomingInvites: [] };

  const userFriendIds = await fetchUserFriendIds(userId);

  // Sync from DB first
  const allTeams = await fetchAllVacationTeamsFromDb();

  const myTeams: VacationTeam[] = [];
  const incomingInvites: VacationTeam[] = [];

  for (const team of allTeams) {
    const isLeader = team.leader_id === userId;
    const memberEntry = team.members.find((m) => m.user_id === userId);

    if (isLeader) {
      myTeams.push(team);
    } else if (memberEntry) {
      if (memberEntry.status === "accepted") {
        myTeams.push(team);
      } else if (memberEntry.status === "pending") {
        // If leader is a friend, auto-accept immediately!
        if (userFriendIds.has(team.leader_id)) {
          try {
            await (supabase as any)
              .from("vacation_team_members")
              .update({
                status: "accepted",
                updated_at: new Date().toISOString(),
              })
              .eq("team_id", team.id)
              .eq("user_id", userId);
          } catch {}

          memberEntry.status = "accepted";
          memberEntry.responded_at = new Date().toISOString();
          myTeams.push(team);
        } else {
          // Non-friends: can manually accept or decline
          incomingInvites.push(team);
        }
      }
    }
  }

  return { myTeams, incomingInvites };
}

/**
 * Accept or decline a team invitation
 */
export async function respondVacationTeamInvite(
  teamId: string,
  userId: string,
  decision: "accept" | "decline"
): Promise<VacationTeam | null> {
  // 1. Try DB update first
  try {
    await (supabase as any)
      .from("vacation_team_members")
      .update({
        status: decision === "accept" ? "accepted" : "declined",
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId)
      .eq("user_id", userId);
  } catch {}

  const allTeams = getStoredTeams();
  const targetIndex = allTeams.findIndex((t) => t.id === teamId);
  if (targetIndex === -1) return null;

  const team = allTeams[targetIndex];
  const member = team.members.find((m) => m.user_id === userId);
  if (!member) return null;

  member.status = decision === "accept" ? "accepted" : "declined";
  member.responded_at = new Date().toISOString();

  // Notify leader
  if (decision === "accept") {
    try {
      await supabase.from("notifications").insert({
        target_user_id: team.leader_id,
        sent_by: userId,
        title: "Team Invite Accepted! 🎉",
        message: `${member.name} accepted your invitation to join team "${team.name}" for ${team.event_title}! Your team is formed!`,
        type: "success",
      });
    } catch {}
  } else {
    try {
      await supabase.from("notifications").insert({
        target_user_id: team.leader_id,
        sent_by: userId,
        title: "Team Roster Update",
        message: `${member.name} declined or left team "${team.name}" for ${team.event_title}.`,
        type: "info",
      });
    } catch {}
  }

  allTeams[targetIndex] = { ...team };
  saveStoredTeams(allTeams);

  return allTeams[targetIndex];
}

/**
 * Member leaves or declines an active team
 */
export async function leaveVacationTeam(
  teamId: string,
  userId: string
): Promise<VacationTeam | null> {
  return respondVacationTeamInvite(teamId, userId, "decline");
}

/**
 * Format a formed team into a clean submission string
 */
export function formatTeamRoster(team: VacationTeam): string {
  const acceptedMembers = team.members.filter((m) => m.status === "accepted");
  const rosterStr = acceptedMembers
    .map((m) => {
      const classStr = m.student_class ? `Class ${m.student_class}` : "";
      const admStr = m.admission_number ? `Adm: ${m.admission_number}` : "";
      const details = [classStr, admStr].filter(Boolean).join(", ");
      return details ? `${m.name} (${details})` : m.name;
    })
    .join("; ");

  return `Team "${team.name}" | Members: ${rosterStr}`;
}
