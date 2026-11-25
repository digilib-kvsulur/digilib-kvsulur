import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Pencil, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchWeekProgress, saveWeeklyGoal } from "./api";
import type { WeekProgress } from "./types";

const PRESETS = [
  { label: "Light", chapters: 2, practice: 30, minutes: 90 },
  { label: "Steady", chapters: 4, practice: 60, minutes: 180 },
  { label: "Stretch", chapters: 6, practice: 100, minutes: 300 },
];

function percent(actual: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

function GoalRow({ label, actual, target, unit }: { label: string; actual: number; target: number; unit: string }) {
  const value = percent(actual, target);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={actual >= target && target > 0 ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
          {actual} / {target} {unit}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className={`h-full rounded-full transition-all ${actual >= target && target > 0 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function WeeklyGoalsCard() {
  const [data, setData] = useState<WeekProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [chapters, setChapters] = useState(4);
  const [practice, setPractice] = useState(60);
  const [minutes, setMinutes] = useState(180);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchWeekProgress();
      setData(result);
      const goal = result.goals.find((item) => !item.subject) || result.goals[0];
      if (goal) {
        setChapters(goal.target_chapters);
        setPractice(goal.target_practice);
        setMinutes(goal.target_minutes);
      }
      setError("");
    } catch (e: any) {
      setError(e?.message || "Weekly goals could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (values: { chapters: number; practice: number; minutes: number }) => {
    setSaving(true);
    setError("");
    try {
      await saveWeeklyGoal({ chapters: values.chapters, practice: values.practice, minutes: values.minutes });
      setEditing(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "The goal could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const goal = data?.goals.find((item) => !item.subject) || data?.goals[0];
  const actuals = data?.actuals || { chapters: 0, practice: 0, minutes: 0 };

  return (
    <Card className="rounded-2xl border-border/70 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> This week's goals</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Small, specific targets beat vague intentions.</p>
        </div>
        {goal && !editing && (
          <Button type="button" variant="ghost" size="sm" className="h-9 rounded-lg" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading goals…</div>
        ) : editing || !goal ? (
          <div className="space-y-3">
            {!goal && (
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button key={preset.label} type="button" size="sm" variant="outline" className="min-h-10 rounded-xl" disabled={saving} onClick={() => void save(preset)}>
                    {preset.label} · {preset.chapters} chapters
                  </Button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="goal-chapters" className="text-xs">Chapters</Label>
                <Input id="goal-chapters" type="number" min={0} max={50} value={chapters} onChange={(event) => setChapters(Number(event.target.value))} className="mt-1 min-h-10 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="goal-practice" className="text-xs">Questions</Label>
                <Input id="goal-practice" type="number" min={0} max={500} value={practice} onChange={(event) => setPractice(Number(event.target.value))} className="mt-1 min-h-10 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="goal-minutes" className="text-xs">Minutes</Label>
                <Input id="goal-minutes" type="number" min={0} max={3000} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="mt-1 min-h-10 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" className="min-h-10 rounded-xl" disabled={saving} onClick={() => void save({ chapters, practice, minutes })}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />} Save goal
              </Button>
              {goal && <Button type="button" size="sm" variant="ghost" className="min-h-10 rounded-xl" onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <GoalRow label="Chapters completed" actual={actuals.chapters} target={goal.target_chapters} unit="chapters" />
            <GoalRow label="Practice questions" actual={actuals.practice} target={goal.target_practice} unit="questions" />
            <GoalRow label="Study time" actual={actuals.minutes} target={goal.target_minutes} unit="minutes" />
          </div>
        )}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
