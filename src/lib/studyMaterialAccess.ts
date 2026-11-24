import { supabase } from "@/integrations/supabase/client";

const PUBLIC_OBJECT_MARKER = "/storage/v1/object/public/study-materials/";

export async function getStudyMaterialAccessUrl(url: string) {
  const markerIndex = url.indexOf(PUBLIC_OBJECT_MARKER);
  if (markerIndex < 0) return url;
  const path = decodeURIComponent(url.slice(markerIndex + PUBLIC_OBJECT_MARKER.length).split("?")[0]);
  const { data, error } = await supabase.storage.from("study-materials").createSignedUrl(path, 30 * 60);
  if (error || !data?.signedUrl) throw error || new Error("Could not open this study resource.");
  return data.signedUrl;
}

export async function openStudyMaterial(url: string) {
  const accessUrl = await getStudyMaterialAccessUrl(url);
  window.open(accessUrl, "_blank", "noopener,noreferrer");
}
