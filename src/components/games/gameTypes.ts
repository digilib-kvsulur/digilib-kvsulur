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

export interface GameContentItem {
  id: string;
  game_key: string;
  kind: string;
  value: string;
  hint: string | null;
  extra: Record<string, any> | null;
  is_active: boolean;
}

export interface GameProps {
  books: GameBook[];
  content: GameContentItem[];
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

export const normalise = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");

export const wordsFrom = (items: GameContentItem[], kind = "word") =>
  items.filter((i) => i.kind === kind).map((i) => i.value.toUpperCase());
