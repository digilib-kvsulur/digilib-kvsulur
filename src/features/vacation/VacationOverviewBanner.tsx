import { ChevronRight, Flame, Sparkles, Sun } from "lucide-react";
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

  return (
    <Card
      className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
      onClick={onOpen}
    >
      <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
            <Sun className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/25 px-2.5 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" /> Play • Learn • Grow
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> 10 Days • 10 Challenges
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-black text-foreground truncate">{campaign.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {campaign.banner_text || "Complete today's challenge, keep your daily streak alive, and win points!"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <VacationCountdownTimer compact label="Today's Challenge Closes In" />
          <Button
            size="sm"
            className="w-full sm:w-auto rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md gap-1.5 shrink-0 h-9 sm:h-10 text-xs sm:text-sm"
          >
            <span>Play Today</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
