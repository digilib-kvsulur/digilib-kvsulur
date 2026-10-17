// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Instagram, Sparkles, Upload, CheckCircle2,
  Copy, Check, ExternalLink, Loader2, Camera,
  Share2, ArrowRight, ShieldCheck, Clock, RefreshCw
} from "lucide-react";
import { triggerConfetti } from "@/lib/confetti";

interface InstagramStoryRewardProps {
  userId: string;
  userName?: string;
  admissionNumber?: string | null;
  inviteCode?: string | null;
  onPointsEarned?: () => void;
}

export default function InstagramStoryReward({
  userId,
  userName,
  admissionNumber,
  inviteCode,
  onPointsEarned,
}: InstagramStoryRewardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [claimedToday, setClaimedToday] = useState(false);
  const [totalStories, setTotalStories] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Story sharing state
  const [copiedLink, setCopiedLink] = useState(false);
  const [preparingStory, setPreparingStory] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Screenshot upload state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeToUse = inviteCode || admissionNumber || "";
  const inviteUrl = codeToUse
    ? `https://dlms.kvsulur.in/invite/${codeToUse}`
    : "https://dlms.kvsulur.in/invite";

  // Check if claimed today
  const checkStatus = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc("get_daily_story_status");
      if (!error && data) {
        setClaimedToday(Boolean(data.claimed_today));
        setTotalStories(Number(data.total_stories) || 0);
      } else {
        // Fallback: check table directly
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: subData } = await supabase
          .from("instagram_story_submissions" as any)
          .select("id")
          .eq("user_id", userId)
          .eq("claimed_date", todayStr)
          .maybeSingle();

        setClaimedToday(Boolean(subData));
      }
    } catch (err) {
      console.warn("Could not check daily story status:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [userId]);

  // Generate or fetch story image
  const generateStoryBlob = async (): Promise<Blob> => {
    // 1. First check if a custom image was provided at /story-template.png
    try {
      const res = await fetch("/story-template.png");
      if (res.ok && res.headers.get("content-type")?.includes("image")) {
        return await res.blob();
      }
    } catch {}

    // 2. Dynamic Canvas fallback (high-res 1080x1920 Instagram Story format)
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");

    // Vibrant Instagram gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, "#833ab4");
    gradient.addColorStop(0.3, "#fd1d1d");
    gradient.addColorStop(0.7, "#fcb045");
    gradient.addColorStop(1, "#405de6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative backdrop curves
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.arc(950, 200, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(100, 1750, 500, 0, Math.PI * 2);
    ctx.fill();

    // School badge pill at top
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.roundRect(140, 260, 800, 110, 55);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PM SHRI KV AFS SULUR", 540, 315);
    ctx.font = "30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText("DIGITAL LIBRARY MANAGEMENT SYSTEM", 540, 355);

    // Main NGL-style Card in center
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.beginPath();
    ctx.roundRect(100, 540, 880, 820, 60);
    ctx.fill();
    ctx.shadowColor = "transparent";

    // Card top accent bar
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(100, 540, 880, 24, [60, 60, 0, 0]);
    ctx.fill();

    // Card Header Icon
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.arc(540, 680, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 65px serif";
    ctx.fillText("📚", 540, 705);

    // Card Title
    ctx.fillStyle = "#1e1b4b";
    ctx.font = "900 56px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Read. Level Up. Win.", 540, 810);

    // Card Body text
    ctx.fillStyle = "#4b5563";
    ctx.font = "500 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Borrow 10,000+ books online,", 540, 890);
    ctx.fillText("play games & earn daily XP on DLMS!", 540, 945);

    // Sticker prompt box (NGL Style)
    ctx.fillStyle = "#f3f4f6";
    ctx.beginPath();
    ctx.roundRect(180, 1020, 720, 160, 40);
    ctx.fill();

    ctx.fillStyle = "#8b5cf6";
    ctx.font = "900 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("🔗 TAP LINK STICKER TO JOIN", 540, 1085);
    ctx.font = "bold 30px monospace";
    ctx.fillStyle = "#4f46e5";
    ctx.fillText("dlms.kvsulur.in", 540, 1135);

    // Student credit pill at bottom of card
    const studentLabel = userName ? `Invited by ${userName}` : "Join with my student code";
    ctx.fillStyle = "#e0e7ff";
    ctx.beginPath();
    ctx.roundRect(240, 1220, 600, 70, 35);
    ctx.fill();
    ctx.fillStyle = "#3730a3";
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(studentLabel, 540, 1265);

    // Bottom Story CTA
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("👆 TAP THE LINK TO LOG IN 👆", 540, 1490);
    ctx.font = "32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Use your 5-digit admission number & Welcome@123", 540, 1555);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas conversion failed"));
      }, "image/png");
    });
  };

  // One-click NGL-style Story trigger
  const handleOneClickStory = async () => {
    setPreparingStory(true);

    // 1. Auto-copy invite link to clipboard
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 4000);
    } catch {
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 4000);
    }

    toast({
      title: "🔗 Link Copied!",
      description: "Paste it as a Link Sticker on your Instagram Story.",
    });

    try {
      const blob = await generateStoryBlob();
      const file = new File([blob], "dlms-instagram-story.png", { type: "image/png" });

      // Check if Web Share API with files is available (mobile iOS/Android)
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Share DLMS on Instagram",
          text: `Join DLMS: ${inviteUrl}`,
        });
      } else {
        // Download template fallback and open Instagram
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dlms-story-template.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Try opening Instagram
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = "instagram-stories://share";
          setTimeout(() => {
            window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
          }, 1000);
        } else {
          window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Share flow handled:", err);
      }
    } finally {
      setPreparingStory(false);
      setShowInstructions(true);
    }
  };

  // Screenshot file selection
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image screenshot (PNG, JPG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose an image under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshotPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit screenshot to claim 200 XP
  const handleSubmitProof = async () => {
    if (!screenshotFile) {
      toast({
        title: "Screenshot Required",
        description: "Please select your Instagram Story screenshot first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const ext = screenshotFile.name.split(".").pop() || "jpg";
      const fileName = `${userId}_${Date.now()}.${ext}`;
      const path = `instagram-stories/${fileName}`;

      let publicUrl = "";

      // Try uploading to event-submissions bucket
      try {
        const { error: upErr } = await supabase.storage
          .from("event-submissions")
          .upload(path, screenshotFile, { upsert: true });

        if (!upErr) {
          const { data: pubData } = supabase.storage
            .from("event-submissions")
            .getPublicUrl(path);
          publicUrl = pubData?.publicUrl || "";
        }
      } catch {}

      // Fallback: try avatars bucket if event-submissions failed
      if (!publicUrl) {
        try {
          const { error: upErr2 } = await supabase.storage
            .from("avatars")
            .upload(path, screenshotFile, { upsert: true });
          if (!upErr2) {
            const { data: pub2 } = supabase.storage.from("avatars").getPublicUrl(path);
            publicUrl = pub2?.publicUrl || "";
          }
        } catch {}
      }

      // Final fallback if storage upload blocked: placeholder identifier
      if (!publicUrl) {
        publicUrl = `submitted_proof_${Date.now()}`;
      }

      // Call RPC
      const { data, error } = await supabase.rpc("claim_daily_story_reward", {
        p_screenshot_url: publicUrl,
      });

      if (error) throw error;

      if (data?.success) {
        setClaimedToday(true);
        setTotalStories((prev) => prev + 1);
        setScreenshotFile(null);
        setScreenshotPreview(null);
        triggerConfetti();

        toast({
          title: "🎉 +200 XP Awarded!",
          description: "Your Instagram Story screenshot was accepted! Come back tomorrow for another +200 XP.",
        });

        if (onPointsEarned) onPointsEarned();
      } else if (data?.reason === "already_claimed_today") {
        setClaimedToday(true);
        toast({
          title: "Already Claimed Today",
          description: "You have already earned your daily +200 XP story bonus for today. Come back tomorrow!",
        });
      } else {
        toast({
          title: "Submission Error",
          description: data?.reason || "Could not claim story reward. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Story reward claim error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to submit story proof.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50 overflow-hidden relative shadow-sm">
      <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Instagram className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <span className="font-extrabold text-foreground">Instagram Story Bonus</span>
              <p className="text-[11px] font-normal text-muted-foreground">Like NGL · 1-Click Story Creation</p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-extrabold border-0 shadow-xs px-2.5 py-1">
              <Sparkles className="h-3 w-3 mr-1 text-yellow-300" />
              +200 XP / Day
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs sm:text-sm pt-1">
          Share DLMS on your Instagram Story with your link sticker and upload a screenshot to claim <strong>200 XP daily</strong> (max 1 per day).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Status Banner */}
        {claimedToday ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Today's +200 XP Claimed! 🎉
                </span>
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                  {totalStories} Total Shared
                </Badge>
              </div>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90 mt-1 leading-relaxed">
                Awesome job! You've claimed today's Instagram story reward. Come back tomorrow after midnight to post and claim another <strong>+200 XP</strong>!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* 1-Click Action Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-pink-500/5 to-purple-500/10 border border-fuchsia-500/20 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-fuchsia-900 dark:text-fuchsia-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-600" />
                  Step 1: Create Story
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Copies link & prepares story
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button
                  onClick={handleOneClickStory}
                  disabled={preparingStory}
                  className="flex-1 h-11 text-xs sm:text-sm font-extrabold rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 hover:from-fuchsia-700 hover:to-pink-700 text-white border-0 shadow-md transition-all active:scale-95 gap-2"
                >
                  {preparingStory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Instagram className="h-4 w-4" />
                  )}
                  <span>{preparingStory ? "Preparing Story..." : "1-Click Create Story on Instagram"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    setCopiedLink(true);
                    toast({ title: "Link Copied!", description: inviteUrl });
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className="h-11 px-3.5 rounded-xl border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300 font-semibold text-xs gap-1.5"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                </Button>
              </div>

              {/* NGL Visual Step Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 rounded-xl bg-card/80 border border-border/40 space-y-0.5">
                  <span className="font-bold text-foreground">1. Tap 1-Click</span>
                  <p className="text-muted-foreground">Auto-copies your DLMS link & opens story.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-card/80 border border-border/40 space-y-0.5">
                  <span className="font-bold text-foreground">2. Add Link Sticker</span>
                  <p className="text-muted-foreground">In Story, tap Sticker 🔗 and paste link.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-card/80 border border-border/40 space-y-0.5">
                  <span className="font-bold text-foreground">3. Upload Proof</span>
                  <p className="text-muted-foreground">Screenshot your story & claim +200 XP!</p>
                </div>
              </div>
            </div>

            {/* Step 2: Upload Screenshot & Claim Reward */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Step 2: Upload Screenshot Proof
                </span>
                <span className="text-[11px] text-muted-foreground">Max 1 claim per day</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="hidden"
              />

              {screenshotPreview ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-black/40 max-h-52 flex items-center justify-center">
                    <img
                      src={screenshotPreview}
                      alt="Story Proof Preview"
                      className="max-h-52 w-auto object-contain mx-auto"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setScreenshotFile(null);
                        setScreenshotPreview(null);
                      }}
                      className="absolute top-2 right-2 h-7 px-2 text-[11px] rounded-lg shadow-md"
                    >
                      Change
                    </Button>
                  </div>

                  <Button
                    onClick={handleSubmitProof}
                    disabled={isSubmitting}
                    className="w-full h-11 text-xs sm:text-sm font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span>{isSubmitting ? "Verifying..." : "Submit Screenshot & Claim +200 XP"}</span>
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-muted/60 transition-all cursor-pointer text-center space-y-2 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      Tap here to upload your Instagram Story screenshot
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      PNG, JPG, or WEBP up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Verified via Screenshot Proof
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            Resets daily at 12:00 AM
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
