import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download as DownloadIcon, Smartphone, Monitor, ChevronRight, Sparkles, CheckCircle2, ShieldCheck, Zap, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Download() {
  const { toast } = useToast();
  const [apkGuideOpen, setApkGuideOpen] = useState(false);
  const [pwaGuideOpen, setPwaGuideOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null;
  });
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onCustomReady = (e: Event) => {
      setInstallPrompt((e as CustomEvent<BeforeInstallPromptEvent>).detail);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast({ title: "🎉 App Installed!", description: "PM SHRI KV Sulur DLMS is now on your home screen." });
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pwa-install-ready", onCustomReady);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pwa-install-ready", onCustomReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [toast]);

  const handlePWAInstall = async () => {
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          setIsInstalled(true);
          setInstallPrompt(null);
        }
      } catch (err) {
        console.warn("PWA install error:", err);
        setPwaGuideOpen(true);
      }
    } else {
      // If browser hasn't fired beforeinstallprompt or user is on iOS/unsupported browser, show visual instructions
      setPwaGuideOpen(true);
    }
  };

  const handleAndroidDownload = () => {
    window.location.href = "https://github.com/digilib-kvsulur/digilib-kvsulur/releases/latest/download/PM.SHRI.KV.SULUR.DLMS.apk";
    setApkGuideOpen(true);
  };

  const handleWindowsDownload = () => {
    window.location.href = "https://github.com/digilib-kvsulur/digilib-kvsulur/releases/latest/download/PM.SHRI.KV.SULUR.Digital.Library.Setup.1.0.0.exe";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in duration-300">
      <header className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.history.back()}>
          <ChevronRight className="w-5 h-5 rotate-180" />
          <span className="font-semibold text-slate-800">Back</span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
          Official App Portal
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-8 px-4 md:p-8">
        <div className="max-w-3xl w-full text-center space-y-6 md:space-y-8">
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Take Your Library <span className="text-indigo-600">Everywhere</span>
          </h1>
          <p className="text-sm md:text-lg text-slate-600 max-w-2xl mx-auto px-2">
            Experience the full power of PM SHRI KV SULUR DLMS on your mobile or desktop. 
            Enjoy offline reading, push notifications, and instant study access.
          </p>

          <div className="bg-indigo-50 text-indigo-900 p-4 md:p-6 rounded-2xl border border-indigo-100 shadow-xs inline-block max-w-md mx-auto">
            <h2 className="text-lg md:text-xl font-bold mb-1 flex items-center justify-center gap-2">
              <span className="text-2xl">🎁</span> App Install Bonus!
            </h2>
            <p className="text-indigo-700 font-medium text-xs md:text-sm">
              Add the app to your device & log in to receive a <strong className="text-indigo-900">One-Time 500 Points Gift</strong> instantly!
            </p>
          </div>

          {/* PRIMARY: Featured PWA Install Card */}
          <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-primary text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/50 text-left overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-lg">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-indigo-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Recommended for All Phones & Tablets
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  DigiLib Instant Web App (PWA)
                </h3>
                <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
                  Zero downloads required, uses under 1MB storage, always up-to-date, and delivers instant push notifications directly to your device.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-indigo-200">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Instant 1-tap installation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>No unknown sources needed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Works offline & fast caching</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Real-time push notifications</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
                <Button
                  size="lg"
                  onClick={handlePWAInstall}
                  className="w-full md:w-56 h-12 text-sm sm:text-base font-bold bg-white text-indigo-950 hover:bg-indigo-50 shadow-lg gap-2"
                >
                  <Smartphone className="h-5 w-5 text-indigo-600" />
                  {isInstalled ? "Already Installed" : "Install Web App"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPwaGuideOpen(true)}
                  className="w-full md:w-56 h-9 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1" />
                  How to Install on Mobile
                </Button>
              </div>
            </div>
          </div>

          {/* SECONDARY: Desktop & APK Options */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mt-4">
            {/* Windows Card */}
            <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <Monitor className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">Windows Desktop Client</h3>
              <p className="text-xs text-slate-500 mb-5">Native installer with dedicated desktop shortcut and offline sync.</p>
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-11 text-sm font-bold mt-auto" onClick={handleWindowsDownload}>
                <DownloadIcon className="w-4 h-4" />
                Download Windows EXE
              </Button>
            </div>

            {/* Android APK Card (Secondary option) */}
            <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-lg md:text-xl font-bold text-slate-900">Direct Android APK</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">Manual</span>
              </div>
              <p className="text-xs text-slate-500 mb-5">For devices requiring standalone APK package installation without a browser.</p>
              <Button size="lg" variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 h-11 text-sm font-bold mt-auto" onClick={handleAndroidDownload}>
                <DownloadIcon className="w-4 h-4" />
                Download APK (Manual)
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* PWA Mobile Installation Guide Modal */}
      <Dialog open={pwaGuideOpen} onOpenChange={setPwaGuideOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              📱 Install on Android or iOS
            </DialogTitle>
            <DialogDescription className="text-sm pt-1">
              Installing the Web App takes less than 5 seconds and requires no storage space:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-200 uppercase tracking-wider mb-2">
                On Android (Chrome / Brave / Edge)
              </h4>
              <ol className="text-xs text-indigo-950 dark:text-indigo-300 space-y-2 list-decimal list-inside">
                <li>Tap the <strong>three dots menu (⋮)</strong> at the top right of Chrome.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Confirm <strong>"Install"</strong> — the app icon appears on your home screen immediately!</li>
              </ol>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-2">
                On iPhone & iPad (Safari)
              </h4>
              <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside">
                <li>Tap the <strong>Share button</strong> (square with arrow up) at the bottom.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>"Add"</strong> at the top right corner.</li>
              </ol>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={() => setPwaGuideOpen(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Got It!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct APK Guide Modal */}
      <Dialog open={apkGuideOpen} onOpenChange={setApkGuideOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              📦 APK Installation Guide
            </DialogTitle>
            <DialogDescription className="text-sm pt-1">
              Steps for installing the direct Android APK file:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">1</div>
              <div>
                <h4 className="font-semibold text-xs text-slate-900">Wait for download</h4>
                <p className="text-xs text-slate-600">The APK file is downloading to your device.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">2</div>
              <div>
                <h4 className="font-semibold text-xs text-slate-900">Open the APK file</h4>
                <p className="text-xs text-slate-600">Tap the file in your notification drawer or Downloads folder.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">3</div>
              <div>
                <h4 className="font-semibold text-xs text-slate-900">Allow Unknown Sources</h4>
                <p className="text-xs text-slate-600">If prompted by Android, tap "Settings" and enable "Allow from this source".</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">4</div>
              <div>
                <h4 className="font-semibold text-xs text-slate-900">Install & Claim Bonus</h4>
                <p className="text-xs text-slate-600">Tap "Install". Open the app and log in to receive 500 bonus points automatically!</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={() => setApkGuideOpen(false)} className="w-full">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
