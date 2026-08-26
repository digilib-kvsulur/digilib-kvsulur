import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, ExternalLink } from "lucide-react";

// Current build version of the app
const CURRENT_VERSION = "1.0.2";

export default function UpdateBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [updateNeeded, setUpdateNeeded] = useState(false);
  const [isForced, setIsForced] = useState(false);
  const [serverVersion, setServerVersion] = useState("");

  useEffect(() => {
    // Check key 'app_version' in system_settings
    supabase.from("system_settings").select("key, value").in("key", ["app_version", "force_update"]).then(res => {
      if (res.data) {
        const versionSetting = res.data.find(r => r.key === "app_version");
        const forceSetting = res.data.find(r => r.key === "force_update");
        
        if (versionSetting?.value) {
          const sVersion = String(versionSetting.value).trim();
          setServerVersion(sVersion);

          // Compare versions (simple split comparison)
          const compare = compareVersions(CURRENT_VERSION, sVersion);
          if (compare < 0) {
            setUpdateNeeded(true);
            setIsForced(forceSetting?.value === "true" || forceSetting?.value === true);
          }
        }
      }
    });
  }, [location.pathname]);

  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  };

  const handleUpdate = () => {
    navigate("/download");
  };

  if (!updateNeeded) return null;

  // Don't show the warning banner on the download page itself
  if (location.pathname === "/download") return null;

  if (isForced) {
    return (
      <Dialog open={true}>
        <DialogContent className="
          p-0 overflow-hidden border-0 shadow-2xl
          w-[calc(100vw-2rem)] max-w-sm mx-auto
          rounded-2xl
          [&>button]:hidden
          bottom-4 sm:bottom-auto
          fixed sm:relative
        ">
          {/* Gradient top strip */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-6 pt-8 pb-10 text-center relative overflow-hidden">
            {/* Decorative rings */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/10" />

            {/* Icon */}
            <div className="relative z-10 mx-auto mb-4 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
              <Download className="w-8 h-8 text-white" />
            </div>

            {/* Version badge */}
            <span className="relative z-10 inline-block bg-white/25 text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              v{serverVersion} Available
            </span>

            <DialogTitle className="relative z-10 text-white text-xl font-black leading-tight">
              Update Required 🚀
            </DialogTitle>
            <DialogDescription className="relative z-10 text-indigo-100 text-sm mt-2 leading-relaxed">
              A critical new version of the DLMS app is ready. Please update to continue.
            </DialogDescription>
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-slate-900 px-5 py-5 space-y-3">
            {/* What's changed callout */}
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1">Why update?</p>
              <ul className="text-xs text-indigo-600 dark:text-indigo-300 space-y-0.5 list-disc list-inside">
                <li>New features &amp; improvements</li>
                <li>Bug fixes &amp; stability</li>
                <li>Security enhancements</li>
              </ul>
            </div>

            {/* CTA buttons */}
            <Button
              onClick={handleUpdate}
              size="lg"
              className="w-full gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl text-base"
            >
              <Download className="w-5 h-5" /> Update Now
            </Button>

            <button
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 transition-colors"
              onClick={() => window.open("https://github.com/digilib-kvsulur/digilib-kvsulur/releases", "_blank")}
            >
              View release notes <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-md sticky top-0 z-[100] animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <span className="bg-indigo-700 px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider shrink-0">New Update</span>
        <span className="truncate">Version {serverVersion} is available with exciting new features and fixes!</span>
      </div>
      <Button 
        onClick={handleUpdate} 
        size="sm" 
        variant="secondary" 
        className="h-7 text-indigo-700 hover:bg-indigo-50 font-extrabold whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5 mr-1" /> Get Update
      </Button>
    </div>
  );
}
