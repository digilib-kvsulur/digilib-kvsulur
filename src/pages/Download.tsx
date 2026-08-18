import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans selection:bg-indigo-500/20">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[140px] animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-pink-600/8 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="font-medium">PM SHRI KV AFS Sulur, Coimbatore</span>
            <span className="hidden sm:inline text-slate-600 mx-2">·</span>
            <span className="hidden sm:flex items-center gap-1.5 font-medium">
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              kvafssulurlibrary@gmail.com
            </span>
          </div>
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold tracking-widest px-2.5 py-1 hidden sm:flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> PM SHRI Designated
          </Badge>
        </div>
      </div>

      {/* Header Nav */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tight leading-tight">PM SHRI KV SULUR</p>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Digital Library System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white text-sm font-semibold transition-colors px-3 py-2 rounded-lg hover:bg-white/5 hidden sm:block">
              Home
            </button>
            <Button
              onClick={() => navigate("/login")}
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl border-0 shadow-lg shadow-indigo-500/20 px-5 h-9"
            >
              Open App <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest rounded-full px-4 py-2 mb-7">
            <Star className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
            Available as a Web App — No App Store Needed
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white mb-6">
            Access DLMS
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mt-2">
              Anywhere, Anytime.
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            The PM SHRI KV Sulur Digital Library Management System (DLMS) is a full web app — install it on your phone or desktop like a native app. No download required from Play Store or App Store.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl border-0 shadow-2xl shadow-indigo-600/30 px-10 py-6 text-base h-auto"
              onClick={() => navigate("/login")}
            >
              <Download className="h-5 w-5 mr-2" /> Open & Install DLMS
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold rounded-2xl px-8 py-6 text-base h-auto"
              onClick={copyLink}
            >
              {copied ? <Check className="h-5 w-5 mr-2 text-emerald-400" /> : <Share2 className="h-5 w-5 mr-2" />}
              {copied ? "Link Copied!" : "Copy App Link"}
            </Button>
          </div>

          {/* URL Copy chip */}
          <div className="inline-flex items-center gap-3 bg-slate-900/80 border border-white/10 rounded-2xl px-5 py-3 text-sm font-mono text-slate-300 shadow-inner">
            <Globe className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="truncate max-w-[260px] sm:max-w-none">{SITE_URL}</span>
            <button onClick={copyLink} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold font-sans shrink-0 ml-1 transition-colors">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      </section>

      {/* Platform Tabs & Steps */}
      <section className="relative z-10 py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">Install in 4 Simple Steps</h2>
            <p className="text-slate-400 text-sm sm:text-base">Works on Android, iPhone, and Desktop — no app store needed.</p>
          </div>

          {/* Platform Selector Tabs */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-slate-900 border border-white/10 rounded-2xl p-1.5 gap-1">
              {(["android", "ios", "desktop"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    platform === p
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
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
                className="relative group bg-slate-900/60 border border-white/8 rounded-2xl p-6 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
              >
                <div className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
                  {idx + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <step.icon className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="text-white font-bold text-sm mb-2">{step.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick access link block */}
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-white font-bold text-sm sm:text-base mb-1">📱 Ready to Install?</p>
              <p className="text-slate-400 text-xs sm:text-sm">
                Open this link in your browser, then follow the steps above to install DLMS on your device.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <code className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-indigo-300 hidden sm:block">
                {SITE_URL}
              </code>
              <Button
                onClick={() => navigate("/login")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl border-0 shadow-lg h-10 px-5 text-sm"
              >
                Open Now <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why PWA — Benefits strip */}
      <section className="relative z-10 py-12 sm:py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Wifi, title: "Works Offline", desc: "Cached resources load even without a network connection.", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
              { icon: Shield, title: "Safe & Secure", desc: "Runs over HTTPS with Supabase-powered Row Level Security.", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { icon: Zap, title: "Lightning Fast", desc: "Optimized Vite build with lazy-loaded routes for instant speed.", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            ].map((b) => (
              <div key={b.title} className={`rounded-2xl border ${b.bg} p-6 flex items-start gap-4`}>
                <div className={`w-11 h-11 rounded-xl ${b.bg} border flex items-center justify-center shrink-0`}>
                  <b.icon className={`h-5 w-5 ${b.color}`} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{b.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="relative z-10 py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">Everything Students Need</h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">A complete gamified library experience — from borrowing books to earning badges and sharing your reading portfolio.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f) => (
              <div key={f.title} className="group bg-slate-900/50 border border-white/8 rounded-2xl p-5 hover:border-white/15 hover:-translate-y-1 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-white font-bold text-sm mb-1.5">{f.title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Code Section */}
      <section className="relative z-10 py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">Scan to Open on Your Phone</h2>
          <p className="text-slate-400 text-sm mb-8">Use any QR scanner or your phone's camera to open the DLMS portal instantly.</p>
          <div className="inline-block bg-white p-4 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-white/5">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(SITE_URL)}&color=4338ca&bgcolor=ffffff&format=png&qzone=1`}
              alt="QR Code for DLMS"
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl"
            />
          </div>
          <p className="text-slate-500 text-xs mt-5 font-mono">{SITE_URL}</p>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative z-10 py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <div className="bg-gradient-to-r from-indigo-600/15 to-purple-600/15 border border-indigo-500/20 rounded-3xl p-10 sm:p-14">
            <Sparkles className="h-10 w-10 mx-auto mb-5 text-amber-400" />
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
              Start Your Reading Journey Today!
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-lg mx-auto">
              Open the DLMS portal, register with your school admission number, and earn XP for every book you read.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl border-0 shadow-2xl shadow-indigo-600/30 px-10 py-6 text-base h-auto"
                onClick={() => navigate("/login")}
              >
                Login / Register Now <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold rounded-2xl px-8 py-6 text-base h-auto"
                onClick={() => navigate("/catalog")}
              >
                Browse Book Catalog <ExternalLink className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-400">PM SHRI KV Sulur DLMS</span>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} KV AFS Sulur Library · All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-500 font-semibold">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => navigate("/catalog")} className="hover:text-white transition-colors">Catalog</button>
            <button onClick={() => navigate("/support")} className="hover:text-white transition-colors">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
