import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Download, FileText, Eye, Clock, X } from "lucide-react";

interface ScheduleFile {
  name: string;
  url: string;
  type?: string;
}

interface EventDetailModalProps {
  event: any | null;
  open: boolean;
  onClose: () => void;
  /** If provided, allows the user to register/unregister */
  onToggleRegister?: (ev: any) => void;
  isRegistered?: boolean;
  isFull?: boolean;
  isPast?: boolean;
  registrationCount?: number;
}

export default function EventDetailModal({
  event,
  open,
  onClose,
  onToggleRegister,
  isRegistered,
  isFull,
  isPast,
  registrationCount,
}: EventDetailModalProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!event) return null;

  const scheduleFiles: ScheduleFile[] = (() => {
    try {
      if (!event.schedule_files) return [];
      if (Array.isArray(event.schedule_files)) return event.schedule_files;
      return JSON.parse(event.schedule_files);
    } catch {
      return [];
    }
  })();

  const handleDownload = async (file: ScheduleFile) => {
    try {
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (e) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const isImage = (name: string) =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  const isPdf = (name: string) => /\.pdf$/i.test(name);
  const getFileIcon = (name: string) => {
    if (isImage(name)) return "🖼️";
    if (isPdf(name)) return "📄";
    if (/\.docx?$/i.test(name)) return "📝";
    if (/\.xlsx?$/i.test(name)) return "📊";
    if (/\.pptx?$/i.test(name)) return "📋";
    return "📎";
  };

  const eventDate = new Date(event.event_date);
  const isUpcoming = eventDate > new Date();

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {/* Hero image */}
          {event.image_url && (
            <div className="relative w-full overflow-hidden rounded-t-2xl bg-slate-100" style={{ maxHeight: 280 }}>
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
                style={{ maxHeight: 280 }}
              />
              {/* Status badge */}
              <div className="absolute top-4 left-4 flex gap-2">
                {isUpcoming && (
                  <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    Upcoming
                  </span>
                )}
                {!isUpcoming && (
                  <span className="bg-slate-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    Completed
                  </span>
                )}
                {isRegistered && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    Registered ✓
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="p-6 space-y-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                {event.title}
              </DialogTitle>
            </DialogHeader>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <Calendar className="h-4 w-4" />
                {eventDate.toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Clock className="h-4 w-4" />
                {eventDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </div>
              )}
              {(registrationCount !== undefined || event.capacity) && (
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Users className="h-4 w-4" />
                  {registrationCount ?? 0}{event.capacity ? ` / ${event.capacity}` : ""} registered
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
                {event.description}
              </p>
            )}

            {/* Schedule / Guideline Files */}
            {scheduleFiles.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Event Documents &amp; Schedules
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scheduleFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
                    >
                      <span className="text-xl shrink-0">{getFileIcon(f.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
                        {f.type && (
                          <p className="text-[10px] text-slate-400 uppercase">{f.type}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(isImage(f.name) || isPdf(f.name)) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                            onClick={() => setPreviewUrl(f.url)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                          onClick={() => handleDownload(f)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scheduleFiles.length === 0 && (
              <div className="text-center py-3 text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                No schedule files uploaded for this event yet.
              </div>
            )}

            {/* Registration button */}
            {onToggleRegister && !isPast && (
              <div className="pt-2 border-t border-slate-100">
                <Button
                  className={`w-full h-11 font-bold rounded-xl text-sm ${
                    isRegistered
                      ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                  disabled={!!isFull}
                  onClick={() => { onToggleRegister(event); onClose(); }}
                >
                  {isRegistered ? "Cancel Registration" : isFull ? "Event Full" : "Register for Event"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] p-2 overflow-hidden">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm font-semibold text-slate-700">Preview</span>
              <Button size="sm" variant="ghost" onClick={() => setPreviewUrl(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {isImage(previewUrl) ? (
              <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full rounded-lg border"
                style={{ height: "80vh" }}
                title="Document Preview"
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
