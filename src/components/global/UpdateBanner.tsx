import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, Download, ExternalLink } from "lucide-react";

// Current build version of the app
const CURRENT_VERSION = "1.0.0";

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
        <DialogContent className="max-w-md p-6 [&>button]:hidden">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/20 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100">
              Update Required 🚀
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              A newer, critical version of PM SHRI KV Sulur Digital Library App (v{serverVersion}) is available. 
              Please download and install it to continue using the library.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 flex flex-col gap-2.5">
            <Button onClick={handleUpdate} size="lg" className="w-full gap-2 font-bold bg-indigo-600 hover:bg-indigo-700">
              <Download className="w-4 h-4" /> Update Now
            </Button>
            <Button 
              variant="outline" 
              className="w-full text-xs" 
              onClick={() => window.open("https://github.com/digilib-kvsulur/digilib-kvsulur/releases", "_blank")}
            >
              View Releases <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
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
