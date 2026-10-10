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

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isUpcoming = campaign.start_date > todayStr;
  const isEnded = campaign.end_date < todayStr;

  return (
    <Card
      className="rounded-2xl sm:rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-primary/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer group"
      onClick={onOpen}
    >
      <CardContent className="p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Main Content */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform mt-0.5">
            <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" /> Play • Learn • Grow
              </span>
              {isUpcoming ? (
                <span className="text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/25 flex items-center gap-1">
                  📅 Starts {campaign.start_date}
                </span>
              ) : isEnded ? (
                <span className="text-[11px] sm:text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                  Completed
                </span>
              ) : (
                <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live Now
                </span>
              )}
            </div>

            <h4 className="text-sm sm:text-base md:text-lg font-black text-foreground leading-snug line-clamp-2">
              {campaign.title}
            </h4>

            {campaign.banner_text && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {campaign.banner_text}
              </p>
            )}
          </div>
        </div>

        {/* Action & Timer Row: On mobile, side-by-side; on desktop, aligned on right */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-500/15 shrink-0">
          {isUpcoming ? (
            <VacationCountdownTimer
              compact
              mode="start"
              targetTime={campaign.start_date}
              label="Campaign Starts In"
            />
          ) : isEnded ? (
            <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded-full">
              Campaign Ended
            </span>
          ) : (
            <VacationCountdownTimer
              compact
              mode="end"
              targetTime={campaign.end_date}
              label="Campaign Window"
            />
          )}

          <Button
            size="sm"
            className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm gap-1 h-8 sm:h-9 px-3 text-xs shrink-0"
          >
            <span>{isUpcoming ? "Preview Events" : isEnded ? "View Highlights" : "Play Today"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
