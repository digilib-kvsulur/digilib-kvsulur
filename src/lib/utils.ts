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

/**
 * Converts a hex color string (e.g. "#4f46e5" or "4f46e5") to space-separated HSL channels
 * suitable for Tailwind / shadcn CSS variables: "H S% L%" (without the "hsl()" wrapper).
 */
export function hexToHslChannels(hex: string): string | null {
  if (!hex) return null;
  let cleanHex = hex.trim().replace(/^#/, "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) return null;

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = h / 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return `${hDeg} ${sPct}% ${lPct}%`;
}

/**
 * Dynamically applies the primary theme color across the document root,
 * safely updating --primary, --ring, --sidebar-primary, and primary gradients.
 */
export function applyThemePrimaryColor(colorHexOrHsl: string) {
  if (!colorHexOrHsl) return;
  const root = document.documentElement;
  const hslChannels = colorHexOrHsl.startsWith("#")
    ? hexToHslChannels(colorHexOrHsl)
    : colorHexOrHsl.includes("%")
    ? colorHexOrHsl
    : hexToHslChannels(`#${colorHexOrHsl}`);

  if (!hslChannels) return;

  root.style.setProperty("--primary", hslChannels);
  root.style.setProperty("--ring", hslChannels);
  root.style.setProperty("--sidebar-primary", hslChannels);
  root.style.setProperty("--sidebar-ring", hslChannels);

  // Parse lightness to ensure contrasting foreground
  const parts = hslChannels.split(" ");
  if (parts.length === 3) {
    const lValue = parseInt(parts[2].replace("%", ""), 10);
    // If lightness is > 65%, use dark foreground, otherwise crisp white/light
    if (lValue > 65) {
      root.style.setProperty("--primary-foreground", "222 47% 11%");
      root.style.setProperty("--sidebar-primary-foreground", "222 47% 11%");
    } else {
      root.style.setProperty("--primary-foreground", "210 40% 98%");
      root.style.setProperty("--sidebar-primary-foreground", "0 0% 98%");
    }
  }

  // Update dynamic gradient-primary
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${hslChannels}), hsl(var(--accent)))`
  );
}

