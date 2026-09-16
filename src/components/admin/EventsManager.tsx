import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, Plus, Trash2, Users, Upload, FileText, Eye, Download, X, Paperclip, ClipboardCheck,
  Trophy, Medal, Award, Search, Sparkles, Send, CheckCircle2, UserPlus 
} from "lucide-react";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import { fromLocalDatetimeInput, toLocalDatetimeInput } from "@/lib/eventDeadlines";
import { 
  getEventWinners, 
  saveEventWinners, 
  releaseEventWinners, 
  EventWinnerInput 
} from "@/lib/eventWinnersService";
import { fetchAllApprovedStudents } from "@/lib/profileFetcher";
import { WinnerCertificateModal, WinnerCertModalData } from "./WinnerCertificateModal";

const EVENT_WINNER_PRESETS = [
  { position: "1st", titleEng: "🥇 First Position", titleHin: "प्रथम स्थान" },
  { position: "2nd", titleEng: "🥈 Second Position", titleHin: "द्वितीय स्थान" },
  { position: "3rd", titleEng: "🥉 Third Position", titleHin: "तृतीय स्थान" },
  { position: "merit", titleEng: "🎖️ Certificate of Merit", titleHin: "योग्यता प्रमाण-पत्र" },
  { position: "special", titleEng: "🌟 Special Outstanding Performance", titleHin: "विशेष प्रदर्शन पुरस्कार" },
  { position: "participation", titleEng: "📜 Certificate of Participation", titleHin: "सहभागिता प्रमाण-पत्र" },
];

interface ScheduleFile { name: string; url: string; type?: string; }

export default function EventsManager() {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scheduleFiles, setScheduleFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewEvent, setViewEvent] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", end_date: "", location: "", capacity: "",
    registration_deadline: "", submission_deadline: "",
    image_orientation: "horizontal",
    redirect_url: "",
    allow_submissions: false,
    submission_types: ["image", "pdf"] as string[],
    max_submission_days: 1
  });
  // Existing schedule files (when editing)
  const [existingScheduleFiles, setExistingScheduleFiles] = useState<ScheduleFile[]>([]);

  // Submissions state
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [eventSubmissions, setEventSubmissions] = useState<any[]>([]);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");

  // Event Winners Management state
  const [winnersModalOpen, setWinnersModalOpen] = useState(false);
  const [activeEventForWinners, setActiveEventForWinners] = useState<any | null>(null);
  const [winnerInputs, setWinnerInputs] = useState<EventWinnerInput[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [savingWinners, setSavingWinners] = useState(false);

  const defaultCollectionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [globalCollectionDate, setGlobalCollectionDate] = useState(defaultCollectionDate);
  const [globalCollectionVenue, setGlobalCollectionVenue] = useState("Central Library Counter");
  const [globalLibrarianNote, setGlobalLibrarianNote] = useState("Bring your student ID card to collect your certificate & award trophy during zero period.");

  const [certCustomization, setCertCustomization] = useState({
    generateCertificates: true,
    duringText: "",
    description: "",
    unlockAt: "",
  });

  const [evtCertModalOpen, setEvtCertModalOpen] = useState(false);
  const [evtCertModalData, setEvtCertModalData] = useState<WinnerCertModalData | null>(null);

  const openWinnersModal = async (ev: any) => {
    setActiveEventForWinners(ev);
    setCertCustomization({
      generateCertificates: true,
      duringText: `Annual Library Event 2026-2027 · ${ev.title}`,
      description: `For outstanding achievement in ${ev.title}`,
      unlockAt: "",
    });
    setLoadingWinners(true);

    try {
      // 1. Fetch existing winners
      const existing = await getEventWinners(ev.id, ev.title);
      if (existing && existing.length > 0) {
        setWinnerInputs(
          existing.map((w) => ({
            id: w.id,
            userId: w.userId,
            studentName: w.studentName,
            admissionNumber: w.admissionNumber,
            studentClass: w.studentClass,
            position: w.position,
            positionTitle: w.positionTitle,
            positionTitleHindi: w.positionTitleHindi,
            collectionDate: w.collectionDate || defaultCollectionDate,
            collectionVenue: w.collectionVenue || "Central Library Counter",
            librarianNote: w.librarianNote || "Bring your student ID card to collect your certificate & award trophy.",
            certificateId: w.certificateId,
          }))
        );
        if (existing[0].collectionDate) setGlobalCollectionDate(existing[0].collectionDate);
        if (existing[0].collectionVenue) setGlobalCollectionVenue(existing[0].collectionVenue);
        if (existing[0].librarianNote) setGlobalLibrarianNote(existing[0].librarianNote);
      } else {
        setWinnerInputs([]);
      }

      // 2. Load all student profiles without 1000 truncation limit
      const profs = await fetchAllApprovedStudents("id, first_name, last_name, student_class, admission_number");
      setAllStudents(profs || []);
      setWinnersModalOpen(true);
    } catch (err: any) {
      toast({ title: "Error loading winners", description: err?.message, variant: "destructive" });
    } finally {
      setLoadingWinners(false);
    }
  };

  const addStudentAsWinner = (student: any, preset = EVENT_WINNER_PRESETS[0]) => {
    if (winnerInputs.some((w) => w.userId === student.id)) {
      toast({ title: "Student already added as a winner" });
      return;
    }

    const name = `${student.first_name || ""} ${student.last_name || ""}`.trim();
    setWinnerInputs((prev) => [
      ...prev,
      {
        userId: student.id,
        studentName: name,
        admissionNumber: student.admission_number || "—",
        studentClass: student.student_class || "—",
        position: preset.position as any,
        positionTitle: preset.titleEng,
        positionTitleHindi: preset.titleHin,
        collectionDate: globalCollectionDate,
        collectionVenue: globalCollectionVenue,
        librarianNote: globalLibrarianNote,
      },
    ]);
  };

  const removeWinnerInput = (idx: number) => {
    setWinnerInputs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveWinners = async (isRelease: boolean) => {
    if (!activeEventForWinners) return;
    if (winnerInputs.length === 0) {
      toast({ title: "No winners added", description: "Please add at least one winner.", variant: "destructive" });
      return;
    }

    setSavingWinners(true);
    try {
      const preparedInputs = winnerInputs.map((w) => ({
        ...w,
        collectionDate: globalCollectionDate,
        collectionVenue: globalCollectionVenue,
        librarianNote: globalLibrarianNote,
      }));

      if (isRelease) {
        const res = await releaseEventWinners(
          activeEventForWinners.id,
          activeEventForWinners.title,
          preparedInputs,
          certCustomization
        );

        if (res.success) {
          toast({
            title: "🎉 Event Winners Released & Published!",
            description: `Successfully published ${res.releasedCount} winner(s). ${res.certsIssued} e-certificates generated and notifications/emails sent!`,
          });
          setWinnersModalOpen(false);
        } else {
          throw new Error(res.error);
        }
      } else {
        const res = await saveEventWinners(
          activeEventForWinners.id,
          activeEventForWinners.title,
          preparedInputs
        );

        if (res.success) {
          toast({
            title: "Draft Winners Saved",
            description: "Saved draft winner list. Click 'Release & Publish' when ready to send emails and issue certificates.",
          });
          setWinnersModalOpen(false);
        } else {
          throw new Error(res.error);
        }
      }
    } catch (err: any) {
      toast({ title: "Action Failed", description: err?.message || "Could not process winners.", variant: "destructive" });
    } finally {
      setSavingWinners(false);
    }
  };

  const loadSubmissions = async (eventId: string, title: string) => {
    setSelectedEventTitle(title);
    const { data, error } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("event_id", eventId)
      .order("day_number", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading submissions", description: error.message, variant: "destructive" });
      return;
    }
    const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id).filter(Boolean)));
    let profileMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, student_class, roll_number")
        .in("id", userIds);
      (profs || []).forEach((p: any) => { profileMap[p.id] = p; });
    }
    setEventSubmissions((data || []).map((s: any) => ({ ...s, profiles: profileMap[s.user_id] })));
    setSubmissionsOpen(true);
  };


  const load = async () => {
    const { data } = await supabase.from("library_events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);
    const { data: r } = await supabase.from("event_registrations").select("event_id");
    const counts: Record<string, number> = {};
    (r || []).forEach((x: any) => { counts[x.event_id] = (counts[x.event_id] || 0) + 1; });
    setRegs(counts);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      title: "", description: "", event_date: "", end_date: "", location: "", capacity: "",
      registration_deadline: "", submission_deadline: "",
      image_orientation: "horizontal",
      redirect_url: "",
      allow_submissions: false,
      submission_types: ["image", "pdf"],
      max_submission_days: 1
    });
    setFile(null);
    setScheduleFiles([]);
    setExistingScheduleFiles([]);
    setEditingId(null);
  };

  const uploadScheduleFiles = async (userId: string, eventId: string): Promise<ScheduleFile[]> => {
    const uploaded: ScheduleFile[] = [...existingScheduleFiles];
    for (const sf of scheduleFiles) {
      const ext = sf.name.split(".").pop();
      const safeName = sf.name.replace(/[^a-z0-9._-]/gi, "_");
      const path = `${userId}/${eventId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("event-images").upload(path, sf, {
        contentType: sf.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
      uploaded.push({ name: sf.name, url: pub.publicUrl, type: sf.type });
    }
    return uploaded;
  };

  const create = async () => {
    if (!form.title || !form.event_date) {
      toast({ title: "Title and start date required", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in as an admin to create or edit events.");
      }

      let imageUrl = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("event-images").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      // Build event first to get ID (for editing) or insert
      const eventId = editingId || crypto.randomUUID();
      const allScheduleFiles = await uploadScheduleFiles(user.id, eventId);

      const payload = {
        title: form.title,
        description: form.description || null,
        event_date: fromLocalDatetimeInput(form.event_date) || new Date(form.event_date).toISOString(),
        end_date: fromLocalDatetimeInput(form.end_date),
        registration_deadline: fromLocalDatetimeInput(form.registration_deadline),
        submission_deadline: fromLocalDatetimeInput(form.submission_deadline),
        location: form.location || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        image_orientation: form.image_orientation,
        redirect_url: form.redirect_url.trim() || null,
        schedule_files: JSON.stringify(allScheduleFiles),
        allow_submissions: form.allow_submissions,
        submission_types: form.submission_types,
        max_submission_days: form.max_submission_days,
        ...(imageUrl && { image_url: imageUrl }),
      };

      let error;
      if (editingId) {
        ({ error } = await supabase.from("library_events").update(payload).eq("id", editingId));
        if (error && (error.message?.includes("redirect_url") || error.code === "PGRST204")) {
          // Schema fallback if redirect_url column isn't in Supabase DB yet
          const fallbackPayload = { ...payload };
          delete (fallbackPayload as any).redirect_url;
          ({ error } = await supabase.from("library_events").update(fallbackPayload).eq("id", editingId));
        }
      } else {
        const insertPayload: any = {
          ...payload,
          id: eventId,
          created_by: user.id,
          image_url: imageUrl,
        };
        ({ error } = await supabase.from("library_events").insert(insertPayload));
        if (error && (error.message?.includes("redirect_url") || error.code === "PGRST204")) {
          delete insertPayload.redirect_url;
          ({ error } = await supabase.from("library_events").insert(insertPayload));
        }
      }

      if (error) throw error;
      toast({ title: editingId ? "Event updated" : "Event created" });
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (ev: any) => {
    setForm({
      title: ev.title,
      description: ev.description || "",
      event_date: toLocalDatetimeInput(ev.event_date),
      end_date: toLocalDatetimeInput(ev.end_date),
      registration_deadline: toLocalDatetimeInput(ev.registration_deadline),
      submission_deadline: toLocalDatetimeInput(ev.submission_deadline),
      location: ev.location || "",
      capacity: ev.capacity ? String(ev.capacity) : "",
      image_orientation: ev.image_orientation || "horizontal",
      redirect_url: ev.redirect_url || "",
      allow_submissions: ev.allow_submissions || false,
      submission_types: ev.submission_types || ["image", "pdf"],
      max_submission_days: ev.max_submission_days || 1
    });
    setEditingId(ev.id);
    // Load existing schedule files
    try {
      const sf = ev.schedule_files ? JSON.parse(ev.schedule_files) : [];
      setExistingScheduleFiles(Array.isArray(sf) ? sf : []);
    } catch { setExistingScheduleFiles([]); }
    setScheduleFiles([]);
    setFile(null);
    setOpen(true);
  };

  const removeExistingFile = (idx: number) => {
    setExistingScheduleFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("library_events").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  const togglePublish = async (ev: any) => {
    await supabase.from("library_events").update({ is_published: !ev.is_published }).eq("id", ev.id);
    toast({ title: ev.is_published ? "Event unpublished" : "Event published" });
    load();
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  const getFileIcon = (name: string) => {
    if (isImage(name)) return "🖼️";
    if (/\.pdf$/i.test(name)) return "📄";
    if (/\.docx?$/i.test(name)) return "📝";
    if (/\.xlsx?$/i.test(name)) return "📊";
    if (/\.pptx?$/i.test(name)) return "📋";
    return "📎";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Library Events</h2>
          <p className="text-sm text-muted-foreground">Create events with schedules, guidelines, and custom submissions.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New event</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date &amp; time *</Label><Input type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></div>
                <div><Label>End Date &amp; time (optional)</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Registration deadline</Label>
                  <Input type="datetime-local" value={form.registration_deadline} onChange={e => setForm({ ...form, registration_deadline: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground mt-1">Students can register only until this date/time (local).</p>
                </div>
                <div>
                  <Label>Submission / upload deadline</Label>
                  <Input type="datetime-local" value={form.submission_deadline} onChange={e => setForm({ ...form, submission_deadline: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground mt-1">Activity report uploads close after this date/time (local).</p>
                </div>
              </div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Capacity (optional)</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
              <div>
                <Label>Internal Page / Feature Redirect Link (Optional)</Label>
                <Input
                  value={form.redirect_url}
                  onChange={e => setForm({ ...form, redirect_url: e.target.value })}
                  placeholder="e.g. /catalog, /community, /quizzes, /games"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">Students can tap a button on the event card to jump directly to this internal page.</p>
              </div>

              {/* Event Image */}
              <div>
                <Label>Event Image (Optional)</Label>
                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                {file && <p className="text-xs text-muted-foreground mt-1">📷 {file.name}</p>}
              </div>

              <div>
                <Label>Image Orientation</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.image_orientation} onChange={e => setForm({ ...form, image_orientation: e.target.value })}>
                  <option value="horizontal">Horizontal (Landscape)</option>
                  <option value="vertical">Vertical (Portrait)</option>
                </select>
              </div>

              {/* Schedule / Guideline Files */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" /> Day-wise / Schedule / Guideline Files
                </Label>
                <p className="text-xs text-muted-foreground">Upload PDFs, Word docs, Excel sheets, images etc. that attendees can download.</p>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
                  onChange={e => setScheduleFiles(Array.from(e.target.files || []))}
                />
                {scheduleFiles.length > 0 && (
                  <div className="space-y-1">
                    {scheduleFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 rounded-lg px-2 py-1">
                        <span>{getFileIcon(f.name)}</span>
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Existing uploaded files */}
                {existingScheduleFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-600">Already uploaded:</p>
                    {existingScheduleFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                        <span>{getFileIcon(f.name)}</span>
                        <span className="truncate flex-1 font-medium">{f.name}</span>
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                        </a>
                        <button onClick={() => removeExistingFile(i)} className="text-rose-500 hover:text-rose-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submissions customization */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allow_submissions"
                    checked={form.allow_submissions}
                    onChange={e => setForm({ ...form, allow_submissions: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="allow_submissions" className="font-semibold text-slate-700">Allow Day-wise activity reports</Label>
                </div>
                {form.allow_submissions && (
                  <div className="space-y-3.5 pl-6 border-l-2 border-indigo-100">
                    <div>
                      <Label className="text-xs">Number of Days for submissions</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={form.max_submission_days}
                        onChange={e => setForm({ ...form, max_submission_days: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="h-8.5 rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Allowed Submission Formats</Label>
                      <div className="flex gap-4.5 mt-1.5">
                        {["image", "video", "pdf"].map(fmt => (
                          <label key={fmt} className="flex items-center space-x-1.5 text-xs capitalize cursor-pointer text-slate-600 font-medium">
                            <input
                              type="checkbox"
                              checked={form.submission_types.includes(fmt)}
                              onChange={e => {
                                const next = e.target.checked
                                  ? [...form.submission_types, fmt]
                                  : form.submission_types.filter((t: string) => t !== fmt);
                                setForm({ ...form, submission_types: next });
                              }}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{fmt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={create} className="w-full" disabled={uploading}>
                {uploading ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {events.map(ev => {
          const parsedFiles: ScheduleFile[] = (() => {
            try { return ev.schedule_files ? JSON.parse(ev.schedule_files) : []; } catch { return []; }
          })();
          return (
            <Card key={ev.id} className="flex flex-col hover:shadow-md transition-all overflow-hidden rounded-2xl border-border/60">
              {ev.image_url && (
                <div className="w-full relative bg-slate-100 border-b overflow-hidden" style={{ maxHeight: 180 }}>
                  <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" style={{ maxHeight: 180 }} />
                  {!ev.is_published && (
                    <span className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Draft
                    </span>
                  )}
                </div>
              )}
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold leading-tight line-clamp-2">{ev.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-indigo-600 hover:text-indigo-700 text-xs" onClick={() => handleEdit(ev)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-600 hover:bg-rose-50" onClick={() => remove(ev.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {(() => {
                      const start = new Date(ev.event_date);
                      const optionsDate = { month: "short", day: "numeric" } as const;
                      const optionsTime = { hour: "2-digit", minute: "2-digit" } as const;
                      const startStr = start.toLocaleDateString("en-IN", optionsDate) + " " + start.toLocaleTimeString("en-IN", optionsTime);
                      if (!ev.end_date) return startStr;
                      const end = new Date(ev.end_date);
                      if (start.toDateString() === end.toDateString()) {
                        return `${start.toLocaleDateString("en-IN", optionsDate)} ${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
                      } else {
                        return `${startStr} - ${end.toLocaleDateString("en-IN", optionsDate)} ${end.toLocaleTimeString("en-IN", optionsTime)}`;
                      }
                    })()}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-4 flex-1 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {ev.location && <Badge variant="outline" className="text-[10px]">{ev.location}</Badge>}
                  <Badge className="gradient-primary text-primary-foreground text-[10px]">
                    <Users className="h-3 w-3 mr-1" />{regs[ev.id] || 0}{ev.capacity ? `/${ev.capacity}` : ""} registered
                  </Badge>
                  {parsedFiles.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Paperclip className="h-3 w-3 mr-1" />{parsedFiles.length} file{parsedFiles.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {ev.allow_submissions && (
                    <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px]">
                      <ClipboardCheck className="h-3 w-3 mr-1 text-indigo-600" />Submissions
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setViewEvent(ev)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                  </Button>
                  {ev.allow_submissions && (
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50/50" onClick={() => loadSubmissions(ev.id, ev.title)}>
                      Submissions
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={ev.is_published ? "secondary" : "default"}
                    className="flex-1 h-8 text-xs"
                    onClick={() => togglePublish(ev)}
                  >
                    {ev.is_published ? "Unpublish" : "Publish"}
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-xs"
                  onClick={() => openWinnersModal(ev)}
                >
                  <Trophy className="h-3.5 w-3.5 mr-1.5" /> 🏆 Manage &amp; Release Winners
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-10">No events yet. Create one!</p>
        )}
      </div>

      {/* Admin Preview Modal */}
      <EventDetailModal
        event={viewEvent}
        open={!!viewEvent}
        onClose={() => setViewEvent(null)}
        registrationCount={viewEvent ? regs[viewEvent.id] || 0 : undefined}
      />

      {/* Admin View Submissions Modal */}
      {submissionsOpen && (
        <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                Student Submissions: {selectedEventTitle}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review files uploaded by registered students for activity days.
              </DialogDescription>
            </DialogHeader>

            {eventSubmissions.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-sm text-muted-foreground font-semibold">No activity reports submitted yet</p>
                <p className="text-xs text-muted-foreground/60">Registered students will upload their submissions here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-center">Day</TableHead>
                    <TableHead>File Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventSubmissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-semibold text-slate-800">
                        {sub.profiles?.first_name} {sub.profiles?.last_name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        Class {sub.profiles?.student_class || "—"}
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-sm text-indigo-600">
                        {sub.day_number}
                      </TableCell>
                      <TableCell className="text-xs uppercase font-bold text-slate-500">
                        {sub.file_type}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl" asChild>
                          <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 mr-1" /> View Report
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Admin Manage Event Winners Modal */}
      {winnersModalOpen && activeEventForWinners && (
        <Dialog open={winnersModalOpen} onOpenChange={setWinnersModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-2 border-amber-500/30">
            <div className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-b">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Trophy className="h-6 w-6 text-amber-500" />
                Manage Event Winners: {activeEventForWinners.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Select winners, set positions, specify physical certificate collection dates, and generate e-certificates with email notifications.
              </DialogDescription>
            </div>

            <div className="p-5 space-y-6">
              {/* Section A: Global Collection Details & Certificate Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40 border">
                <div>
                  <Label className="text-xs font-bold flex items-center gap-1.5 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-600" />
                    Physical Collection Date
                  </Label>
                  <Input
                    type="date"
                    value={globalCollectionDate}
                    onChange={(e) => setGlobalCollectionDate(e.target.value)}
                    className="h-8 text-xs font-semibold"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">When physical certificates &amp; trophies can be collected</span>
                </div>

                <div>
                  <Label className="text-xs font-bold flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    Collection Venue
                  </Label>
                  <Input
                    value={globalCollectionVenue}
                    onChange={(e) => setGlobalCollectionVenue(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="e.g. Central Library Counter"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    Librarian Instructions
                  </Label>
                  <Input
                    value={globalLibrarianNote}
                    onChange={(e) => setGlobalLibrarianNote(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Instructions for winners"
                  />
                </div>
              </div>

              {/* Certificate Customization Toggle */}
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={certCustomization.generateCertificates}
                      onChange={(e) => setCertCustomization({ ...certCustomization, generateCertificates: e.target.checked })}
                      className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span>📜 Auto-Generate &amp; Customise E-Certificates for Winners</span>
                  </label>
                  <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-100/50">
                    Bilingual Certificates
                  </Badge>
                </div>

                {certCustomization.generateCertificates && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/40">
                    <div>
                      <Label className="text-xs">Event Text / Subtitle on Certificate</Label>
                      <Input
                        value={certCustomization.duringText}
                        onChange={(e) => setCertCustomization({ ...certCustomization, duringText: e.target.value })}
                        placeholder="e.g. Annual Library Competition 2026-2027"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Certificate Description</Label>
                      <Input
                        value={certCustomization.description}
                        onChange={(e) => setCertCustomization({ ...certCustomization, description: e.target.value })}
                        placeholder="e.g. For outstanding performance in Library Event"
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section B: Search & Add Winner */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Add Winners ({winnerInputs.length} added)</span>
                  <span>Search across approved students</span>
                </Label>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student by name, class, or admission number..."
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                {studentSearch.trim().length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-xl divide-y bg-background shadow-sm">
                    {allStudents
                      .filter((s) => {
                        const q = studentSearch.toLowerCase();
                        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
                        const cls = (s.student_class || "").toLowerCase();
                        const admn = (s.admission_number || "").toLowerCase();
                        return name.includes(q) || cls.includes(q) || admn.includes(q);
                      })
                      .slice(0, 8)
                      .map((s) => {
                        const isAdded = winnerInputs.some((w) => w.userId === s.id);
                        return (
                          <div key={s.id} className="p-2 flex items-center justify-between hover:bg-muted/50 text-xs">
                            <div>
                              <strong className="text-foreground">{s.first_name} {s.last_name || ""}</strong>
                              <span className="text-muted-foreground ml-2">Class {s.student_class || "—"} · Admn #{s.admission_number || "—"}</span>
                            </div>
                            <Button
                              size="sm"
                              variant={isAdded ? "ghost" : "outline"}
                              disabled={isAdded}
                              className="h-7 text-xs"
                              onClick={() => {
                                addStudentAsWinner(s);
                                setStudentSearch("");
                              }}
                            >
                              {isAdded ? "Added" : "+ Add Winner"}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Section C: Current Selected Winners List */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground">Winner Position Details</Label>

                {winnerInputs.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed rounded-xl text-xs text-muted-foreground">
                    No winners selected yet. Search students above to add winners for this event.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {winnerInputs.map((w, idx) => (
                      <div key={w.userId + idx} className="p-3 border rounded-xl bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground">{w.studentName}</p>
                          <p className="text-xs text-muted-foreground">Class {w.studentClass} · Admn #{w.admissionNumber}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Position selector */}
                          <select
                            value={w.position}
                            onChange={(e) => {
                              const pos = e.target.value as any;
                              const preset = EVENT_WINNER_PRESETS.find((p) => p.position === pos);
                              setWinnerInputs((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        position: pos,
                                        positionTitle: preset ? preset.titleEng : item.positionTitle,
                                        positionTitleHindi: preset ? preset.titleHin : item.positionTitleHindi,
                                      }
                                    : item
                                )
                              );
                            }}
                            className="h-8 text-xs font-bold px-2 rounded-lg border bg-background"
                          >
                            {EVENT_WINNER_PRESETS.map((p) => (
                              <option key={p.position} value={p.position}>
                                {p.titleEng}
                              </option>
                            ))}
                          </select>

                          {/* Custom Title Input */}
                          <Input
                            value={w.positionTitle}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWinnerInputs((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, positionTitle: val } : item))
                              );
                            }}
                            className="h-8 text-xs w-44"
                            placeholder="Winner Title (English)"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => {
                              setEvtCertModalData({
                                userId: w.userId,
                                studentName: w.studentName,
                                studentClass: w.studentClass,
                                admissionNumber: w.admissionNumber,
                                awardTitle: w.positionTitle,
                                awardTitleHindi: w.positionTitleHindi,
                                eventSubtitle: activeEventForWinners.title,
                                description: `Awarded for winning ${w.positionTitle} in ${activeEventForWinners.title}.`,
                                certificateId: w.certificateId,
                                issuedAt: new Date().toISOString().slice(0, 10),
                              });
                              setEvtCertModalOpen(true);
                            }}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            {w.certificateId ? "Preview / Edit Cert" : "📜 Generate Cert"}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => removeWinnerInput(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Publishing dispatches automated emails &amp; triggers winner popup on student dashboard</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingWinners}
                  onClick={() => handleSaveWinners(false)}
                  className="flex-1 sm:flex-none text-xs font-semibold"
                >
                  Save Draft
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={savingWinners}
                  onClick={() => handleSaveWinners(true)}
                  className="flex-1 sm:flex-none text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {savingWinners ? "Releasing..." : "🚀 Release & Publish Winners"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Event Winner E-Certificate Generation & Preview Modal */}
      <WinnerCertificateModal
        open={evtCertModalOpen}
        onOpenChange={setEvtCertModalOpen}
        data={evtCertModalData}
        onCertificateIssued={(certId) => {
          if (evtCertModalData) {
            setWinnerInputs((prev) =>
              prev.map((item) =>
                item.userId === evtCertModalData.userId ? { ...item, certificateId: certId } : item
              )
            );
          }
        }}
      />
    </div>
  );
}
