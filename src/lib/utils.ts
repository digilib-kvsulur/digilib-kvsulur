import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "@/integrations/supabase/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getAvatarUrl = (avatarPath: string | null | undefined): string | null => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("http")) return avatarPath;
  const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
  return data.publicUrl;
};
