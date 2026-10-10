import { ChevronRight, Sparkles, Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveVacationCampaign } from "./api";

interface VacationOverviewBannerProps {
  onOpen: () => void;
}

export default function VacationOverviewBanner({ onOpen }: VacationOverviewBannerProps) {
  const { campaign } = useActiveVacationCampaign();
  if (!campaign) return null;

  return (
    <Card
      className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-primary/10 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
      onClick={onOpen}
    >
      <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
            <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                10-Day Vacation Challenge
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Daily activities + streak bonus
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-foreground truncate">{campaign.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {campaign.banner_text || "Complete today's activity, keep your streak, and climb the standings."}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md gap-1.5 shrink-0 h-9 sm:h-10 text-xs sm:text-sm"
        >
          <span>Open Vacation</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
