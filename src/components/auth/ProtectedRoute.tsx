import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { loadingManager } from "@/lib/loadingManager";

type Profile = Tables<"profiles">;
type AllowedRole = "admin" | "teacher" | "student";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: readonly AllowedRole[];
  requireApproval?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, requireApproval = true }: ProtectedRouteProps) => {
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem("dlms_user_profile") : null;
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      loadingManager.show("Verifying your library session...");
      let session: any = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session || null;
      } catch (err) {
        console.warn("Session check error:", err);
      }

      if (!mounted) return;

      // Check if localStorage has stored token even if getSession was slow/offline
      const hasStoredToken = typeof window !== "undefined" && Object.keys(window.localStorage || {}).some(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      );

      if (!session && !hasStoredToken) {
        loadingManager.hide();
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      loadingManager.update("Fetching your library profile...");
      const userId = session?.user?.id || profile?.id;
      let userProfile = profile;

      if (userId) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (!error && data) {
            userProfile = data;
            try {
              localStorage.setItem("dlms_user_profile", JSON.stringify(data));
            } catch {}
          }
        } catch (netErr) {
          console.warn("Network error during profile fetch, using cached profile:", netErr);
        }
      }

      if (!mounted) return;

      if (!userProfile) {
        loadingManager.hide();
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      loadingManager.update("Checking access permissions...");
      const roleAllowed = allowedRoles.includes(userProfile.role as AllowedRole);
      const approvalAllowed = !requireApproval || userProfile.is_approved || userProfile.role === "admin";

      if (!approvalAllowed) {
        loadingManager.hide();
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      if (!roleAllowed) {
        loadingManager.hide();
        if (userProfile.role === "admin") setRedirectTo("/admin-dashboard");
        else if (userProfile.role === "teacher") setRedirectTo("/teacher-dashboard");
        else if (userProfile.role === "student") setRedirectTo("/student-dashboard");
        else setRedirectTo("/login");
        setLoading(false);
        return;
      }

      loadingManager.update("Loading your dashboard...");
      setProfile(userProfile);
      setLoading(false);

      // Graceful fallback to hide loader if child dashboard doesn't manage it
      setTimeout(() => {
        if (mounted) loadingManager.hide();
      }, 800);
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [allowedRoles, requireApproval]);

  if (loading) return null;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  if (!profile) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
