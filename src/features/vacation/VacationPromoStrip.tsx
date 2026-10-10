import { useEffect, useState } from "react";
import { X, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VACATION_BANNER_DISMISS_KEY } from "./constants";
import { useActiveVacationCampaign } from "./api";

interface VacationPromoStripProps {
  onOpen?: () => void;
}

export default function VacationPromoStrip({ onOpen }: VacationPromoStripProps) {
  const { campaign } = useActiveVacationCampaign();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(VACATION_BANNER_DISMISS_KEY) === "1");
  }, []);

  if (!campaign?.banner_enabled || dismissed) return null;

  const go = () => {
    if (campaign.banner_link?.startsWith("http")) {
      window.open(campaign.banner_link, "_blank", "noopener,noreferrer");
      return;
    }
    onOpen?.();
  };

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 px-3 py-2.5 flex items-center gap-3">
      <button type="button" onClick={go} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Sun className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-foreground truncate">
          {campaign.banner_text || campaign.title}
        </p>
      </button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={() => {
          sessionStorage.setItem(VACATION_BANNER_DISMISS_KEY, "1");
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
