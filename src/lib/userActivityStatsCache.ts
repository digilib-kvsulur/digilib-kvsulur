import { supabase } from "@/integrations/supabase/client";

export const USER_ACTIVITY_STATS_TTL_MS = 60 * 60 * 1000;

export interface UserActivityStats {
  posts_count: number;
  comments_count: number;
  friends_count: number;
  books_issued: number;
  reviews_count: number;
}

export type UserActivityStat = keyof UserActivityStats;

interface CachedStats {
  cachedAt: number;
  stats: UserActivityStats;
}

const CACHE_PREFIX = "dlms:user-activity-stats:v1:";
const pending = new Map<string, Promise<UserActivityStats | null>>();

function storageKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

function readCache(userId: string): CachedStats | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedStats;
    if (!parsed?.stats || typeof parsed.cachedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(userId: string, value: CachedStats) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(value));
  } catch {
    // The cache is an optimization; storage restrictions must not block the app.
  }
}

export async function getUserActivityStats(userId: string): Promise<UserActivityStats | null> {
  if (!userId) return null;
  const cached = readCache(userId);
  if (cached && Date.now() - cached.cachedAt < USER_ACTIVITY_STATS_TTL_MS) return cached.stats;

  const existing = pending.get(userId);
  if (existing) return existing;

  const request = (async () => {
    const { data, error } = await supabase.rpc("get_user_activity_stats", { _user_id: userId });
    if (error) {
      return cached?.stats ?? null;
    }
    const row = (data || [])[0] as UserActivityStats | undefined;
    if (!row) return null;
    writeCache(userId, { cachedAt: Date.now(), stats: row });
    return row;
  })();

  pending.set(userId, request);
  try {
    return await request;
  } finally {
    if (pending.get(userId) === request) pending.delete(userId);
  }
}

/** Update a locally known activity after a successful action without issuing another query. */
export function incrementUserActivityStat(userId: string | null | undefined, stat: UserActivityStat, amount = 1) {
  if (!userId || !Number.isFinite(amount) || amount === 0) return;
  const cached = readCache(userId);
  if (!cached) return;
  cached.stats[stat] = Math.max(0, (cached.stats[stat] || 0) + amount);
  writeCache(userId, cached);
}
