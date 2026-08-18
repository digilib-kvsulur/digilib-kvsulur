import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download as DownloadIcon, Smartphone, Monitor, ChevronRight } from "lucide-react";

export default function Download() {
  const [guideOpen, setGuideOpen] = useState(false);

  const handleAndroidDownload = () => {
    // Open the download link
    window.location.href = "https://github.com/digilib-kvsulur/digilib-kvsulur/releases/latest/download/PM.SHRI.KV.SULUR.DLMS.apk";
    // Show the guide
    setGuideOpen(true);
  };

  const handleWindowsDownload = () => {
    window.location.href = "https://github.com/digilib-kvsulur/digilib-kvsulur/releases/latest/download/PM.SHRI.KV.SULUR.Digital.Library.Setup.1.0.0.exe";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.history.back()}>
          <ChevronRight className="w-5 h-5 rotate-180" />
          <span className="font-semibold text-slate-800">Back</span>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Take Your Library <span className="text-indigo-600">Everywhere</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Experience the full power of PM SHRI KV SULUR DLMS on your favorite device. 
            Enjoy offline features, instant notifications, and seamless studying.
          </p>

          <div className="bg-indigo-100 text-indigo-800 p-6 rounded-2xl shadow-sm border border-indigo-200 inline-block">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <span className="text-3xl">🎁</span> Native App Bonus!
            </h2>
            <p className="text-indigo-700 font-medium text-lg">
              Install the app and log in to receive a <strong className="text-indigo-900">One-Time 500 Points Gift</strong> instantly!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
            {/* Android Card */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Android App</h3>
              <p className="text-slate-500 mb-8">Best experience for mobile users. Fast, light, and reliable.</p>
              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 gap-2" onClick={handleAndroidDownload}>
                <DownloadIcon size={20} />
                Download APK
              </Button>
            </div>

            {/* Windows Card */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Monitor size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Windows App</h3>
              <p className="text-slate-500 mb-8">Perfect for desktop studying and large screen reading.</p>
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleWindowsDownload}>
                <DownloadIcon size={20} />
                Download EXE
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              📱 Android Installation Guide
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Follow these simple steps to install the app on your Android device:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <h4 className="font-semibold text-slate-900">Wait for download</h4>
                <p className="text-sm text-slate-600">The APK file is downloading to your device.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <h4 className="font-semibold text-slate-900">Open the file</h4>
                <p className="text-sm text-slate-600">Tap on the downloaded file in your notification panel or Downloads folder.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">3</div>
              <div>
                <h4 className="font-semibold text-slate-900">Allow Unknown Sources</h4>
                <p className="text-sm text-slate-600">If prompted, tap "Settings" and enable "Allow from this source" to permit the installation.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">4</div>
              <div>
                <h4 className="font-semibold text-slate-900">Install & Claim Bonus</h4>
                <p className="text-sm text-slate-600">Tap "Install". Once complete, open the app, log in, and your 500 bonus points will be added automatically!</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={() => setGuideOpen(false)} className="w-full">Got it!</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
