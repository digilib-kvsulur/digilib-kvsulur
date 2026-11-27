import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatGoogleDriveUrl } from "@/lib/utils";
import { getStudyMaterialAccessUrl } from "@/lib/studyMaterialAccess";
import QuickAskAiDialog from "./QuickAskAiDialog";

export interface InAppReaderItem {
  title: string;
  url: string;
  subject?: string;
  studentClass?: string | number | null;
  chapterTitle?: string;
}

export default function InAppReaderDialog({
  item,
  onClose,
}: {
  item: InAppReaderItem | null;
  onClose: () => void;
}) {
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [useCompatViewer, setUseCompatViewer] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!item?.url) {
      setResolvedUrl("");
      return;
    }
    setLoadingUrl(true);
    setUseCompatViewer(false);
    getStudyMaterialAccessUrl(item.url)
      .then((url) => {
        if (active) setResolvedUrl(formatGoogleDriveUrl(url));
      })
      .catch(() => {
        if (active) setResolvedUrl(formatGoogleDriveUrl(item.url));
      })
      .finally(() => {
        if (active) setLoadingUrl(false);
      });
    return () => { active = false; };
  }, [item]);

  const frameSrc = useCompatViewer && resolvedUrl
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resolvedUrl)}`
    : resolvedUrl;

  return (
    <>
      <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-4 border-b bg-muted/20 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold min-w-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span className="truncate">{item?.title}</span>
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAskOpen(true)}
                  className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  ASK DLMS AI
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setUseCompatViewer((v) => !v)}
                  className="h-8 rounded-lg text-xs"
                  title="Switch viewer if the PDF does not load inline"
                >
                  {useCompatViewer ? "Direct view" : "Compat view"}
                </Button>
                {resolvedUrl && (
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-lg text-xs">
                    <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Open tab</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-muted/10 relative w-full h-full">
            {loadingUrl ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading inside DLMS…
              </div>
            ) : frameSrc ? (
              <iframe
                src={frameSrc}
                title={item?.title || "DLMS Reader"}
                className="w-full h-full border-0 absolute inset-0"
                allow="autoplay"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <QuickAskAiDialog
        open={askOpen}
        onOpenChange={setAskOpen}
        studentClass={item?.studentClass}
        subject={item?.subject}
        chapterTitle={item?.chapterTitle || item?.title}
      />
    </>
  );
}
