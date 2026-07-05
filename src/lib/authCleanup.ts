import { supabase } from "@/integrations/supabase/client";

export const isInvalidRefreshTokenError = (error: unknown) => {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message || "")
    : String(error || "");
  return /invalid refresh token|refresh token not found|refresh_token_not_found/i.test(message);
};

export const clearStoredAuthSession = () => {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => window.localStorage.removeItem(key));
};

export const recoverInvalidAuthSession = async () => {
  const { error } = await supabase.auth.getSession();
  if (error && isInvalidRefreshTokenError(error)) {
    clearStoredAuthSession();
    return true;
  }
  return false;
};