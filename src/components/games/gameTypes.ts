export interface GameDef {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon_name: string;
  category: string;
  is_enabled: boolean;
  points_per_win: number;
  max_points_per_day: number;
  daily_play_limit: number;
  sort_order: number;
}

export interface GameBook {
  id: string;
  title: string;
  author: string;
  cover_url?: string | null;
  category?: string | null;
}

export interface GameProps {
  books: GameBook[];
  onComplete: (win: boolean, score: number) => void;
  onExit: () => void;
}

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const formatClock = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
