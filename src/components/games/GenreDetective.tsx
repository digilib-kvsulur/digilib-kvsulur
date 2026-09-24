import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, Flame, CheckCircle, XCircle, BookOpen } from "lucide-react";

interface BookBlurb {
  title: string;
  blurb: string;
  genre: string;
}

const ALL_GENRES = [
  "Fantasy",
  "Science Fiction",
  "Mystery & Thriller",
  "Biography & Memoir",
  "Historical Fiction",
  "Science & Nature",
  "Adventure",
  "Poetry & Plays",
];

const FALLBACK_BLURBS: BookBlurb[] = [
  {
    title: "Voyage to the Crimson Star",
    blurb: "A starship crew investigates an ancient alien monolith orbiting a dying pulsar at the edge of the galaxy.",
    genre: "Science Fiction",
  },
  {
    title: "The Whispering Shadows of Dartmoor",
    blurb: "Detective Inspector Finch traces bizarre muddy footprints that vanish in an ancient locked manor garden.",
    genre: "Mystery & Thriller",
  },
  {
    title: "The Alchemist of Eldoria",
    blurb: "A young apprentice discovers a forbidden spellbook capable of waking the slumbering stone dragons.",
    genre: "Fantasy",
  },
  {
    title: "Radical Radiance: Life of Marie Curie",
    blurb: "From underground laboratories in Warsaw to winning two Nobel Prizes and transforming modern physics.",
    genre: "Biography & Memoir",
  },
  {
    title: "Symphony of the Banyan Grove",
    blurb: "Lyrical verses capturing monsoon showers, twilight temple bells, and the quiet wisdom of ancient trees.",
    genre: "Poetry & Plays",
  },
  {
    title: "The Battle of Panipat Chronicles",
    blurb: "In 1761, two immense armies clash on the dusty plains of northern India, altering the course of empires.",
    genre: "Historical Fiction",
  },
  {
    title: "The Secret Life of Octopuses",
    blurb: "Exploring the alien intelligence, camouflage wonders, and problem-solving powers of sea creatures.",
    genre: "Science & Nature",
  },
  {
    title: "Castaway on Skeleton Reef",
    blurb: "Shipwrecked sailors must brave treacherous reefs, tropical storms, and pirate patrols to survive.",
    genre: "Adventure",
  },
  {
    title: "The Quantum Enigma",
    blurb: "How light particles can exist in two places at once and what entanglement reveals about reality.",
    genre: "Science & Nature",
  },
  {
    title: "The Curse of the Pharaoh's Scarab",
    blurb: "Archeologists unearth a golden tomb only to face an enigmatic string of locked-room disappearances.",
    genre: "Mystery & Thriller",
  },
  {
    title: "Wings over the Himalayas: Tenzing & Hillary",
    blurb: "The gripping personal journey of Sherpa Tenzing Norgay reaching the pinnacle of Mount Everest in 1953.",
    genre: "Biography & Memoir",
  },
  {
    title: "Chronicles of the Star Elf Realm",
    blurb: "Ancient enchanted blades, mythical pegasi, and a quest to recover the Sunstone from the dark realm.",
    genre: "Fantasy",
  },
];

const TOTAL_ROUNDS = 8;

export default function GenreDetective({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);

  const blurbs = useMemo(() => {
    const fromContent: BookBlurb[] = content
      .filter((c) => c.kind === "genre-blurb" && c.extra?.genre)
      .map((c) => ({
        title: c.value,
        blurb: c.hint || "Categorize this book into the right genre.",
        genre: String(c.extra.genre),
      }));
    const pool = fromContent.length >= TOTAL_ROUNDS ? fromContent : [...fromContent, ...FALLBACK_BLURBS];
    return shuffle(pool).slice(0, TOTAL_ROUNDS);
  }, [content, seed]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [over, setOver] = useState(false);

  const current = blurbs[roundIdx];

  // Pick 4 options including correct genre
  const options = useMemo(() => {
    if (!current) return [];
    const others = shuffle(ALL_GENRES.filter((g) => g !== current.genre)).slice(0, 3);
    return shuffle([current.genre, ...others]);
  }, [current, roundIdx, seed]);

  const handlePick = (pickedGenre: string) => {
    if (selected !== null) return;
    setSelected(pickedGenre);

    const correct = pickedGenre === current.genre;
    setIsCorrect(correct);

    const nextStreak = correct ? streak + 1 : 0;
    setStreak(nextStreak);

    // Multiplier calculation
    const mult = nextStreak >= 3 ? 2 : nextStreak >= 2 ? 1.5 : 1;
    const pts = correct ? Math.round(10 * mult) : 0;
    const nextScore = score + pts;
    setScore(nextScore);

    window.setTimeout(() => {
      if (roundIdx + 1 >= blurbs.length) {
        setOver(true);
        const win = nextScore >= 50;
        onComplete(win, nextScore);
      } else {
        setRoundIdx((r) => r + 1);
        setSelected(null);
        setIsCorrect(null);
      }
    }, 1100);
  };

  const restart = () => {
    setSeed((s) => s + 1);
    setRoundIdx(0);
    setStreak(0);
    setScore(0);
    setSelected(null);
    setIsCorrect(null);
    setOver(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Book {Math.min(roundIdx + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</Badge>
          <Badge variant="outline" className="text-primary font-bold">{score} XP</Badge>
          {streak > 1 && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-500 text-white flex items-center gap-1 text-xs">
              <Flame className="h-3 w-3" /> {streak}x Streak!
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over && current ? (
        <Card className="p-6 space-y-5">
          {/* Book card display */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/20 border border-border/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <BookOpen className="h-4 w-4" /> Library Shelving Chute
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              "{current.title}"
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.blurb}
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground font-medium">
            Which shelf/genre does this book belong to?
          </p>

          {/* 4 Shelf Choices */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {options.map((genre) => {
              let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
              let extra = "";

              if (selected !== null) {
                if (genre === current.genre) {
                  variant = "default";
                  extra = "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600";
                } else if (genre === selected) {
                  variant = "destructive";
                } else {
                  extra = "opacity-40";
                }
              }

              return (
                <Button
                  key={genre}
                  variant={variant}
                  className={`h-14 font-semibold text-sm justify-between px-4 transition-all ${extra}`}
                  onClick={() => handlePick(genre)}
                  disabled={selected !== null}
                >
                  <span>{genre}</span>
                  {selected !== null && genre === current.genre && (
                    <CheckCircle className="h-5 w-5 text-white" />
                  )}
                  {selected !== null && genre === selected && genre !== current.genre && (
                    <XCircle className="h-5 w-5 text-white" />
                  )}
                </Button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-4 border-primary/40 bg-primary/5">
          <Trophy className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <div>
            <h3 className="text-xl font-bold">Shelving Pro!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You earned <span className="font-bold text-primary">{score} XP</span> with your genre detective skills!
            </p>
          </div>
          <Button size="sm" variant="default" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
