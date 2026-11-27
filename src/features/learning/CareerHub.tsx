import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark, BookmarkCheck, Briefcase, ChevronDown, ChevronUp, ExternalLink, GraduationCap,
  Landmark, Lightbulb, Loader2, Search, Sparkles, Volume2, VolumeX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchCareerBookmarks, fetchCareerResources, toggleCareerBookmark } from "./api";
import CareerPathFinder from "./CareerPathFinder";
import MarkdownBlock from "./MarkdownBlock";
import { useSpeech } from "./useSpeech";
import type { CareerCategory, CareerResource } from "./types";

const CATEGORIES: Array<{ value: "all" | CareerCategory; label: string; icon: typeof Sparkles }> = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "stream", label: "Streams", icon: GraduationCap },
  { value: "exam", label: "Entrance exams", icon: Landmark },
  { value: "career", label: "Careers", icon: Briefcase },
  { value: "scholarship", label: "Scholarships", icon: Lightbulb },
  { value: "skill", label: "Skills", icon: Sparkles },
];

function inClassRange(resource: CareerResource, classNumber: string) {
  const value = Number(classNumber);
  return value >= Number(resource.min_class) && value <= Number(resource.max_class);
}

function categoryLabel(category: CareerCategory) {
  return CATEGORIES.find((item) => item.value === category)?.label || category;
}

export default function CareerHub({ studentClass, userId }: { studentClass: string; userId?: string }) {
  const classNumber = String(Math.min(12, Math.max(6, Number(String(studentClass || "").match(/\d+/)?.[0] || 10))));
  const [resources, setResources] = useState<CareerResource[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<"all" | CareerCategory>("all");
  const [query, setQuery] = useState("");
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [expanded, setExpanded] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [busy, setBusy] = useState("");
  const [mode, setMode] = useState<"finder" | "library">("finder");
  const { speak, stop, speaking, supported } = useSpeech();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchCareerResources();
      setResources(rows);
      if (userId) setBookmarks(new Set(await fetchCareerBookmarks(userId)));
    } catch (e: any) {
      setError(e?.message || "Career resources could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return resources.filter((resource) => {
      if (!showAllClasses && !inClassRange(resource, classNumber)) return false;
      if (category !== "all" && resource.category !== category) return false;
      if (onlySaved && !bookmarks.has(resource.id)) return false;
      if (!term) return true;
      return `${resource.title} ${resource.summary} ${resource.stream || ""} ${resource.content_md}`.toLowerCase().includes(term);
    });
  }, [resources, query, category, showAllClasses, classNumber, onlySaved, bookmarks]);

  const toggleSaved = async (resource: CareerResource) => {
    if (!userId) {
      toast.error("Sign in to save resources.");
      return;
    }
    const saved = bookmarks.has(resource.id);
    setBusy(resource.id);
    setBookmarks((current) => {
      const next = new Set(current);
      if (saved) next.delete(resource.id);
      else next.add(resource.id);
      return next;
    });
    try {
      await toggleCareerBookmark(userId, resource.id, saved);
    } catch (e: any) {
      setBookmarks((current) => {
        const next = new Set(current);
        if (saved) next.add(resource.id);
        else next.delete(resource.id);
        return next;
      });
      toast.error(e?.message || "The bookmark could not be saved.");
    } finally {
      setBusy("");
    }
  };

  const toggleExpanded = (resource: CareerResource) => {
    stop();
    setExpanded((current) => (current === resource.id ? "" : resource.id));
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-indigo-600/10 via-card to-teal-500/10 shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-sm"><Briefcase className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">Career Hub · CareerPath AI</p>
                <Badge variant="outline" className="rounded-full text-[11px]">Class {classNumber}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Discover your best stream, entrance exams, and career roadmap, or browse curated guides.</p>
            </div>
          </div>
          <div className="flex shrink-0 rounded-xl border bg-background/80 p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode("finder")}
              className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-all ${mode === "finder" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" /> CareerPath AI
            </button>
            <button
              type="button"
              onClick={() => setMode("library")}
              className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-all ${mode === "library" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <GraduationCap className="mr-1.5 inline h-3.5 w-3.5" /> Guides & Exams
            </button>
          </div>
        </CardContent>
      </Card>

      {mode === "finder" ? (
        <CareerPathFinder studentClass={classNumber} userId={userId} />
      ) : (
        <>
          <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exams, careers, scholarships…" aria-label="Search career resources" className="min-h-11 rounded-xl pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Filter by category">
          {CATEGORIES.map((item) => {
            const Icon = item.icon;
            const active = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(item.value)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={showAllClasses ? "default" : "outline"} className="min-h-9 rounded-lg" aria-pressed={showAllClasses} onClick={() => setShowAllClasses((value) => !value)}>
            {showAllClasses ? "Showing all classes" : "Showing my class"}
          </Button>
          <Button type="button" size="sm" variant={onlySaved ? "default" : "outline"} className="min-h-9 rounded-lg" aria-pressed={onlySaved} onClick={() => setOnlySaved((value) => !value)}>
            <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Saved
          </Button>
          <span className="text-xs text-muted-foreground">{filtered.length} resource{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-2xl shadow-none"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading career resources…</CardContent></Card>
      ) : error ? (
        <Card className="rounded-2xl shadow-none"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3 min-h-10 rounded-xl" onClick={() => void load()}>Try again</Button></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><Search className="h-6 w-6" /></div>
            <h3 className="mt-3 font-semibold">Nothing matches those filters</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Try another category, clear the search, or show resources for all classes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((resource) => {
            const isOpen = expanded === resource.id;
            const saved = bookmarks.has(resource.id);
            return (
              <Card key={resource.id} className="rounded-2xl shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="rounded-full">{categoryLabel(resource.category)}</Badge>
                        {resource.stream && <Badge variant="outline" className="rounded-full">{resource.stream}</Badge>}
                        <Badge variant="outline" className="rounded-full">Classes {resource.min_class}–{resource.max_class}</Badge>
                      </div>
                      <h3 className="mt-1.5 text-base font-semibold leading-6">{resource.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{resource.summary}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label={saved ? "Remove bookmark" : "Save resource"} disabled={busy === resource.id} onClick={() => void toggleSaved(resource)}>
                      {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="outline" className="min-h-10 rounded-lg" aria-expanded={isOpen} onClick={() => toggleExpanded(resource)}>
                      {isOpen ? <ChevronUp className="mr-1.5 h-4 w-4" /> : <ChevronDown className="mr-1.5 h-4 w-4" />}
                      {isOpen ? "Show less" : "Read guide"}
                    </Button>
                    {isOpen && supported && (
                      <Button type="button" size="sm" variant="ghost" className="min-h-10 rounded-lg" onClick={() => (speaking ? stop() : speak(resource.content_md))}>
                        {speaking ? <VolumeX className="mr-1.5 h-4 w-4" /> : <Volume2 className="mr-1.5 h-4 w-4" />}
                        {speaking ? "Stop" : "Read aloud"}
                      </Button>
                    )}
                    {isOpen && resource.link_url && (
                      <Button type="button" size="sm" variant="ghost" className="min-h-10 rounded-lg" asChild>
                        <a href={resource.link_url} target="_blank" rel="noopener noreferrer">
                          Official site <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 rounded-xl border bg-muted/20 p-3">
                      <MarkdownBlock className="reading-content">{resource.content_md}</MarkdownBlock>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
