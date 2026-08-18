import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Smartphone, Apple, ArrowRight, Share2, PlusSquare, Layout, Globe } from "lucide-react";
import { fetchDownloadUrls } from "@/lib/librarySettings";

const REPO_URL = "https://github.com/digilib-kvsulur/digilib-kvsulur";

export default function DownloadPage() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<"android" | "ios" | "windows" | "mac" | "other">("other");
  const [urls, setUrls] = useState({ apkUrl: "", exeUrl: "" });

  useEffect(() => {
    fetchDownloadUrls().then(setUrls).catch(console.error);

    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|iphone|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else if (/win/.test(ua)) setPlatform("windows");
    else if (/mac/.test(ua)) setPlatform("mac");
    else setPlatform("other");
  }, []);

  const finalApkUrl = urls.apkUrl || `${REPO_URL}/releases/latest/download/app-debug.apk`;
  const finalExeUrl = urls.exeUrl || `${REPO_URL}/releases/latest/download/PM.SHRI.KV.SULUR.Digital.Library.Setup.1.0.0.exe`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800">
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6 shadow-sm">
        {platform === "windows" && <Monitor className="h-8 w-8 text-indigo-600" />}
        {platform === "android" && <Smartphone className="h-8 w-8 text-indigo-600" />}
        {(platform === "ios" || platform === "mac") && <Apple className="h-8 w-8 text-indigo-600" />}
        {platform === "other" && <Monitor className="h-8 w-8 text-indigo-600" />}
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Download DLMS</h1>
      <p className="text-slate-500 mb-10 max-w-md">
        Get the best experience tailored for your device.
      </p>

      {platform === "windows" && (
        <div className="space-y-4 w-full max-w-sm">
          <a
            href={finalExeUrl}
            className="w-full inline-flex items-center justify-center gap-2 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-indigo-600/25"
          >
            <Download className="h-5 w-5" /> Download for Windows (.exe)
          </a>
        </div>
      )}

      {platform === "android" && (
        <div className="space-y-4 w-full max-w-sm">
          <a
            href={finalApkUrl}
            className="w-full inline-flex items-center justify-center gap-2 h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-purple-600/25"
          >
            <Download className="h-5 w-5" /> Download for Android (.apk)
          </a>
        </div>
      )}

      {platform === "ios" && (
        <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-left">
          <h3 className="font-bold text-slate-800 mb-4 text-center">Install on iPhone/iPad</h3>
          <ul className="space-y-4 text-sm text-slate-600">
            <li className="flex items-center gap-3"><Globe className="h-5 w-5 text-indigo-500 shrink-0" /> Open this page in Safari</li>
            <li className="flex items-center gap-3"><Share2 className="h-5 w-5 text-indigo-500 shrink-0" /> Tap the Share icon (square with arrow)</li>
            <li className="flex items-center gap-3"><PlusSquare className="h-5 w-5 text-indigo-500 shrink-0" /> Select "Add to Home Screen"</li>
            <li className="flex items-center gap-3"><Layout className="h-5 w-5 text-indigo-500 shrink-0" /> Launch DLMS from your home screen</li>
          </ul>
        </div>
      )}

      {platform === "mac" && (
        <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Use the Web App</h3>
          <p className="text-sm text-slate-500 mb-6">
            Currently, there is no native Mac app. You can use the web app directly in your browser.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-12 shadow-md shadow-indigo-600/20"
          >
            Launch Web App <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {platform === "other" && (
        <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Unsupported Device</h3>
          <p className="text-sm text-slate-500 mb-6">
            Please use the web app on this device, or visit this page on Windows or Android to download the native apps.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-12 shadow-md shadow-indigo-600/20"
          >
            Launch Web App <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <div className="mt-12 text-center">
        <Button variant="ghost" onClick={() => navigate("/")} className="text-slate-500 hover:text-indigo-600">
          Return to Home
        </Button>
      </div>
    </div>
  );
}
