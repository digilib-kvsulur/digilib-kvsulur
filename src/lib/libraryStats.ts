import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "dlms_catalog_title_count_v1";
const CACHE_TTL = 6 * 60 * 60 * 1000;

export async function fetchCatalogTitleCount(): Promise<number | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.count && Date.now() - parsed.timestamp < CACHE_TTL) return parsed.count;
    }
  } catch {}

  const { count, error } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .gt("total_copies", 0);

  if (error || count == null) return null;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ count, timestamp: Date.now() }));
  } catch {}
  return count;
}
