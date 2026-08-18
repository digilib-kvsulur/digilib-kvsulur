import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, Sparkles, MapPin, Mail, Star, Download,
  Monitor, Smartphone, Tablet, Chrome, Apple, Share2,
  ChevronRight, Zap, Award, BarChart3, Trophy, Target,
  Wifi, Shield, ArrowRight, Check, Globe, ExternalLink,
  PlusSquare, MoreHorizontal, Layout
} from "lucide-react";

const steps = {
  android: [
    { icon: Chrome, title: "Open in Chrome", desc: "Visit the DLMS URL using Google Chrome on your Android device." },
    { icon: MoreHorizontal, title: "Tap the 3-dot menu", desc: "Look for the ⋮ kebab menu icon at the top-right corner of Chrome." },
    { icon: PlusSquare, title: "Select 'Add to Home Screen'", desc: "Tap \"Add to Home Screen\" in the dropdown options and confirm." },
    { icon: Layout, title: "Launch from Home Screen", desc: "The DLMS app icon will appear on your home screen — tap it to open!" },
  ],
  ios: [
    { icon: Globe, title: "Open in Safari", desc: "Visit the DLMS URL using Apple Safari on your iPhone or iPad." },
    { icon: Share2, title: "Tap the Share button", desc: "Look for the square-with-arrow Share icon at the bottom of Safari." },
    { icon: PlusSquare, title: "Add to Home Screen", desc: "Scroll and tap \"Add to Home Screen\" then confirm by tapping 'Add'." },
    { icon: Layout, title: "Launch from Home Screen", desc: "Find the DLMS icon on your home screen and tap to open it anytime!" },
  ],
  desktop: [
    { icon: Chrome, title: "Open in Chrome or Edge", desc: "Visit the DLMS link in Google Chrome or Microsoft Edge browser." },
    { icon: Monitor, title: "Look for Install icon", desc: "Click the install icon (⊕) visible in the browser's address bar." },
    { icon: PlusSquare, title: "Click Install", desc: "Confirm the prompt to install the DLMS app on your computer." },
    { icon: Layout, title: "Open from Desktop", desc: "Find the DLMS shortcut in your Start Menu or Desktop and launch it!" },
  ],
};

const features = [
  { icon: BookOpen, title: "Digital Catalog", desc: "Browse thousands of books, request loans, and track your collection.", color: "from-blue-500 to-indigo-500" },
  { icon: Trophy, title: "Leaderboard & XP", desc: "Earn XP for every book read, quiz passed, and daily streak.", color: "from-amber-500 to-orange-500" },
  { icon: BarChart3, title: "Reading Analytics", desc: "Visual heatmaps, progress charts, and badge milestones.", color: "from-emerald-500 to-teal-500" },
  { icon: Zap, title: "Daily Streaks", desc: "Maintain your login streak and build consistent reading habits.", color: "from-rose-500 to-pink-500" },
  { icon: Target, title: "Monthly Challenges", desc: "Join school-wide reading marathons and complete missions.", color: "from-purple-500 to-violet-500" },
  { icon: Award, title: "Badges & Portfolios", desc: "Unlock badges, share your portfolio with a unique link.", color: "from-cyan-500 to-blue-500" },
];

const SITE_URL = window.location.origin;
const REPO_URL = "https://github.com/digilib-kvsulur/digilib-kvsulur";

export default function DownloadPage() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("android");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|iphone|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(SITE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const currentSteps = steps[platform];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-150/30 blur-[130px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-150/30 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 border-b border-indigo-100 bg-indigo-50/80 text-xs backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6 text-slate-600">
            <span className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-indigo-600 shrink-0" /> PM SHRI KV AFS Sulur, Coimbatore
            </span>
            <span className="h-3.5 w-px bg-slate-300 hidden md:block" />
            <span className="flex items-center gap-2 hidden md:flex font-medium">
              <Mail className="h-4 w-4 text-indigo-600" /> kvafssulurlibrary@gmail.com
            </span>
          </div>
          <span className="flex items-center gap-2 text-indigo-900 font-bold px-3 py-1 bg-white/60 rounded-full border border-indigo-100 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> PM SHRI National Excellence School
          </span>
        </div>
      </div>

      {/* Header Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-xs">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain p-1" />
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-xs z-10">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain p-1" />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 tracking-tight leading-tight">PM SHRI KV SULUR</p>
              <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">Digital Library System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-slate-600 hover:text-indigo-600 text-sm font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 hidden sm:block">
              Home
            </button>
            <Button
              onClick={() => navigate("/login")}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl border-0 shadow-md shadow-indigo-600/20 px-5 h-9"
            >
              Open App <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest rounded-full px-4 py-1.5 mb-6 shadow-xs">
            <Star className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600" />
            Native Apps & Packages Generated by GitHub Actions
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none text-slate-900 mb-6">
            Get the Native Apps for
            <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mt-2">
              Windows & Android.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed mb-8">
            Download KVSulur Digital Library installer for Windows to access from your PC, or get the direct Android APK package compiled securely through GitHub Actions builds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <Button
              onClick={copyLink}
              variant="outline"
              className="w-full border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-2xl h-12 shadow-sm"
            >
              {copied ? <Check className="h-4 w-4 mr-2 text-emerald-600 animate-bounce" /> : <Share2 className="h-4 w-4 mr-2 text-indigo-600" />}
              {copied ? "Link Copied!" : "Copy App Link"}
            </Button>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-12 shadow-md shadow-indigo-600/20"
            >
              Launch Web Portal <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* GitHub Native Apps Section */}
      <section className="relative z-10 py-8 mb-12">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Windows EXE Installer */}
            <Card className="border-indigo-100 bg-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <CardContent className="p-6 sm:p-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
                  <Monitor className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Windows Desktop Application</h2>
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-150 mb-4 hover:bg-indigo-55">EXE Installer</Badge>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  Access the digital library natively on Windows with persistent logins, automatic background updates, and optimized multi-window layouts.
                </p>
                <div className="space-y-3">
                  <a
                    href={`${REPO_URL}/releases/latest/download/PM.SHRI.KV.SULUR.Digital.Library.Setup.1.0.0.exe`}
                    className="w-full inline-flex items-center justify-center gap-2 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Download className="h-4 w-4" /> Download Windows App (.exe)
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Android APK package */}
            <Card className="border-purple-100 bg-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
              <CardContent className="p-6 sm:p-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-6">
                  <Smartphone className="h-6 w-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Android Mobile Package</h2>
                <Badge className="bg-purple-50 text-purple-700 border border-purple-150 mb-4 hover:bg-purple-55">APK Package</Badge>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  Get the compiled application archive directly. Installs on any Android tablet or mobile phone without checking store accounts.
                </p>
                <div className="space-y-3">
                  <a
                    href={`${REPO_URL}/releases/latest/download/app-debug.apk`}
                    className="w-full inline-flex items-center justify-center gap-2 h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-600/20"
                  >
                    <Download className="h-4 w-4" /> Download Android App (.apk)
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Tabs & Steps */}
      <section className="relative z-10 py-12 sm:py-16 border-t border-slate-200 bg-white/70">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">PWA Alternative Installation</h2>
            <p className="text-slate-500 text-sm">Add the DLMS web portal straight to your home screen instantly.</p>
          </div>

          {/* Platform Selector Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-slate-100 border border-slate-200 rounded-2xl p-1 gap-1">
              {(["android", "ios", "desktop"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    platform === p
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {p === "android" && <Smartphone className="h-4 w-4" />}
                  {p === "ios" && <Apple className="h-4 w-4" />}
                  {p === "desktop" && <Monitor className="h-4 w-4" />}
                  {p === "android" ? "Android" : p === "ios" ? "iPhone / iPad" : "Desktop / PC"}
                </button>
              ))}
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {currentSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 transition-all shadow-sm"
              >
                <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {idx + 1}
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <step.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-slate-800 font-bold text-sm mb-2">{step.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefit Cards */}
      <section className="relative z-10 py-12 sm:py-16 border-t border-slate-200 bg-slate-50/50">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Wifi, title: "Offline Storage Support", desc: "Check books, access local reading logs, and show your ID card without internet access.", color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
              { icon: Shield, title: "Secure Communications", desc: "Data synchronization powered by HTTPS standard and Supabase RLS protocols.", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { icon: Zap, title: "Zero Latency Layouts", desc: "Extremely fast loads and fluid tabs optimized for responsive layout targets.", color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
            ].map((b) => (
              <div key={b.title} className={`rounded-2xl border ${b.bg} p-5 flex items-start gap-4 shadow-xs`}>
                <div className={`w-10 h-10 rounded-xl bg-white border flex items-center justify-center shrink-0`}>
                  <b.icon className={`h-5 w-5 ${b.color}`} />
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-1">{b.title}</p>
                  <p className="text-slate-550 text-xs leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Code Section */}
      <section className="relative z-10 py-12 border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Scan to Open</h2>
          <p className="text-slate-500 text-sm mb-6">Open this QR code to load the app directly on your phone camera.</p>
          <div className="inline-block bg-white p-3 rounded-2xl shadow-md border border-slate-200">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(SITE_URL)}&color=4f46e5&bgcolor=ffffff&format=png&qzone=1`}
              alt="QR Code for DLMS"
              className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl"
            />
          </div>
          <p className="text-slate-500 text-xs mt-4 font-mono">{SITE_URL}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center -space-x-1.5 shrink-0">
              <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-250 flex items-center justify-center overflow-hidden">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-250 flex items-center justify-center overflow-hidden z-10">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain p-0.5" />
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500">PM SHRI KV Sulur DLMS</span>
          </div>
          <p className="text-slate-500 text-xs">© {new Date().getFullYear()} KV AFS Sulur Library · All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-500 font-semibold">
            <button onClick={() => navigate("/")} className="hover:text-indigo-600 transition-colors">Home</button>
            <button onClick={() => navigate("/catalog")} className="hover:text-indigo-600 transition-colors">Catalog</button>
            <button onClick={() => navigate("/support")} className="hover:text-indigo-600 transition-colors">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
