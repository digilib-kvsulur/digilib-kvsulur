import React, { ReactNode } from "react";
import { useTenant } from "@/context/TenantContext";
import { LibraryLoader } from "@/components/global/LibraryLoader";
import SuspendedPage from "@/pages/SuspendedPage";
import OnboardingWizard from "@/pages/OnboardingWizard";

interface SetupRedirectGuardProps {
  children: ReactNode;
}

/**
 * SetupRedirectGuard wraps the application routes.
 * - Shows loader while tenant metadata is being resolved
 * - If the domain/school is not registered in the registry, displays OnboardingWizard
 * - If the school is marked 'suspended', displays SuspendedPage
 * - Otherwise renders the DLMS application normally
 */
export default function SetupRedirectGuard({ children }: SetupRedirectGuardProps) {
  const { school, loading } = useTenant();

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

  return <>{children}</>;
}
