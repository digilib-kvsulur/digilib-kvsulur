import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolBrandingSettings {
  school_name: string;
  school_tagline: string;
  school_logo_url: string;
  school_banner_url: string;
  school_favicon_url: string;
  school_primary_color: string;
  school_contact_email: string;
  school_contact_phone: string;
  school_location: string;
  school_website: string;
  home_hero_title: string;
  home_hero_subtitle: string;
  home_cta_text: string;
  home_cta_link: string;
  home_show_stats: boolean;
  home_show_events: boolean;
  home_show_gallery: boolean;
  home_show_botw: boolean;
  home_show_trending: boolean;
  home_announcement_enabled: boolean;
  home_announcement_text: string;
  home_announcement_type: "info" | "warning" | "success";
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolBrandingSettings = {
  school_name: "PM SHRI KV SULUR",
  school_tagline: "Digital Library System",
  school_logo_url: "",
  school_banner_url: "",
  school_favicon_url: "",
  school_primary_color: "#4f46e5", // Indigo-600
  school_contact_email: "dlms@kvsulur.in",
  school_contact_phone: "",
  school_location: "PM SHRI KV AFS Sulur, Coimbatore",
  school_website: "https://kvsulur.kvs.ac.in",
  home_hero_title: "A Library That Grows With Every Reader.",
  home_hero_subtitle:
    "Welcome to the digital portal of PM SHRI KENDRIYA VIDYALAYA, AIR FORCE STATION SULUR - DLMS. Borrow your favorite books, participate in live quizzes, follow friends, and level up your reading XP!",
  home_cta_text: "Open Account",
  home_cta_link: "/login",
  home_show_stats: true,
  home_show_events: true,
  home_show_gallery: true,
  home_show_botw: true,
  home_show_trending: true,
  home_announcement_enabled: false,
  home_announcement_text: "",
  home_announcement_type: "info",
};

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolBrandingSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (error) {
        console.warn("Could not fetch system settings:", error.message);
        return;
      }

      if (data && data.length > 0) {
        const settingsMap: Record<string, any> = {};
        data.forEach((row) => {
          let val = row.value;
          try {
            if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
              val = JSON.parse(val);
            }
          } catch {}
          settingsMap[row.key] = val;
        });

        setSettings((prev) => ({
          ...prev,
          school_name: settingsMap.school_name || prev.school_name,
          school_tagline: settingsMap.school_tagline || prev.school_tagline,
          school_logo_url: settingsMap.school_logo_url || prev.school_logo_url,
          school_banner_url: settingsMap.school_banner_url || prev.school_banner_url,
          school_favicon_url: settingsMap.school_favicon_url || prev.school_favicon_url,
          school_primary_color: settingsMap.school_primary_color || prev.school_primary_color,
          school_contact_email: settingsMap.school_contact_email || prev.school_contact_email,
          school_contact_phone: settingsMap.school_contact_phone || prev.school_contact_phone,
          school_location: settingsMap.school_location || prev.school_location,
          school_website: settingsMap.school_website || prev.school_website,
          home_hero_title: settingsMap.home_hero_title || prev.home_hero_title,
          home_hero_subtitle: settingsMap.home_hero_subtitle || prev.home_hero_subtitle,
          home_cta_text: settingsMap.home_cta_text || prev.home_cta_text,
          home_cta_link: settingsMap.home_cta_link || prev.home_cta_link,
          home_show_stats: settingsMap.home_show_stats !== undefined ? Boolean(settingsMap.home_show_stats === true || settingsMap.home_show_stats === "true") : prev.home_show_stats,
          home_show_events: settingsMap.home_show_events !== undefined ? Boolean(settingsMap.home_show_events === true || settingsMap.home_show_events === "true") : prev.home_show_events,
          home_show_gallery: settingsMap.home_show_gallery !== undefined ? Boolean(settingsMap.home_show_gallery === true || settingsMap.home_show_gallery === "true") : prev.home_show_gallery,
          home_show_botw: settingsMap.home_show_botw !== undefined ? Boolean(settingsMap.home_show_botw === true || settingsMap.home_show_botw === "true") : prev.home_show_botw,
          home_show_trending: settingsMap.home_show_trending !== undefined ? Boolean(settingsMap.home_show_trending === true || settingsMap.home_show_trending === "true") : prev.home_show_trending,
          home_announcement_enabled: settingsMap.home_announcement_enabled !== undefined ? Boolean(settingsMap.home_announcement_enabled === true || settingsMap.home_announcement_enabled === "true") : prev.home_announcement_enabled,
          home_announcement_text: settingsMap.home_announcement_text || prev.home_announcement_text,
          home_announcement_type: settingsMap.home_announcement_type || prev.home_announcement_type,
        }));
      }
    } catch (err) {
      console.error("Error loading school settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<SchoolBrandingSettings>) => {
    setSaving(true);
    try {
      const rows = Object.entries(newSettings).map(([key, value]) => ({
        key,
        value: typeof value === "boolean" ? String(value) : value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("system_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;

      setSettings((prev) => ({ ...prev, ...newSettings }));
      return { success: true };
    } catch (err: any) {
      console.error("Failed to update school settings:", err);
      return { success: false, error: err.message || "Failed to save settings" };
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateSettings,
    refreshSettings: fetchSettings,
  };
}
