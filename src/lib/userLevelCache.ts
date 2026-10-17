import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "dlms:user-level:v1";
const TTL_MS = 60 * 60 * 1000;

export interface UserLevelInfo {
  level_number: number;
  name: string;
  min_points: number;
  max_points: number | null;
  icon_name: string;
  color: string;
  description: string;
  progress_to_next: number;
  points_to_next: number;
}

interface CachedLevel {
  cachedAt: number;
  points: number;
  info: UserLevelInfo;
}

const pending = new Map<number, Promise<UserLevelInfo | null>>();

function readCache(): CachedLevel | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLevel;
    return parsed?.info && Number.isFinite(parsed.points) && Number.isFinite(parsed.cachedAt) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(value: CachedLevel) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // The cache is an optimization; storage restrictions must not block the app.
  }
}

function deriveForPoints(cached: CachedLevel, points: number): UserLevelInfo | null {
  if (points < cached.info.min_points) return null;
  if (cached.info.points_to_next <= 0) {
    return { ...cached.info, progress_to_next: 100, points_to_next: 0 };
  }

  const nextLevelPoints = cached.points + cached.info.points_to_next;
  if (points >= nextLevelPoints) return null;
  const span = nextLevelPoints - cached.info.min_points;
  return {
    ...cached.info,
    progress_to_next: span > 0 ? Math.min(100, Math.round(((points - cached.info.min_points) / span) * 100)) : 100,
    points_to_next: Math.max(0, nextLevelPoints - points),
  };
}

export async function getUserLevel(points: number): Promise<UserLevelInfo | null> {
  const normalizedPoints = Math.max(0, Math.floor(Number(points) || 0));
  const cached = readCache();
  if (cached && Date.now() - cached.cachedAt < TTL_MS) {
    const derived = deriveForPoints(cached, normalizedPoints);
    if (derived) {
      // Persist the updated XP/progress locally, while keeping the original one-hour refresh time.
      writeCache({ ...cached, points: normalizedPoints, info: derived });
      return derived;
    }
  }

  const existing = pending.get(normalizedPoints);
  if (existing) return existing;

  const request = (async () => {
    const { data, error } = await supabase.rpc("get_user_level", { user_points: normalizedPoints });
    if (error) {
      const stale = cached ? deriveForPoints(cached, normalizedPoints) : null;
      if (stale) return stale;
      throw error;
    }
    const row = (data || [])[0] as UserLevelInfo | undefined;
    if (!row) return null;
    writeCache({ cachedAt: Date.now(), points: normalizedPoints, info: row });
    return row;
  })();

  pending.set(normalizedPoints, request);
  try {
    return await request;
  } finally {
    if (pending.get(normalizedPoints) === request) pending.delete(normalizedPoints);
  }
}
