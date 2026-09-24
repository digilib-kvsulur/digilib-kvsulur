import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { LibraryLoader } from "@/components/global/LibraryLoader";

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
  const [statusMessage, setStatusMessage] = useState("Verifying your library session...");
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      setStatusMessage("Verifying your library session...");
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
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      setStatusMessage("Fetching your library profile...");
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
          // Network offline / fetch timeout — keep using cached profile
          console.warn("Network error during profile fetch, using cached profile:", netErr);
        }
      }

      if (!mounted) return;

      if (!userProfile) {
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      setStatusMessage("Checking access permissions...");
      const roleAllowed = allowedRoles.includes(userProfile.role as AllowedRole);
      const approvalAllowed = !requireApproval || userProfile.is_approved || userProfile.role === "admin";

      if (!approvalAllowed) {
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      if (!roleAllowed) {
        if (userProfile.role === "admin") setRedirectTo("/admin-dashboard");
        else if (userProfile.role === "teacher") setRedirectTo("/teacher-dashboard");
        else if (userProfile.role === "student") setRedirectTo("/student-dashboard");
        else setRedirectTo("/login");
        setLoading(false);
        return;
      }

      setStatusMessage("Opening your dashboard...");
      setProfile(userProfile);
      setLoading(false);
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [allowedRoles, requireApproval]);

  if (loading) return <LibraryLoader fullScreen message={statusMessage} />;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  if (!profile) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
