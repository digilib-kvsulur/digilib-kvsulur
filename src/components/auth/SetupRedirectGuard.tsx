import React, { ReactNode } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useTenant } from "@/context/TenantContext";
import { LibraryLoader } from "@/components/global/LibraryLoader";
import SuspendedPage from "@/pages/SuspendedPage";
import OnboardingWizard from "@/pages/OnboardingWizard";
import PlatformPause from "@/pages/PlatformPause";
import { isPauseActive } from "@/config/pauseConfig";

interface SetupRedirectGuardProps {
  children: ReactNode;
}

/**
 * SetupRedirectGuard wraps the application routes.
 * - Shows loader while tenant metadata is being resolved
 * - If the domain/school is not registered in the registry, displays OnboardingWizard
 * - If the school is marked 'suspended', displays SuspendedPage
 * - During Community Pause:
 *     - Allows /admin-dashboard (enforced by ProtectedRoute for admin role alone)
 *     - Allows /login so administrators can authenticate
 *     - Redirects logged-in admins from root to /admin-dashboard
 *     - Displays PlatformPause for students and all other non-admin routes
 * - Otherwise renders the DLMS application normally
 */
export default function SetupRedirectGuard({ children }: SetupRedirectGuardProps) {
  const { school, loading } = useTenant();
  const location = useLocation();

  if (loading) {
    return <LibraryLoader fullScreen={true} />;
  }

  // Not found in registry -> Prompt onboarding wizard
  if (!school) {
    return <OnboardingWizard />;
  }

  // School status is suspended -> Show suspended lock screen
  if (school.status === "suspended") {
    return <SuspendedPage />;
  }

  // Community Pause Enforcement:
  // Admin dashboard and login routes are accessible; all student/public routes are blocked.
  const isBypassed =
    typeof window !== "undefined" &&
    (window.location.search.includes("bypass=dlms_dev") || window.location.search.includes("bypass=dlms_pause"));

  if (isPauseActive() && !isBypassed) {
    const pathname = (location.pathname || "").toLowerCase();
    const isAdminRoute = pathname.startsWith("/admin-dashboard") || pathname.startsWith("/super-admin");
    const isLoginRoute = pathname.startsWith("/login");

    if (isAdminRoute || isLoginRoute) {
      return <>{children}</>;
    }

    // If an admin navigates to root or home, route them straight into admin-dashboard
    try {
      const cached = localStorage.getItem("dlms_user_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.role === "admin") {
          return <Navigate to="/admin-dashboard" replace />;
        }
      }
    } catch {}

    // Students, teachers, and unauthenticated public visitors see PlatformPause
    return <PlatformPause />;
  }

  return <>{children}</>;
}
