import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Download, HardDrive, Loader2, Trash2, Volume2, VolumeX, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchLearningResources } from "./api";
import MarkdownBlock from "./MarkdownBlock";
import { useSpeech } from "./useSpeech";
import {
  deleteOfflinePack,
  estimateStorage,
  formatBytes,
  listOfflinePacks,
  packId,
  saveOfflinePack,
  type OfflinePack,
  type OfflinePackItem,
} from "./offlinePackStore";
import type { StudyResource } from "./types";

const PACK_TYPES = ["chapter_lesson", "short_notes", "formula_sheet", "quick_revision"];

function toItem(resource: StudyResource): OfflinePackItem {
  return {
    id: resource.id,
    title: resource.title,
    subject: resource.subject || "General",
    chapterTitle: resource.chapter_title || "",
    type: resource.resource_type,
    markdown: resource.markdown_content,
    fileUrl: resource.file_url,
  };
}

export default function OfflinePacks({ studentClass, userId }: { studentClass: string; userId?: string }) {
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [packs, setPacks] = useState<OfflinePack[]>([]);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [openPack, setOpenPack] = useState<OfflinePack | null>(null);
  const [activeItem, setActiveItem] = useState<OfflinePackItem | null>(null);
  const { speak, stop, speaking, supported } = useSpeech();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [resourceRows, savedPacks, estimate] = await Promise.all([
        fetchLearningResources(studentClass, PACK_TYPES),
        listOfflinePacks(),
        estimateStorage(),
      ]);
      setResources(resourceRows.filter((resource) => Boolean(resource.markdown_content?.trim())));
      setPacks(savedPacks);
      setStorage(estimate);
    } catch (e: any) {
      setError(e?.message || "Offline packs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [studentClass]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, StudyResource[]>();
    resources.forEach((resource) => {
      const key = resource.subject || "General";
      map.set(key, [...(map.get(key) || []), resource]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [resources]);

  const download = async (subject: string, rows: StudyResource[]) => {
    setBusy(subject);
    try {
      const items = rows.map(toItem);
      const pack: OfflinePack = {
        id: packId(studentClass, subject),
        classNumber: studentClass,
        subject,
        savedAt: Date.now(),
        items,
        bytes: new Blob([JSON.stringify(items)]).size,
      };
      await saveOfflinePack(pack);
      setPacks(await listOfflinePacks());
      setStorage(await estimateStorage());
      toast.success(`${subject} saved offline · ${items.length} resource${items.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message || "The pack could not be saved on this device.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (pack: OfflinePack) => {
    setBusy(pack.id);
    try {
      await deleteOfflinePack(pack.id);
      setPacks(await listOfflinePacks());
      setStorage(await estimateStorage());
      if (openPack?.id === pack.id) {
        setOpenPack(null);
        setActiveItem(null);
      }
      toast.success("Offline pack removed");
    } catch (e: any) {
      toast.error(e?.message || "The pack could not be removed.");
    } finally {
      setBusy("");
    }
  };

  const savedIds = new Set(packs.map((pack) => pack.id));

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><WifiOff className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold">Study without a connection</p>
              <p className="text-xs text-muted-foreground">Save text notes, formulas, and revision cards to this device. PDFs stay online to protect your data plan.</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit shrink-0 rounded-full"><HardDrive className="mr-1 h-3 w-3" /> {storage ? `${formatBytes(storage.usage)} used` : "Local storage"}</Badge>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="rounded-2xl shadow-none"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking this device…</CardContent></Card>
      ) : error ? (
        <Card className="rounded-2xl shadow-none"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3 min-h-10 rounded-xl" onClick={() => void load()}>Try again</Button></CardContent></Card>
      ) : (
        <>
          <Card className="rounded-2xl shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Available packs</CardTitle>
              <p className="text-xs text-muted-foreground">Class {studentClass} approved text resources. Download a subject before a journey or a network outage.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No approved text resources are available for your class yet.</p>
              ) : (
                grouped.map(([subject, rows]) => {
                  const id = packId(studentClass, subject);
                  const saved = savedIds.has(id);
                  const size = new Blob([JSON.stringify(rows.map(toItem))]).size;
                  return (
                    <div key={subject} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{subject}</p>
                        <p className="text-xs text-muted-foreground">{rows.length} resource{rows.length === 1 ? "" : "s"} · about {formatBytes(size)}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={saved ? "secondary" : "outline"}
                        className="min-h-10 shrink-0 rounded-xl"
                        disabled={busy === subject}
                        onClick={() => void download(subject, rows)}
                      >
                        {busy === subject ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                        {saved ? "Refresh" : "Download"}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Saved on this device</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {packs.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Nothing saved yet. Download a subject pack above.</p>
              ) : (
                packs.map((pack) => (
                  <div key={pack.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">Class {pack.classNumber} · {pack.subject}</p>
                      <p className="text-xs text-muted-foreground">{pack.items.length} resources · {formatBytes(pack.bytes)} · saved {new Date(pack.savedAt).toLocaleDateString()}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="min-h-10 shrink-0 rounded-xl" onClick={() => { setOpenPack(pack); setActiveItem(pack.items[0] || null); }}>
                      <BookOpen className="mr-1.5 h-4 w-4" /> Open
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-xl text-destructive" aria-label={`Remove ${pack.subject} pack`} disabled={busy === pack.id} onClick={() => void remove(pack)}>
                      {busy === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {openPack && (
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">Class {openPack.classNumber} · {openPack.subject}</CardTitle>
                  <p className="text-xs text-muted-foreground">Saved {new Date(openPack.savedAt).toLocaleString()}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-9 rounded-lg" onClick={() => { setOpenPack(null); setActiveItem(null); stop(); }}>Close</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {openPack.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={activeItem?.id === item.id}
                      onClick={() => { setActiveItem(item); stop(); }}
                      className={`min-h-9 max-w-full truncate rounded-full border px-3 text-xs font-medium ${activeItem?.id === item.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
                {activeItem && (
                  <div className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{activeItem.title}</p>
                        <p className="text-xs text-muted-foreground">{activeItem.chapterTitle || activeItem.subject}</p>
                      </div>
                      {supported && activeItem.markdown && (
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-lg" aria-label={speaking ? "Stop reading" : "Read aloud"} onClick={() => (speaking ? stop() : speak(activeItem.markdown || ""))}>
                          {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                    {activeItem.markdown ? (
                      <MarkdownBlock className="reading-content mt-2">{activeItem.markdown}</MarkdownBlock>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">This resource has no saved text. Open it while you have a connection.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
