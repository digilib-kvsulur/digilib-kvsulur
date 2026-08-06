import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, Download, FileText, Eye, Clock, X, CloudUpload, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { formatDeadline, isRegistrationClosed, isSubmissionClosed } from "@/lib/eventDeadlines";

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
  
  // Student report submissions state
  const [submissions, setSubmissions] = useState<Record<number, any>>({});
  const [uploadingDay, setUploadingDay] = useState<number | null>(null);
  const [submittingNote, setSubmittingNote] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && event && isRegistered && event.allow_submissions) {
      loadUserSubmissions();
    }
  }, [open, event?.id, isRegistered]);

  const loadUserSubmissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("event_id", event.id)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      const map: Record<number, any> = {};
      (data || []).forEach((s: any) => { map[s.day_number] = s; });
      setSubmissions(map);
    } catch (e) {
      console.error("Error loading submissions:", e);
    }
  };

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

  const submissionClosed = isSubmissionClosed(event);
  const registrationClosed = isRegistrationClosed(event);

  const handleFileUpload = async (dayNum: number, file: File) => {
    if (!file) return;
    if (submissionClosed) {
      toast({
        title: "Submissions closed",
        description: event.submission_deadline
          ? `Deadline was ${formatDeadline(event.submission_deadline)}.`
          : "The submission window for this event has ended.",
        variant: "destructive",
      });
      return;
    }
    setUploadingDay(dayNum);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
      const path = `${user.id}/${event.id}/day-${dayNum}-${Date.now()}-${safeName}`;

      // Upload file to Supabase storage bucket "event-submissions"
      const { error: upErr } = await supabase.storage
        .from("event-submissions")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("event-submissions").getPublicUrl(path);

      // Save submission entry to database
      const { error: dbErr } = await supabase.from("event_submissions").upsert({
        event_id: event.id,
        user_id: user.id,
        day_number: dayNum,
        file_url: pub.publicUrl,
        file_type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "pdf",
      }, { onConflict: "event_id,user_id,day_number" });

      if (dbErr) throw dbErr;

      toast({ title: `Day ${dayNum} activity report uploaded successfully!` });
      loadUserSubmissions();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingDay(null);
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
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const isUpcoming = eventDate > new Date();

  const formatDateRange = () => {
    const optionsDate = { weekday: "long", year: "numeric", month: "long", day: "numeric" } as const;
    const optionsTime = { hour: "2-digit", minute: "2-digit" } as const;
    
    const startFormatted = eventDate.toLocaleDateString("en-IN", optionsDate) + " " + eventDate.toLocaleTimeString("en-IN", optionsTime);
    if (!endDate) return startFormatted;

    if (eventDate.toDateString() === endDate.toDateString()) {
      return `${eventDate.toLocaleDateString("en-IN", optionsDate)} ${eventDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return `${startFormatted} - ${endDate.toLocaleDateString("en-IN", optionsDate)} ${endDate.toLocaleTimeString("en-IN", optionsTime)}`;
    }
  };

  // Determine accepted file formats string
  const allowedFormats = event.submission_types || ["image", "pdf"];
  const acceptedTypes = allowedFormats.map((fmt: string) => {
    if (fmt === "image") return "image/*";
    if (fmt === "video") return "video/*";
    if (fmt === "pdf") return ".pdf";
    return "";
  }).filter(Boolean).join(",");

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {/* Cover image */}
          {event.image_url && (
            <div className="w-full overflow-hidden rounded-t-2xl relative" style={{ height: 260 }}>
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
          )}
          <div className="p-6 space-y-5">
            <DialogHeader className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {isUpcoming && (
                  <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
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
              <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                {event.title}
              </DialogTitle>
            </DialogHeader>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <Calendar className="h-4 w-4" />
                {formatDateRange()}
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
              {event.registration_deadline && (
                <div className={`flex items-center gap-2 font-medium ${registrationClosed ? "text-rose-600" : "text-slate-500"}`}>
                  <Clock className="h-4 w-4" />
                  Register by {formatDeadline(event.registration_deadline)}
                  {registrationClosed ? " (closed)" : ""}
                </div>
              )}
              {event.submission_deadline && (
                <div className={`flex items-center gap-2 font-medium ${submissionClosed ? "text-rose-600" : "text-slate-500"}`}>
                  <Clock className="h-4 w-4" />
                  Submit by {formatDeadline(event.submission_deadline)}
                  {submissionClosed ? " (closed)" : ""}
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

            {/* Day-wise activity reports upload block (visible only to registered students) */}
            {isRegistered && event.allow_submissions && (
              <div className="space-y-3.5 border-t pt-4">
                <h4 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                  Day-wise Activity Submissions
                </h4>
                <p className="text-xs text-muted-foreground">Submit your day-wise reports, images, or files as requested.</p>
                {submissionClosed && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                    Submission deadline has passed
                    {event.submission_deadline ? ` (${formatDeadline(event.submission_deadline)})` : ""} — uploads are closed.
                  </p>
                )}
                {!submissionClosed && event.submission_deadline && (
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    Uploads open until {formatDeadline(event.submission_deadline)}.
                  </p>
                )}

                <div className="space-y-2.5">
                  {Array.from({ length: event.max_submission_days || 1 }).map((_, i) => {
                    const dayNum = i + 1;
                    const sub = submissions[dayNum];
                    
                    return (
                      <div key={dayNum} className="border border-slate-150 rounded-xl p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-indigo-150 transition-colors">
                        <div className="space-y-1">
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            Day {dayNum}
                          </span>
                          {sub ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline truncate max-w-[180px]">
                                View Submitted Report
                              </a>
                              <span className="text-[10px] text-slate-400">({sub.file_type})</span>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic mt-1.5">No report uploaded yet</p>
                          )}
                        </div>

                        <div>
                          {submissionClosed ? (
                            <span className="text-[10px] font-semibold text-slate-400">Closed</span>
                          ) : uploadingDay === dayNum ? (
                            <Button disabled size="sm" className="h-8.5 rounded-xl text-xs gap-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" /> Uploading...
                            </Button>
                          ) : (
                            <div className="relative">
                              <input
                                type="file"
                                accept={acceptedTypes}
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) handleFileUpload(dayNum, f);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Button size="sm" variant="outline" className="h-8.5 rounded-xl text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50">
                                <CloudUpload className="h-3.5 w-3.5 text-slate-500" />
                                {sub ? "Replace File" : "Upload Report"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Registration button — driven by registration_deadline, not event start */}
            {onToggleRegister && (isRegistered || !registrationClosed) && (
              <div className="pt-2 border-t border-slate-100">
                <Button
                  className={`w-full h-11 font-bold rounded-xl text-sm ${
                    isRegistered
                      ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                  disabled={!isRegistered && (!!isFull || registrationClosed)}
                  onClick={() => { onToggleRegister(event); onClose(); }}
                >
                  {isRegistered
                    ? "Cancel Registration"
                    : isFull
                      ? "Event Full"
                      : registrationClosed
                        ? "Registration Closed"
                        : "Register for Event"}
                </Button>
              </div>
            )}
            {onToggleRegister && !isRegistered && registrationClosed && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-center text-sm font-semibold text-rose-600 py-2">
                  Registration closed
                  {event.registration_deadline ? ` on ${formatDeadline(event.registration_deadline)}` : ""}.
                </p>
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
