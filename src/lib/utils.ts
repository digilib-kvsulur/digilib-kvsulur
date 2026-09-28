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

export const isGoogleDriveUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes("drive.google.com") || url.includes("docs.google.com");
};

export const isGoogleDriveFolder = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return (
    url.includes("/drive/folders/") ||
    /\/drive(\/u\/\d+)?\/folders\//.test(url)
  );
};

export const formatGoogleDriveUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!isGoogleDriveUrl(trimmed)) return trimmed;

  try {
    // If it's a folder, leave as is (folders cannot be embedded in iframe)
    if (isGoogleDriveFolder(trimmed)) {
      return trimmed;
    }

    // 1. Google Drive /file/d/<ID>
    if (trimmed.includes("/file/d/")) {
      const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    // 2. Google Drive open?id=<ID> or uc?id=<ID>
    if (trimmed.includes("drive.google.com") && trimmed.includes("id=")) {
      const match = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    // 3. Google Docs, Sheets, Slides, Forms
    if (trimmed.includes("docs.google.com")) {
      const match = trimmed.match(/docs\.google\.com\/(document|spreadsheets|presentation|forms)\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1] && match[2]) {
        const type = match[1];
        const id = match[2];
        if (type === "forms") {
          return `https://docs.google.com/forms/d/${id}/viewform?embedded=true`;
        }
        return `https://docs.google.com/${type}/d/${id}/preview`;
      }
    }
  } catch (e) {
    console.error("Error formatting Google Drive URL:", e);
  }

  return trimmed;
};
