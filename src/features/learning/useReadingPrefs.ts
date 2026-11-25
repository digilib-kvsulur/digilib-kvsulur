import { useCallback, useEffect, useState } from "react";
import { fetchReadingPrefs, saveDataSaver, saveReadingPrefs } from "./api";
import type { ReadingPrefs } from "./types";

export const DEFAULT_READING_PREFS: ReadingPrefs = {
  fontScale: 1,
  lineHeight: 1.6,
  dyslexiaFont: false,
  highContrast: false,
  readAloud: false,
};

function normalise(raw: Record<string, unknown> | null | undefined): ReadingPrefs {
  const number = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  return {
    fontScale: number(raw?.fontScale, DEFAULT_READING_PREFS.fontScale, 0.9, 1.4),
    lineHeight: number(raw?.lineHeight, DEFAULT_READING_PREFS.lineHeight, 1.3, 2.1),
    dyslexiaFont: Boolean(raw?.dyslexiaFont),
    highContrast: Boolean(raw?.highContrast),
    readAloud: Boolean(raw?.readAloud),
  };
}

export function useReadingPrefs(userId?: string) {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_READING_PREFS);
  const [dataSaver, setDataSaverState] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchReadingPrefs(userId)
      .then((result) => {
        if (!alive) return;
        setPrefs(normalise(result.prefs));
        setDataSaverState(result.dataSaver);
        setError("");
      })
      .catch(() => {
        if (alive) setError("Reading preferences could not be loaded. Defaults are being used.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--reading-font-scale", String(prefs.fontScale));
    root.style.setProperty("--reading-line-height", String(prefs.lineHeight));
    root.classList.toggle("reading-dyslexia", prefs.dyslexiaFont);
    root.classList.toggle("reading-high-contrast", prefs.highContrast);
  }, [prefs]);

  const update = useCallback(
    (patch: Partial<ReadingPrefs>) => {
      setPrefs((current) => {
        const next = normalise({ ...current, ...patch });
        if (userId) {
          saveReadingPrefs(userId, next).catch(() => setError("Could not save reading preferences. They will still apply on this device."));
        }
        return next;
      });
    },
    [userId],
  );

  const setDataSaver = useCallback(
    (enabled: boolean) => {
      setDataSaverState(enabled);
      if (userId) {
        saveDataSaver(userId, enabled).catch(() => setError("Could not save the data-saver setting."));
      }
    },
    [userId],
  );

  return { prefs, update, dataSaver, setDataSaver, loading, error };
}
