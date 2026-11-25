import { Accessibility, Gauge, Type, Volume2, VolumeX, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSpeech } from "./useSpeech";
import type { ReadingPrefs } from "./types";

const SAMPLE = "Photosynthesis is the process by which green plants use sunlight to make food from carbon dioxide and water. The green pigment chlorophyll captures light energy.";

function Segmented({ value, options, onChange, label }: { value: number; options: Array<{ value: number; label: string }>; onChange: (value: number) => void; label: string }) {
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      <div className="mt-1.5 flex gap-1 rounded-xl bg-muted/50 p-1" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-medium ${value === option.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReadingPreferences({
  prefs,
  update,
  dataSaver,
  setDataSaver,
  error,
}: {
  prefs: ReadingPrefs;
  update: (patch: Partial<ReadingPrefs>) => void;
  dataSaver: boolean;
  setDataSaver: (value: boolean) => void;
  error?: string;
}) {
  const { speak, stop, speaking, supported } = useSpeech();

  return (
    <Card className="rounded-2xl border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Accessibility className="h-4 w-4 text-primary" /> Reading preferences</CardTitle>
        <p className="text-xs text-muted-foreground">These settings apply to study notes, flashcards, and reading views on this device and your account.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Segmented
            label="Text size"
            value={prefs.fontScale}
            onChange={(value) => update({ fontScale: value })}
            options={[{ value: 0.9, label: "Small" }, { value: 1, label: "Default" }, { value: 1.2, label: "Large" }, { value: 1.4, label: "XL" }]}
          />
          <Segmented
            label="Line spacing"
            value={prefs.lineHeight}
            onChange={(value) => update({ lineHeight: value })}
            options={[{ value: 1.4, label: "Tight" }, { value: 1.6, label: "Normal" }, { value: 1.9, label: "Airy" }]}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Type className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div><Label htmlFor="pref-dyslexia" className="text-sm">Dyslexia-friendly font</Label><p className="text-xs text-muted-foreground">Wider letter spacing and a simpler typeface.</p></div>
            </div>
            <Switch id="pref-dyslexia" checked={prefs.dyslexiaFont} onCheckedChange={(value) => update({ dyslexiaFont: value })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Gauge className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div><Label htmlFor="pref-contrast" className="text-sm">High contrast</Label><p className="text-xs text-muted-foreground">Stronger text and border contrast for low-vision reading.</p></div>
            </div>
            <Switch id="pref-contrast" checked={prefs.highContrast} onCheckedChange={(value) => update({ highContrast: value })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <WifiOff className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div><Label htmlFor="pref-data" className="text-sm">Low-data mode</Label><p className="text-xs text-muted-foreground">Offline packs store text only and skip large PDF links.</p></div>
            </div>
            <Switch id="pref-data" checked={dataSaver} onCheckedChange={setDataSaver} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-3">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">Test read-aloud with a short sample.</p>
          {supported ? (
            <Button type="button" size="sm" variant="outline" className="min-h-9 rounded-lg" onClick={() => (speaking ? stop() : speak(SAMPLE))}>
              {speaking ? <VolumeX className="mr-1.5 h-4 w-4" /> : <Volume2 className="mr-1.5 h-4 w-4" />}
              {speaking ? "Stop" : "Read sample"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Read-aloud is not supported in this browser.</span>
          )}
        </div>

        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
