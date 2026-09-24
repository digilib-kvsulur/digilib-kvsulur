import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, Users, CheckCircle2 } from "lucide-react";

interface CharacterPair {
  char1: string;
  char2: string;
  relation: string;
  book: string;
}

const ALL_PAIRS: CharacterPair[] = [
  { char1: "Sherlock Holmes", char2: "Dr. John Watson", relation: "Detective & Partner", book: "A Study in Scarlet" },
  { char1: "Don Quixote", char2: "Sancho Panza", relation: "Knight & Squire", book: "Don Quixote" },
  { char1: "Frodo Baggins", char2: "Samwise Gamgee", relation: "Ring-bearer & Faithful Friend", book: "The Lord of the Rings" },
  { char1: "Harry Potter", char2: "Lord Voldemort", relation: "Destined Nemeses", book: "Harry Potter" },
  { char1: "Tenali Rama", char2: "King Krishnadevaraya", relation: "Clever Wit & Monarch", book: "Vijayanagara Tales" },
  { char1: "King Vikram", char2: "Betal", relation: "Royal Seeker & Storyteller Spirit", book: "Vikram and Betaal" },
  { char1: "Mowgli", char2: "Baloo", relation: "Man-cub & Wise Bear Mentor", book: "The Jungle Book" },
  { char1: "Peter Pan", char2: "Captain Hook", relation: "Eternal Rivals of Neverland", book: "Peter and Wendy" },
  { char1: "Tom Sawyer", char2: "Huckleberry Finn", relation: "Adventurous Companions", book: "The Adventures of Tom Sawyer" },
  { char1: "Robin Hood", char2: "Little John", relation: "Outlaw Leader & Loyal Comrade", book: "Robin Hood" },
  { char1: "Emperor Akbar", char2: "Birbal", relation: "Mughal Emperor & Chief Advisor", book: "Akbar & Birbal Tales" },
  { char1: "Dorothy Gale", char2: "Toto", relation: "Adventurer & Faithful Terrier", book: "The Wonderful Wizard of Oz" },
  { char1: "Phileas Fogg", char2: "Passepartout", relation: "Globetrotter & Devoted Valet", book: "Around the World in 80 Days" },
  { char1: "Aladdin", char2: "The Genie", relation: "Lamp Bearer & Magical Ally", book: "One Thousand and One Nights" },
  { char1: "Hercule Poirot", char2: "Captain Hastings", relation: "Master Detective & Chronicler", book: "Agatha Christie Mysteries" },
];

const PAIRS_PER_ROUND = 4;
const TOTAL_ROUNDS = 3;

export default function CharacterPairUp({ onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);

  const roundsPool = useMemo(() => {
    const shuffled = shuffle(ALL_PAIRS);
    const rounds: CharacterPair[][] = [];
    for (let r = 0; r < TOTAL_ROUNDS; r++) {
      rounds.push(shuffled.slice(r * PAIRS_PER_ROUND, (r + 1) * PAIRS_PER_ROUND));
    }
    return rounds;
  }, [seed]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [errorPair, setErrorPair] = useState<{ left: string; right: string } | null>(null);
  const [over, setOver] = useState(false);

  const currentPairs = roundsPool[roundIdx] || [];

  // Scrambled right column
  const rightColumn = useMemo(() => {
    return shuffle(currentPairs.map((p) => p.char2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, seed]);

  const handleLeftClick = (char1: string) => {
    if (matchedPairs.includes(char1) || errorPair !== null) return;
    setSelectedLeft(char1);
  };

  const handleRightClick = (char2: string) => {
    if (!selectedLeft || errorPair !== null) return;

    // Check if char2 already matched
    const isAlreadyMatched = currentPairs.some(
      (p) => p.char2 === char2 && matchedPairs.includes(p.char1)
    );
    if (isAlreadyMatched) return;

    // Check match
    const matchingPair = currentPairs.find(
      (p) => p.char1 === selectedLeft && p.char2 === char2
    );

    if (matchingPair) {
      // Correct!
      const newMatches = [...matchedPairs, selectedLeft];
      setMatchedPairs(newMatches);
      setSelectedLeft(null);
      const nextScore = score + 10;
      setScore(nextScore);

      // Check if all pairs in current round matched
      if (newMatches.length >= currentPairs.length) {
        window.setTimeout(() => {
          if (roundIdx + 1 >= TOTAL_ROUNDS) {
            setOver(true);
            const win = nextScore >= 80;
            onComplete(win, nextScore);
          } else {
            setRoundIdx((r) => r + 1);
            setMatchedPairs([]);
            setSelectedLeft(null);
          }
        }, 1000);
      }
    } else {
      // Wrong match
      setErrorPair({ left: selectedLeft, right: char2 });
      window.setTimeout(() => {
        setErrorPair(null);
        setSelectedLeft(null);
      }, 700);
    }
  };

  const restart = () => {
    setSeed((s) => s + 1);
    setRoundIdx(0);
    setScore(0);
    setSelectedLeft(null);
    setMatchedPairs([]);
    setErrorPair(null);
    setOver(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</Badge>
          <Badge variant="outline" className="text-primary font-bold">{score} XP</Badge>
          <Badge variant="secondary" className="text-xs">
            Matched {matchedPairs.length}/{PAIRS_PER_ROUND}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over && currentPairs.length > 0 ? (
        <Card className="p-5 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-bold text-lg flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Literary Duos & Rivals
            </h3>
            <p className="text-xs text-muted-foreground">
              Select a character on the left, then connect their matching partner or nemesis on the right!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
            {/* Left Column (Character 1) */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider">
                Character
              </p>
              {currentPairs.map((p) => {
                const isMatched = matchedPairs.includes(p.char1);
                const isSelected = selectedLeft === p.char1;
                const isErr = errorPair?.left === p.char1;

                return (
                  <Button
                    key={p.char1}
                    variant={
                      isMatched
                        ? "default"
                        : isErr
                        ? "destructive"
                        : isSelected
                        ? "secondary"
                        : "outline"
                    }
                    className={`w-full h-14 justify-start px-3 text-xs sm:text-sm font-medium transition-all ${
                      isMatched
                        ? "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600 opacity-90"
                        : isSelected
                        ? "ring-2 ring-primary border-primary font-bold shadow-sm"
                        : ""
                    }`}
                    onClick={() => handleLeftClick(p.char1)}
                    disabled={isMatched}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{p.char1}</span>
                      {isMatched && <CheckCircle2 className="h-4 w-4 ml-1 shrink-0" />}
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Right Column (Character 2) */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider">
                Partner / Rival
              </p>
              {rightColumn.map((char2) => {
                const pair = currentPairs.find((p) => p.char2 === char2);
                const isMatched = pair ? matchedPairs.includes(pair.char1) : false;
                const isErr = errorPair?.right === char2;

                return (
                  <Button
                    key={char2}
                    variant={
                      isMatched
                        ? "default"
                        : isErr
                        ? "destructive"
                        : "outline"
                    }
                    className={`w-full h-14 justify-start px-3 text-xs sm:text-sm font-medium transition-all ${
                      isMatched
                        ? "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600 opacity-90"
                        : ""
                    }`}
                    onClick={() => handleRightClick(char2)}
                    disabled={isMatched}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{char2}</span>
                      {isMatched && <CheckCircle2 className="h-4 w-4 ml-1 shrink-0" />}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-4 border-primary/40 bg-primary/5">
          <Trophy className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <div>
            <h3 className="text-xl font-bold">Unbeatable Matchmaker!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You connected all the dynamic duos and earned <span className="font-bold text-primary">{score} XP</span>!
            </p>
          </div>
          <Button size="sm" variant="default" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
