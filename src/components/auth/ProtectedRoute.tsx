import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type AllowedRole = "admin" | "teacher" | "student";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: readonly AllowedRole[];
  requireApproval?: boolean;
}

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Checking access...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles, requireApproval = true }: ProtectedRouteProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session) {
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!mounted) return;
      if (error || !data) {
        setRedirectTo("/login");
        setLoading(false);
        return;
      }

      const roleAllowed = allowedRoles.includes(data.role as AllowedRole);
      const approvalAllowed = !requireApproval || data.is_approved || data.role === "admin";

      if (!roleAllowed || !approvalAllowed) {
        setRedirectTo("/");
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [allowedRoles, requireApproval]);

  if (loading) return <LoadingScreen />;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  if (!profile) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
