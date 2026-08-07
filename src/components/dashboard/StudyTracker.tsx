import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Timer, Play, Pause, Square, Flame, BookOpen, Coffee, Zap } from "lucide-react";

type SessionMode = "pomodoro" | "focus" | "break";

interface Material {
  id: string;
  title: string;
  subject: string | null;
}

interface StudySession {
  id: string;
  material_title: string | null;
  duration_seconds: number;
  points_earned: number;
  session_type: string;
  started_at: string;
  ended_at: string | null;
}

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function StudyTracker({ userId, studentClass }: { userId: string; studentClass?: string }) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [materialId, setMaterialId] = useState<string>("none");
  const [customMaterial, setCustomMaterial] = useState("");
  const [mode, setMode] = useState<SessionMode>("pomodoro");
  const [pomodoroMins, setPomodoroMins] = useState(25);
  const [ptsPerMin, setPtsPerMin] = useState(1);
  const [dailyGoalMins, setDailyGoalMins] = useState<number>(() => {
    const v = Number(localStorage.getItem("study_daily_goal_mins"));
    return v > 0 ? v : 60;
  });
  const [notes, setNotes] = useState("");

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(25 * 60);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tickRef = useRef<number | null>(null);
  const startTsRef = useRef<number | null>(null);
  const accruedRef = useRef(0);

  const load = useCallback(async () => {
    const baseClass = (studentClass || "").replace(/[^0-9]/g, "");
    let matQ = supabase.from("study_materials").select("id, title, subject").order("title").limit(200);
    if (baseClass) matQ = matQ.or(`student_class.ilike.%${baseClass}%,student_class.is.null`);
    const [{ data: mats }, { data: sess }, { data: settings }] = await Promise.all([
      matQ,
      supabase.from("study_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("system_settings").select("key, value").in("key", ["study_pomodoro_minutes", "points_per_study_minute"]),
    ]);
    setMaterials(mats || []);
    setSessions((sess || []) as StudySession[]);
    (settings || []).forEach((row: any) => {
      const n = Number(row.value);
      if (row.key === "study_pomodoro_minutes" && n > 0) setPomodoroMins(n);
      if (row.key === "points_per_study_minute" && n >= 0) setPtsPerMin(n);
    });
  }, [userId, studentClass]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode === "pomodoro") setTargetSeconds(pomodoroMins * 60);
    else if (mode === "break") setTargetSeconds(5 * 60);
    else setTargetSeconds(60 * 60);
  }, [mode, pomodoroMins]);

  useEffect(() => {
    if (!running || paused) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => {
      if (startTsRef.current == null) return;
      const now = Date.now();
      const secs = accruedRef.current + Math.floor((now - startTsRef.current) / 1000);
      setElapsed(secs);
      if (mode !== "focus" && secs >= targetSeconds) {
        void finishSession(secs);
      }
    }, 250);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused, mode, targetSeconds]);

  const materialTitle = () => {
    if (materialId !== "none") {
      return materials.find((m) => m.id === materialId)?.title || customMaterial || null;
    }
    return customMaterial.trim() || null;
  };

  const startSession = async () => {
    if (running) return;
    const { data, error } = await supabase.from("study_sessions").insert({
      user_id: userId,
      material_id: materialId !== "none" ? materialId : null,
      material_title: materialTitle(),
      duration_seconds: 1,
      points_earned: 0,
      session_type: mode,
      notes: notes.trim() || null,
      started_at: new Date().toISOString(),
    }).select("id").single();

    if (error) {
      toast({ title: "Could not start session", description: error.message, variant: "destructive" });
      return;
    }
    setActiveSessionId(data.id);
    accruedRef.current = 0;
    startTsRef.current = Date.now();
    setElapsed(0);
    setPaused(false);
    setRunning(true);
    toast({ title: mode === "break" ? "Break started" : "Study session started", description: "Focus time — you've got this!" });
  };

  const pauseSession = () => {
    if (!running || paused) return;
    if (startTsRef.current != null) {
      accruedRef.current += Math.floor((Date.now() - startTsRef.current) / 1000);
      startTsRef.current = null;
    }
    setPaused(true);
  };

  const resumeSession = () => {
    if (!running || !paused) return;
    startTsRef.current = Date.now();
    setPaused(false);
  };

  const finishSession = async (finalSecs?: number) => {
    if (!activeSessionId || saving) return;
    setSaving(true);
    if (startTsRef.current != null) {
      accruedRef.current += Math.floor((Date.now() - startTsRef.current) / 1000);
      startTsRef.current = null;
    }
    const duration = Math.max(finalSecs ?? accruedRef.current, 1);
    setRunning(false);
    setPaused(false);
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }

    try {
      const { data: pts, error } = await supabase.rpc("complete_study_session", {
        p_session_id: activeSessionId,
        p_duration_seconds: duration,
        p_material_id: materialId !== "none" ? materialId : null,
        p_material_title: materialTitle(),
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      const earned = Number(pts) || 0;
      toast({
        title: mode === "break" ? "Break complete" : "Session complete!",
        description: earned > 0 ? `+${earned} XP for ${formatTime(duration)} of study` : `Logged ${formatTime(duration)}`,
      });
    } catch (e: any) {
      // Fallback if RPC not yet migrated
      const earned = mode === "break" ? 0 : Math.floor(duration / 60) * ptsPerMin;
      await supabase.from("study_sessions").update({
        duration_seconds: duration,
        points_earned: earned,
        material_id: materialId !== "none" ? materialId : null,
        material_title: materialTitle(),
        notes: notes.trim() || null,
        ended_at: new Date().toISOString(),
      }).eq("id", activeSessionId);
      if (earned > 0) {
        const { data: prof } = await supabase.from("profiles").select("points").eq("id", userId).single();
        await supabase.from("profiles").update({ points: (prof?.points || 0) + earned }).eq("id", userId);
      }
      toast({
        title: "Session saved",
        description: earned > 0 ? `+${earned} XP` : formatTime(duration),
      });
    } finally {
      setActiveSessionId(null);
      setElapsed(0);
      accruedRef.current = 0;
      setSaving(false);
      load();
    }
  };

  const totalStudySecs = sessions
    .filter((s) => s.session_type !== "break" && s.ended_at)
    .reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const totalXp = sessions.reduce((a, s) => a + (s.points_earned || 0), 0);
  const progressPct = targetSeconds > 0 ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;
  const displayRemaining = mode === "focus" ? elapsed : Math.max(0, targetSeconds - elapsed);

  const todaySecs = sessions
    .filter((s) => s.session_type !== "break" && s.ended_at && new Date(s.started_at).toDateString() === new Date().toDateString())
    .reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const goalPct = dailyGoalMins > 0 ? Math.min(100, (todaySecs / 60 / dailyGoalMins) * 100) : 0;

  const week = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const secs = sessions
      .filter((s) => s.session_type !== "break" && s.ended_at && new Date(s.started_at).toDateString() === d.toDateString())
      .reduce((a, s) => a + (s.duration_seconds || 0), 0);
    return { label: d.toLocaleDateString(undefined, { weekday: "narrow" }), mins: Math.round(secs / 60) };
  });
  const weekMax = Math.max(...week.map((w) => w.mins), 1);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Timer className="h-6 w-6 text-primary" /> Study Tracker
        </h2>
        <p className="text-sm text-muted-foreground">
          Pomodoro timer, focus sessions, and XP for time spent studying ({ptsPerMin} XP / minute).
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> Total study</p>
            <p className="text-xl font-bold mt-1">{Math.floor(totalStudySecs / 60)} min</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> XP earned</p>
            <p className="text-xl font-bold mt-1">{totalXp}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Sessions</p>
            <p className="text-xl font-bold mt-1">{sessions.filter((s) => s.ended_at).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Timer</CardTitle>
          <CardDescription>Pick a mode, optional study material, then start.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              { id: "pomodoro" as const, label: `Pomodoro (${pomodoroMins}m)`, icon: Timer },
              { id: "focus" as const, label: "Open focus", icon: Flame },
              { id: "break" as const, label: "Break (5m)", icon: Coffee },
            ]).map((m) => (
              <Button
                key={m.id}
                type="button"
                size="sm"
                variant={mode === m.id ? "default" : "outline"}
                disabled={running}
                className="gap-1.5"
                onClick={() => setMode(m.id)}
              >
                <m.icon className="h-3.5 w-3.5" /> {m.label}
              </Button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Study material (optional)</Label>
              <Select value={materialId} onValueChange={setMaterialId} disabled={running}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / custom</SelectItem>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}{m.subject ? ` · ${m.subject}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {materialId === "none" && (
              <div className="space-y-1.5">
                <Label>What are you studying?</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={customMaterial}
                  disabled={running}
                  onChange={(e) => setCustomMaterial(e.target.value)}
                  placeholder="e.g. Maths Ch. 5"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Session notes (optional)</Label>
            <Textarea
              value={notes}
              disabled={running}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Goals for this session…"
              className="h-16 resize-none"
            />
          </div>

          <div className="rounded-2xl bg-muted/40 border border-border/60 p-6 text-center space-y-3">
            <p className="text-5xl font-black tabular-nums tracking-tight text-foreground">
              {mode === "focus" ? formatTime(elapsed) : formatTime(displayRemaining)}
            </p>
            {mode !== "focus" && (
              <Progress value={progressPct} className="h-2" />
            )}
            <p className="text-xs text-muted-foreground">
              {running
                ? (paused ? "Paused" : mode === "break" ? "Break in progress" : "Studying…")
                : `Est. +${Math.floor((mode === "break" ? 0 : (mode === "pomodoro" ? targetSeconds : 25 * 60)) / 60) * ptsPerMin} XP`}
            </p>
            <div className="flex justify-center gap-2 pt-1">
              {!running ? (
                <Button onClick={startSession} className="gap-1.5">
                  <Play className="h-4 w-4" /> Start
                </Button>
              ) : (
                <>
                  {paused ? (
                    <Button onClick={resumeSession} variant="secondary" className="gap-1.5">
                      <Play className="h-4 w-4" /> Resume
                    </Button>
                  ) : (
                    <Button onClick={pauseSession} variant="secondary" className="gap-1.5">
                      <Pause className="h-4 w-4" /> Pause
                    </Button>
                  )}
                  <Button onClick={() => finishSession()} disabled={saving} variant="outline" className="gap-1.5">
                    <Square className="h-4 w-4" /> End &amp; save
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.filter((s) => s.ended_at).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No completed sessions yet. Start a Pomodoro!</p>
          )}
          {sessions.filter((s) => s.ended_at).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border/50 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{s.material_title || "Study session"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.started_at).toLocaleString()} · {formatTime(s.duration_seconds)} · {s.session_type}
                </p>
              </div>
              {s.points_earned > 0 ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">+{s.points_earned} XP</Badge>
              ) : (
                <Badge variant="outline">Break</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
