import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, RefreshCw, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractSESRedirectUrl } from "@/lib/trackingUrlExtractor";

const EmailTrackingRedirect = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawHref = window.location.href;
    const targetUrl = extractSESRedirectUrl(rawHref);

    if (targetUrl) {
      try {
        const parsed = new URL(targetUrl);
        // If the target is our own domain's internal path, navigate directly
        if (parsed.origin === window.location.origin) {
          navigate(parsed.pathname + parsed.search + parsed.hash, { replace: true });
          return;
        }
        // If it's external (e.g. Supabase Auth verify endpoint), do a full browser redirect
        window.location.replace(targetUrl);
      } catch {
        window.location.replace(targetUrl);
      }
    } else {
      setError("We were unable to extract the destination from this email security link.");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-3 text-white">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">PM SHRI KV AFS SULUR</h1>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Digital Library Security</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          {!error ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 animate-pulse">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Verifying Security Link</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                Opening your email confirmation and redirecting to the password reset portal…
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-600 pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Protected by KV Sulur DLMS Auth</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Link Could Not Be Opened</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {error}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={() => navigate("/reset-password", { replace: true })}
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
                >
                  Go to Password Reset Page <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login", { replace: true })}
                  className="w-full h-10 rounded-xl text-xs font-semibold text-slate-600 border-slate-200"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTrackingRedirect;
