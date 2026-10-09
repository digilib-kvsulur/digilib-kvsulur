import { ReactNode, useEffect, useState } from "react";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ─── Registry client (only used if VITE_REGISTRY_URL is configured) ──────────
let _registryClient: ReturnType<typeof import("@supabase/supabase-js").createClient> | null = null;

async function getRegistryOrLocalClient() {
  const registryUrl = import.meta.env.VITE_REGISTRY_URL as string | undefined;
  const registryKey = import.meta.env.VITE_REGISTRY_ANON_KEY as string | undefined;

  if (registryUrl && registryKey) {
    if (!_registryClient) {
      const { createClient } = await import("@supabase/supabase-js");
      _registryClient = createClient(registryUrl, registryKey, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
      });
    }
    return _registryClient;
  }

  // Fallback: use the school's own Supabase project (requires super_admins table migration)
  return supabase;
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
        // 1. Get the current session user
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        let uid = user?.id;
        let userEmail = user?.email?.toLowerCase().trim();

        // Fallback: check localStorage for auth tokens if session is empty
        if (!uid && !userEmail && typeof window !== "undefined") {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.includes("-auth-token")) {
                const raw = localStorage.getItem(key);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  const u = parsed?.user || parsed?.currentSession?.user;
                  if (u) {
                    uid = uid || u.id;
                    userEmail = userEmail || u.email?.toLowerCase().trim();
                  }
                }
              }
            }
          } catch { /* ignore */ }

          // Also check dlms_user_profile cache
          try {
            const rawProfile = localStorage.getItem("dlms_user_profile");
            if (rawProfile) {
              const p = JSON.parse(rawProfile);
              if (p?.email) userEmail = userEmail || p.email.toLowerCase().trim();
              if (p?.id) uid = uid || p.id;
            }
          } catch { /* ignore */ }
        }

        if (!uid && !userEmail) {
          if (mounted) setStatus("denied");
          return;
        }

        // 2. Get the appropriate client (registry or local school DB)
        const client = await getRegistryOrLocalClient();

        // 3. Try matching by auth_uid first
        let matched = false;
        if (uid) {
          const { data: uidData } = await (client as any)
            .from("super_admins")
            .select("id, is_active")
            .eq("auth_uid", uid)
            .eq("is_active", true)
            .maybeSingle();

          if (uidData) matched = true;
        }

        // 4. Fallback: match by email (handles NULL auth_uid rows)
        if (!matched && userEmail) {
          const { data: emailData } = await (client as any)
            .from("super_admins")
            .select("id, auth_uid, is_active")
            .ilike("email", userEmail)
            .eq("is_active", true)
            .maybeSingle();

          if (emailData) {
            matched = true;
            // Auto-link auth_uid to avoid future email lookups
            if (!emailData.auth_uid && uid) {
              await (client as any)
                .from("super_admins")
                .update({ auth_uid: uid })
                .eq("id", emailData.id);
            }
          }
        }

        if (!mounted) return;
        setStatus(matched ? "authorized" : "denied");
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
            <div className="space-y-2">
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Make sure you are logged in with a super admin account and your email is
                registered in the <code className="bg-muted px-1 rounded">super_admins</code> table.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
