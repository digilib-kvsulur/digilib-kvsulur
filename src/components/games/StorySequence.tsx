import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, ArrowUp, ArrowDown, CheckCircle2, XCircle, BookOpen } from "lucide-react";

interface StoryPlot {
  title: string;
  authorOrOrigin: string;
  events: string[];
}

const STORIES: StoryPlot[] = [
  {
    title: "The Tortoise and the Hare",
    authorOrOrigin: "Aesop's Fable",
    events: [
      "The boastful Hare mocks the slow Tortoise and challenges him to a race.",
      "The race begins and the speedy Hare races far ahead of the steady Tortoise.",
      "Overconfident of his huge lead, the Hare decides to take a quick nap under a shady tree.",
      "The Tortoise plods along slowly, never stopping or giving up hope.",
      "The Hare wakes up in disbelief as the Tortoise crosses the finish line to victory.",
    ],
  },
  {
    title: "Cinderella",
    authorOrOrigin: "Fairy Tale",
    events: [
      "Cinderella is mistreated by her wicked stepmother and forbidden to attend the Royal Ball.",
      "Her Fairy Godmother appears, magically transforming a pumpkin and mice into a grand carriage.",
      "Cinderella enchants the Prince at the palace ball but must flee at the stroke of midnight.",
      "In her hurried escape down the palace steps, Cinderella leaves behind a single glass slipper.",
      "The Prince searches every home until the slipper fits Cinderella, and they wed with joy.",
    ],
  },
  {
    title: "The Monkey and the Crocodile",
    authorOrOrigin: "Panchatantra",
    events: [
      "A friendly Monkey feeds sweet rose-apples from his tree to a visiting Crocodile.",
      "The greedy wife of the Crocodile demands to eat the sweet heart of the clever Monkey.",
      "The Crocodile invites the Monkey across the river, deceitfully revealing his wife's demand midway.",
      "The clever Monkey claims he left his heart safely behind in the branches of the apple tree.",
      "They return to shore, where the Monkey leaps to safety and scolds the foolish Crocodile.",
    ],
  },
  {
    title: "Treasure Island",
    authorOrOrigin: "Robert Louis Stevenson",
    events: [
      "Young Jim Hawkins discovers an old pirate map in Billy Bones' sea chest.",
      "The Hispaniola sets sail with Jim and a charming one-legged cook named Long John Silver.",
      "Jim overhears Silver plotting a pirate mutiny inside an apple barrel.",
      "A fierce battle erupts on the island between the loyal crew and the treacherous pirates.",
      "Jim and his companions recover Captain Flint's treasure and sail victoriously home.",
    ],
  },
  {
    title: "The Boy Who Cried Wolf",
    authorOrOrigin: "Aesop's Fable",
    events: [
      "A bored shepherd boy watches sheep on a hillside and decides to pull a mischievous trick.",
      "He shouts 'Wolf! Wolf!' causing the concerned villagers to run up to help him.",
      "He laughs at the villagers when they find no wolf, and repeats the trick again days later.",
      "A real ferocious wolf stalks out of the dark woods to attack the flock of sheep.",
      "The boy screams in terror for help, but nobody comes because nobody believes a liar.",
    ],
  },
  {
    title: "Aladdin and the Magic Lamp",
    authorOrOrigin: "One Thousand and One Nights",
    events: [
      "A sorcerer poses as Aladdin's uncle and lures him into a mystical cave of wonders.",
      "Aladdin finds a dusty oil lamp but gets trapped inside the cave by the sorcerer.",
      "Accidentally rubbing the brass lamp releases a powerful Genie ready to grant his wishes.",
      "With the Genie's aid, Aladdin wins the heart of Princess Jasmine and builds a palace.",
      "Aladdin defeats the evil sorcerer and protects the kingdom using wit and courage.",
    ],
  },
];

const TOTAL_ROUNDS = 3;

export default function StorySequence({ onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);

  const pool = useMemo(() => {
    return shuffle(STORIES).slice(0, TOTAL_ROUNDS);
  }, [seed]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [correctPositions, setCorrectPositions] = useState<boolean[]>([]);
  const [roundScore, setRoundScore] = useState(0);
  const [over, setOver] = useState(false);

  const currentStory = pool[roundIdx];

  // Initialize scrambled order for the current story
  useState(() => {
    if (currentStory) {
      let scrambled = shuffle([...currentStory.events]);
      while (scrambled.join("") === currentStory.events.join("") && currentStory.events.length > 1) {
        scrambled = shuffle([...currentStory.events]);
      }
      setCurrentOrder(scrambled);
    }
  });

  const setupRound = (rIdx: number) => {
    const st = pool[rIdx];
    if (!st) return;
    let scrambled = shuffle([...st.events]);
    while (scrambled.join("") === st.events.join("") && st.events.length > 1) {
      scrambled = shuffle([...st.events]);
    }
    setCurrentOrder(scrambled);
    setChecked(false);
    setCorrectPositions([]);
  };

  const moveItem = (index: number, direction: "UP" | "DOWN") => {
    if (checked) return;
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const updated = [...currentOrder];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCurrentOrder(updated);
  };

  const handleCheck = () => {
    if (checked || !currentStory) return;

    const evaluations = currentOrder.map((ev, idx) => ev === currentStory.events[idx]);
    const numCorrect = evaluations.filter(Boolean).length;
    setCorrectPositions(evaluations);
    setChecked(true);

    const pts = numCorrect * 5;
    const nextTotal = roundScore + pts;
    setRoundScore(nextTotal);

    window.setTimeout(() => {
      if (roundIdx + 1 >= pool.length) {
        setOver(true);
        const win = nextTotal >= 40;
        onComplete(win, nextTotal);
      } else {
        const nextR = roundIdx + 1;
        setRoundIdx(nextR);
        setupRound(nextR);
      }
    }, 2200);
  };

  const restart = () => {
    setSeed((s) => s + 1);
    setRoundIdx(0);
    setRoundScore(0);
    setChecked(false);
    setCorrectPositions([]);
    setOver(false);
    setupRound(0);
  };

  return (
    <div className="space-y-4">
      {/* Top Header stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Story {Math.min(roundIdx + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</Badge>
          <Badge variant="outline" className="text-primary font-bold">{roundScore} XP</Badge>
          {currentStory?.authorOrOrigin && (
            <Badge variant="secondary" className="text-xs">{currentStory.authorOrOrigin}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over && currentStory ? (
        <Card className="p-5 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-bold text-lg flex items-center justify-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> {currentStory.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              Rearrange the plot milestones in order from beginning to end!
            </p>
          </div>

          {/* Draggable/Movable Event Cards */}
          <div className="space-y-2 max-w-lg mx-auto">
            {currentOrder.map((eventText, idx) => {
              const isRight = checked ? correctPositions[idx] : null;

              return (
                <div
                  key={eventText}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition-colors ${
                    isRight === true
                      ? "bg-emerald-500/10 border-emerald-500 text-foreground"
                      : isRight === false
                      ? "bg-destructive/10 border-destructive/60 text-foreground"
                      : "bg-muted/40 border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{eventText}</span>
                  </div>

                  {checked ? (
                    isRight ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    )
                  ) : (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveItem(idx, "UP")}
                        disabled={idx === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveItem(idx, "DOWN")}
                        disabled={idx === currentOrder.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Button
              className="w-full max-w-md"
              onClick={handleCheck}
              disabled={checked}
            >
              Check Chronology
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-4 border-primary/40 bg-primary/5">
          <Trophy className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <div>
            <h3 className="text-xl font-bold">Storyteller Supreme!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You pieced the timelines together and earned <span className="font-bold text-primary">{roundScore} XP</span>!
            </p>
          </div>
          <Button size="sm" variant="default" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
