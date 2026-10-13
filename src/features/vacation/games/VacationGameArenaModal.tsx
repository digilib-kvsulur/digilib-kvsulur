import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VacationGameProps } from "./types";
import SteamPhysicsGame from "./SteamPhysicsGame";
import DigitalQuestGame from "./DigitalQuestGame";
import EcoSortGame from "./EcoSortGame";
import CyberDefenderGame from "./CyberDefenderGame";
import SpeechSparkGame from "./SpeechSparkGame";
import HistoryDetectiveGame from "./HistoryDetectiveGame";
import MathMarathonGame from "./MathMarathonGame";
import CreativeCanvasGame from "./CreativeCanvasGame";
import CodeBreakersGame from "./CodeBreakersGame";
import FuturePitchGame from "./FuturePitchGame";

interface VacationGameArenaModalProps {
  open: boolean;
  dayNumber: number;
  dayTitle: string;
  campaignId?: string;
  activityId?: string;
  studentName?: string;
  onClose: () => void;
  onComplete: (result: {
    score: number;
    maxScore: number;
    stars: 1 | 2 | 3;
    summary: string;
    details?: Record<string, any>;
    artworkDataUrl?: string;
  }) => void;
}

export default function VacationGameArenaModal({
  open,
  dayNumber,
  dayTitle,
  campaignId,
  activityId,
  studentName,
  onClose,
  onComplete,
}: VacationGameArenaModalProps) {
  const renderGame = () => {
    const props: VacationGameProps = {
      dayNumber,
      dayTitle,
      campaignId,
      activityId,
      studentName,
      onClose,
      onComplete,
    };

    switch (dayNumber) {
      case 1:
        return <SteamPhysicsGame {...props} />;
      case 2:
        return <DigitalQuestGame {...props} />;
      case 3:
        return <EcoSortGame {...props} />;
      case 4:
        return <CyberDefenderGame {...props} />;
      case 5:
        return <SpeechSparkGame {...props} />;
      case 6:
        return <HistoryDetectiveGame {...props} />;
      case 7:
        return <MathMarathonGame {...props} />;
      case 8:
        return <CreativeCanvasGame {...props} />;
      case 9:
        return <CodeBreakersGame {...props} />;
      case 10:
        return <FuturePitchGame {...props} />;
      default:
        return <SteamPhysicsGame {...props} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Day {dayNumber}: {dayTitle}</DialogTitle>
        </DialogHeader>
        {renderGame()}
      </DialogContent>
    </Dialog>
  );
}
