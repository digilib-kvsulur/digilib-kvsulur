import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const REGISTRY_URL = import.meta.env.VITE_REGISTRY_URL as string;
const REGISTRY_ANON_KEY = import.meta.env.VITE_REGISTRY_ANON_KEY as string;

// Singleton registry client — shared across renders but isolated from tenant client
let _registryClient: ReturnType<typeof createClient> | null = null;
function getRegistryClient() {
  if (!_registryClient) {
    if (!REGISTRY_URL || !REGISTRY_ANON_KEY) {
      return null;
    }
    _registryClient = createClient(REGISTRY_URL, REGISTRY_ANON_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _registryClient;
}

interface SuperAdminGuardProps {
  children: ReactNode;
}

const SuperAdminGuard = ({ children }: SuperAdminGuardProps) => {
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">("loading");

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const registry = getRegistryClient();
        if (!registry) {
          // If registry project is not configured yet, deny access gracefully
          if (mounted) setStatus("denied");
          return;
        }

        const tenantUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const tenantKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        if (!tenantUrl || !tenantKey) {
          if (mounted) setStatus("denied");
          return;
        }

        // Get the currently authenticated user from the TENANT supabase (same session)
        const { createClient: tenantCreate } = await import("@supabase/supabase-js");
        const tenantClient = tenantCreate(tenantUrl, tenantKey, {
          auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
        });

        const { data: sessionData } = await tenantClient.auth.getSession();
        const uid = sessionData?.session?.user?.id;

        if (!uid) {
          if (mounted) setStatus("denied");
          return;
        }

        const { data, error } = await registry
          .from("super_admins")
          .select("auth_uid")
          .eq("auth_uid", uid)
          .maybeSingle();

        if (!mounted) return;

        if (error || !data) {
          setStatus("denied");
        } else {
          setStatus("authorized");
        }
      } catch (err) {
        console.error("SuperAdminGuard check failed:", err);
        if (mounted) setStatus("denied");
      }
    };

    check();
    return () => { mounted = false; };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Verifying super admin access…</p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/40">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <Shield className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-xl text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              You don't have Super Admin privileges. This area is restricted to platform
              administrators only.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export { getRegistryClient };
export default SuperAdminGuard;
