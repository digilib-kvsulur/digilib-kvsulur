import { ChevronRight, Flame, Sparkles, Sun, Trophy, Users, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveVacationCampaign } from "./api";
import VacationCountdownTimer from "./VacationCountdownTimer";

interface VacationOverviewBannerProps {
  onOpen: () => void;
}

export default function VacationOverviewBanner({ onOpen }: VacationOverviewBannerProps) {
  const { campaign } = useActiveVacationCampaign();
  if (!campaign) return null;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isUpcoming = campaign.start_date > todayStr;
  const isEnded = campaign.end_date < todayStr;

  return (
    <Card
      className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group relative"
      onClick={onOpen}
    >
      {/* Decorative ambient glowing background orbs */}
      <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

      <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3 sm:gap-3.5 relative z-10">
        {/* Top Header Row: Festival Label & Status Badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5 shadow-xs">
              <Sun className="h-3.5 w-3.5 text-amber-400 animate-spin-slow" />
              <span>Autumn Break &apos;26</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-200">10 Days</span>
            </span>

            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-white bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1 shadow-xs">
              <Zap className="h-3 w-3 text-amber-300 fill-amber-300" />
              <span>1 Pt = 5 XP</span>
            </span>
          </div>

          <div>
            {isUpcoming ? (
              <span className="text-[11px] sm:text-xs font-bold text-white bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/25 flex items-center gap-1.5 shadow-xs">
                <span>📅 Starts {campaign.start_date}</span>
              </span>
            ) : isEnded ? (
              <span className="text-[11px] sm:text-xs font-bold text-white/80 bg-black/40 px-3 py-1 rounded-full border border-white/20">
                Festival Concluded
              </span>
            ) : (
              <span className="text-[11px] sm:text-xs font-black text-emerald-950 bg-emerald-400 px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                <span>Active Today</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Title & Description */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 group-hover:rotate-3 transition-transform mt-0.5">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300 fill-amber-300" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug drop-shadow-sm tracking-tight">
                {campaign.title || "Autumn Break Challenge 2026"}
              </h3>
              <p className="text-xs sm:text-sm text-white/90 line-clamp-2 leading-relaxed font-medium">
                {campaign.banner_text || "10 Days of STEAM, AI, Eco & Story Quests • Earn up to 1,000 Points & 5,000 XP! Compete Solo or in Teams."}
              </p>
            </div>
          </div>

          {/* Quick Perks Ribbon on Mobile / Tablet */}
          <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] sm:text-xs font-bold text-amber-100">
            <span className="flex items-center gap-1 bg-black/20 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-white/10">
              <Trophy className="h-3 w-3 text-amber-300" /> 1,000 Pts
            </span>
            <span className="flex items-center gap-1 bg-black/20 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-white/10">
              <Users className="h-3 w-3 text-amber-300" /> Teams (2–4) or Solo
            </span>
            <span className="flex items-center gap-1 bg-black/20 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-white/10">
              <Sparkles className="h-3 w-3 text-amber-300" /> 10 Practice Labs
            </span>
          </div>
        </div>

        {/* Bottom Action Bar: Countdown Capsule + High-Contrast Tactile Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/15">
          <div className="flex items-center">
            {isUpcoming ? (
              <VacationCountdownTimer
                compact
                variant="glass"
                mode="start"
                targetTime={campaign.start_date}
                label="Festival Starts In"
              />
            ) : isEnded ? (
              <span className="text-xs font-semibold text-white/70 px-2.5 py-1 bg-black/20 rounded-full border border-white/10">
                Festival Ended
              </span>
            ) : (
              <VacationCountdownTimer
                compact
                variant="glass"
                mode="end"
                targetTime={campaign.end_date}
                label="Daily Window Closes In"
              />
            )}
          </div>

          <Button
            size="sm"
            className="rounded-xl font-black bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 shadow-lg gap-1.5 h-10 px-5 text-xs sm:text-sm shrink-0 border-0 transition-all self-end sm:self-auto w-full sm:w-auto"
          >
            <span>{isUpcoming ? "Preview Events & Form Teams" : isEnded ? "View Festival Highlights" : "Enter Arena & Play Today"}</span>
            <ChevronRight className="h-4 w-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
