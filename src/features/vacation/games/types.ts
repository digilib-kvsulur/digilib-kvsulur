export interface VacationGameProps {
  dayNumber: number;
  dayTitle: string;
  campaignId?: string;
  activityId?: string;
  studentName?: string;
  onComplete: (result: {
    score: number;
    maxScore: number;
    stars: 1 | 2 | 3;
    summary: string;
    details?: Record<string, any>;
    artworkDataUrl?: string;
  }) => void;
  onClose: () => void;
}
