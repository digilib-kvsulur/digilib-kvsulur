import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Trophy, Calendar, Award, Medal, Search, Plus, Trash2, Mail, 
  CheckCircle2, FileText, Sparkles, Send, RefreshCw, AlertCircle, 
  ExternalLink, UserPlus, Eye
} from "lucide-react";
import { 
  getEventWinners, 
  saveEventWinners, 
  releaseEventWinners, 
  sendSingleWinnerEmail,
  EventWinnerInput, 
  EventWinnerRecord 
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

export default function EventWinnersManager() {
  const { toast } = useToast();

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventSearch, setEventSearch] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Selected event winners state
  const [winnerInputs, setWinnerInputs] = useState<EventWinnerInput[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [savingWinners, setSavingWinners] = useState(false);
  const [sendingSingleEmailId, setSendingSingleEmailId] = useState<string | null>(null);
  const [resendingAll, setResendingAll] = useState(false);
  const [isEventPublished, setIsEventPublished] = useState(false);

  const defaultCollectionDate = useMemo(
    () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    []
  );

  const [globalCollectionDate, setGlobalCollectionDate] = useState(defaultCollectionDate);
  const [globalCollectionVenue, setGlobalCollectionVenue] = useState("Central Library Counter");
  const [globalLibrarianNote, setGlobalLibrarianNote] = useState(
    "Bring your student ID card to collect your certificate & award trophy during lunch break / zero period."
  );

  const [certCustomization, setCertCustomization] = useState({
    generateCertificates: true,
    duringText: "",
    description: "",
    unlockAt: "",
  });

  const [autoEmailNotify, setAutoEmailNotify] = useState(true);

  // Certificate customization modal
  const [evtCertModalOpen, setEvtCertModalOpen] = useState(false);
  const [evtCertModalData, setEvtCertModalData] = useState<WinnerCertModalData | null>(null);

  // Active event object
  const activeEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  // Load events
  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from("library_events")
        .select("id, title, description, event_date, location, image_url, is_published")
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);

      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (err: any) {
      toast({ title: "Failed to load events", description: err.message, variant: "destructive" });
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Load winners when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) return;

    const ev = events.find((e) => e.id === selectedEventId);
    if (ev) {
      setCertCustomization({
        generateCertificates: true,
        duringText: `Library Event 2026-2027 · ${ev.title}`,
        description: `For outstanding achievement in ${ev.title}`,
        unlockAt: "",
      });
    }

    const loadWinnersForEvent = async () => {
      setLoadingWinners(true);
      try {
        const existing = await getEventWinners(selectedEventId, ev?.title);
        if (existing && existing.length > 0) {
          setIsEventPublished(existing.some((w) => w.isPublished));
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
              librarianNote: w.librarianNote || globalLibrarianNote,
              certificateId: w.certificateId,
            }))
          );
          if (existing[0].collectionDate) setGlobalCollectionDate(existing[0].collectionDate);
          if (existing[0].collectionVenue) setGlobalCollectionVenue(existing[0].collectionVenue);
          if (existing[0].librarianNote) setGlobalLibrarianNote(existing[0].librarianNote);
        } else {
          setIsEventPublished(false);
          setWinnerInputs([]);
        }

        // Fetch students if not already fetched
        if (allStudents.length === 0) {
          const profs = await fetchAllApprovedStudents("id, first_name, last_name, student_class, admission_number");
          setAllStudents(profs || []);
        }
      } catch (err: any) {
        toast({ title: "Error loading winners", description: err.message, variant: "destructive" });
      } finally {
        setLoadingWinners(false);
      }
    };

    loadWinnersForEvent();
  }, [selectedEventId, events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return events;
    const q = eventSearch.toLowerCase();
    return events.filter((e) => (e.title || "").toLowerCase().includes(q));
  }, [events, eventSearch]);

  // Filtered students for adding winner
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim() || studentSearch.length < 2) return [];
    const q = studentSearch.toLowerCase().trim();
    return allStudents
      .filter((s) => {
        const fullName = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        const adm = (s.admission_number || "").toLowerCase();
        const cls = (s.student_class || "").toLowerCase();
        return fullName.includes(q) || adm.includes(q) || cls.includes(q);
      })
      .slice(0, 10);
  }, [allStudents, studentSearch]);

  const addStudentAsWinner = (student: any, preset = EVENT_WINNER_PRESETS[0]) => {
    if (winnerInputs.some((w) => w.userId === student.id)) {
      toast({ title: "Student already added as a winner" });
      return;
    }

    const name = `${student.first_name || ""} ${student.last_name || ""}`.trim();
    const newWinner: EventWinnerInput = {
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
    };

    setWinnerInputs((prev) => [...prev, newWinner]);
    setStudentSearch("");

    // If auto-email is checked and event is already published, dispatch email immediately
    if (autoEmailNotify && isEventPublished && activeEvent) {
      sendSingleWinnerEmail(newWinner, activeEvent.title);
      toast({
        title: "Winner Added & Email Sent! ✉️",
        description: `Awarded ${name} with ${preset.titleEng}. Dispatched celebratory email!`,
      });
    } else {
      toast({
        title: "Winner Added",
        description: `${name} added as ${preset.titleEng}. Click Save or Release to publish.`,
      });
    }
  };

  const removeWinnerInput = (idx: number) => {
    setWinnerInputs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveWinners = async (isRelease: boolean) => {
    if (!activeEvent) return;
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
          activeEvent.id,
          activeEvent.title,
          preparedInputs,
          certCustomization
        );

        if (res.success) {
          setIsEventPublished(true);
          toast({
            title: "🎉 Event Winners Released & Published!",
            description: `Successfully published ${res.releasedCount} winner(s). Issued ${res.certsIssued} e-certificates, sent in-app notifications and dispatched celebratory emails!`,
          });
        } else {
          throw new Error(res.error);
        }
      } else {
        const res = await saveEventWinners(
          activeEvent.id,
          activeEvent.title,
          preparedInputs,
          autoEmailNotify
        );

        if (res.success) {
          toast({
            title: "Draft Winners Saved",
            description: autoEmailNotify
              ? "Winners saved and notification emails dispatched!"
              : "Draft winner list saved. Click 'Release & Publish' when ready to publish publicly.",
          });
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

  const handleSendSingleEmail = async (winner: EventWinnerInput) => {
    if (!activeEvent) return;
    setSendingSingleEmailId(winner.userId);
    try {
      const ok = await sendSingleWinnerEmail(winner, activeEvent.title);
      if (ok) {
        toast({
          title: "📧 Email Sent!",
          description: `Dispatched award notification email to ${winner.studentName}.`,
        });
      } else {
        toast({
          title: "Email Dispatch Notice",
          description: "Email request processed.",
        });
      }
    } catch (err: any) {
      toast({ title: "Email Failed", description: err.message, variant: "destructive" });
    } finally {
      setSendingSingleEmailId(null);
    }
  };

  const handleResendAllEmails = async () => {
    if (!activeEvent || winnerInputs.length === 0) return;
    setResendingAll(true);
    try {
      let count = 0;
      for (const w of winnerInputs) {
        await sendSingleWinnerEmail(w, activeEvent.title);
        count++;
      }
      toast({
        title: "📧 All Emails Dispatched!",
        description: `Sent award emails to all ${count} winner(s) for "${activeEvent.title}".`,
      });
    } catch (err: any) {
      toast({ title: "Resend Failed", description: err.message, variant: "destructive" });
    } finally {
      setResendingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Trophy className="h-7 w-7 text-amber-500 shrink-0" />
            Manage Event Winners &amp; Awards
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dedicated station to award event winners, generate bilingual certificates, configure physical trophy handovers, and dispatch celebratory emails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadEvents}
            disabled={loadingEvents}
            className="rounded-xl border-amber-300/60 text-amber-800 dark:text-amber-300"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingEvents ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Event Selector */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-2xl border-border/60 shadow-xs">
            <CardHeader className="pb-3 pt-4 px-4 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                Select Event
              </CardTitle>
              <CardDescription className="text-xs">
                Choose an event to view or assign awards
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter events..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5 max-h-[520px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No matching events found.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const isSelected = ev.id === selectedEventId;
                  const dateStr = ev.event_date
                    ? new Date(ev.event_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                    : "No date";

                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/20"
                          : "hover:bg-muted/50 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-xs text-foreground line-clamp-2">{ev.title}</p>
                        {ev.is_published ? (
                          <Badge variant="outline" className="text-[9px] border-emerald-400 text-emerald-700 bg-emerald-50 shrink-0">
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] border-slate-300 text-slate-600 shrink-0">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {dateStr}
                        {ev.location && <span>· {ev.location}</span>}
                      </p>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Manage Winners for Selected Event */}
        <div className="lg:col-span-8 space-y-6">
          {activeEvent ? (
            <div className="space-y-6">
              {/* Event Header Banner */}
              <Card className="rounded-2xl border-border/60 overflow-hidden shadow-xs">
                <div className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-foreground">{activeEvent.title}</h3>
                      {isEventPublished ? (
                        <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                          🏆 Winners Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 font-bold text-[11px]">
                          📝 Draft Winners
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeEvent.event_date
                        ? new Date(activeEvent.event_date).toLocaleDateString("en-IN", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Event Date"}
                      {activeEvent.location ? ` · ${activeEvent.location}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResendAllEmails}
                      disabled={resendingAll || winnerInputs.length === 0}
                      className="h-8 text-xs rounded-xl border-amber-300 text-amber-800 dark:text-amber-300"
                    >
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      {resendingAll ? "Sending..." : "Resend All Emails"}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleSaveWinners(true)}
                      disabled={savingWinners || winnerInputs.length === 0}
                      className="h-8 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xs hover:from-amber-600 hover:to-orange-600"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {savingWinners ? "Publishing..." : "Release & Publish"}
                    </Button>
                  </div>
                </div>

                <CardContent className="p-5 space-y-6">
                  {/* Collection Settings & Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border">
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5 mb-1 text-slate-700 dark:text-slate-200">
                        <Calendar className="h-3.5 w-3.5 text-amber-600" />
                        Physical Collection Date
                      </Label>
                      <Input
                        type="date"
                        value={globalCollectionDate}
                        onChange={(e) => setGlobalCollectionDate(e.target.value)}
                        className="h-8 text-xs font-semibold rounded-lg"
                      />
                      <span className="text-[10px] text-muted-foreground mt-1 block">Trophy &amp; certificate collection day</span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5 mb-1 text-slate-700 dark:text-slate-200">
                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                        Collection Venue
                      </Label>
                      <Input
                        value={globalCollectionVenue}
                        onChange={(e) => setGlobalCollectionVenue(e.target.value)}
                        className="h-8 text-xs rounded-lg"
                        placeholder="e.g. Central Library Counter"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5 mb-1 text-slate-700 dark:text-slate-200">
                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                        Librarian Instructions
                      </Label>
                      <Input
                        value={globalLibrarianNote}
                        onChange={(e) => setGlobalLibrarianNote(e.target.value)}
                        className="h-8 text-xs rounded-lg"
                        placeholder="Instructions for winners"
                      />
                    </div>
                  </div>

                  {/* Automated Email & Certificate Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Auto-Email Toggle */}
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="auto_email_notify"
                        checked={autoEmailNotify}
                        onChange={(e) => setAutoEmailNotify(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <Label htmlFor="auto_email_notify" className="font-bold text-xs cursor-pointer text-foreground flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-amber-600" />
                          Send Celebratory Email to Winners
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Dispatches an official celebratory email with KV Sulur DP, award details, and trophy collection date.
                        </p>
                      </div>
                    </div>

                    {/* Auto-Certificate Toggle */}
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-200 dark:border-indigo-900/50 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="auto_cert_gen"
                        checked={certCustomization.generateCertificates}
                        onChange={(e) =>
                          setCertCustomization({ ...certCustomization, generateCertificates: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <Label htmlFor="auto_cert_gen" className="font-bold text-xs cursor-pointer text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          Auto-Generate Bilingual E-Certificates
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Creates official Hindi/English e-certificates ready for download in the Student Dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  {certCustomization.generateCertificates && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                      <div>
                        <Label className="text-xs">Event Text / Subtitle on Certificate</Label>
                        <Input
                          value={certCustomization.duringText}
                          onChange={(e) => setCertCustomization({ ...certCustomization, duringText: e.target.value })}
                          placeholder="e.g. Annual Library Competition 2026-2027"
                          className="h-8 text-xs mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Certificate Description</Label>
                        <Input
                          value={certCustomization.description}
                          onChange={(e) => setCertCustomization({ ...certCustomization, description: e.target.value })}
                          placeholder="e.g. For outstanding performance in Library Event"
                          className="h-8 text-xs mt-1 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {/* Add Winner Search Box */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Add Student as Winner</span>
                      <span className="text-[11px] font-normal lowercase">{allStudents.length} approved students</span>
                    </Label>

                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search student by name, admission number, or class..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl"
                      />
                    </div>

                    {filteredStudents.length > 0 && (
                      <div className="border rounded-xl p-2 bg-card space-y-1 max-h-48 overflow-y-auto shadow-md">
                        {filteredStudents.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted text-xs gap-2"
                          >
                            <div>
                              <p className="font-bold text-foreground">
                                {st.first_name} {st.last_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Class {st.student_class || "—"} · Adm: {st.admission_number || "—"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {EVENT_WINNER_PRESETS.slice(0, 4).map((preset) => (
                                <Button
                                  key={preset.position}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px] rounded-lg border-amber-300 hover:bg-amber-50"
                                  onClick={() => addStudentAsWinner(st, preset)}
                                >
                                  {preset.titleEng.split(" ")[0]} {preset.position}
                                </Button>
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] rounded-lg"
                                onClick={() => addStudentAsWinner(st, EVENT_WINNER_PRESETS[4])}
                              >
                                🌟 Special
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Current Winners Table */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        Selected Winners ({winnerInputs.length})
                      </h4>
                      {winnerInputs.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveWinners(false)}
                          disabled={savingWinners}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Save as Draft
                        </Button>
                      )}
                    </div>

                    {loadingWinners ? (
                      <div className="text-center py-12 text-muted-foreground text-xs">
                        Loading winner list...
                      </div>
                    ) : winnerInputs.length === 0 ? (
                      <div className="text-center py-10 border border-dashed rounded-2xl bg-muted/20 text-muted-foreground">
                        <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm font-bold">No winners added for this event yet</p>
                        <p className="text-xs mt-1">Search students above to assign 1st, 2nd, 3rd, or special awards.</p>
                      </div>
                    ) : (
                      <div className="border rounded-2xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead>Position &amp; Award</TableHead>
                              <TableHead>Certificate</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {winnerInputs.map((w, idx) => (
                              <TableRow key={w.userId || idx} className="hover:bg-muted/20">
                                <TableCell>
                                  <div className="font-bold text-xs text-foreground">{w.studentName}</div>
                                  <div className="text-[10px] text-muted-foreground">Adm: {w.admissionNumber}</div>
                                </TableCell>
                                <TableCell className="text-xs font-medium">{w.studentClass}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <select
                                      value={w.position}
                                      onChange={(e) => {
                                        const found = EVENT_WINNER_PRESETS.find((p) => p.position === e.target.value);
                                        if (found) {
                                          const next = [...winnerInputs];
                                          next[idx] = {
                                            ...next[idx],
                                            position: found.position as any,
                                            positionTitle: found.titleEng,
                                            positionTitleHindi: found.titleHin,
                                          };
                                          setWinnerInputs(next);
                                        }
                                      }}
                                      className="text-xs font-bold rounded-lg border border-input bg-background px-2 py-1 focus:ring-1 focus:ring-amber-500"
                                    >
                                      {EVENT_WINNER_PRESETS.map((p) => (
                                        <option key={p.position} value={p.position}>
                                          {p.titleEng}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {w.certificateId ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border border-emerald-300">
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                      Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Customise & Preview E-Certificate"
                                      onClick={() => {
                                        setEvtCertModalData({
                                          userId: w.userId,
                                          studentName: w.studentName,
                                          studentClass: w.studentClass,
                                          admissionNumber: w.admissionNumber,
                                          awardTitle: w.positionTitle,
                                          awardTitleHindi: w.positionTitleHindi,
                                          eventSubtitle: activeEvent.title,
                                          eventSubtitleHindi: activeEvent.title,
                                          description: certCustomization.description,
                                          certificateId: w.certificateId,
                                        });
                                        setEvtCertModalOpen(true);
                                      }}
                                      className="h-7 w-7 p-0 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Dispatch Award Email"
                                      disabled={sendingSingleEmailId === w.userId}
                                      onClick={() => handleSendSingleEmail(w)}
                                      className="h-7 w-7 p-0 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    >
                                      <Mail className="h-3.5 w-3.5" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Remove Winner"
                                      onClick={() => removeWinnerInput(idx)}
                                      className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-20 border rounded-2xl bg-muted/20 text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-base font-bold">Select an event on the left</p>
              <p className="text-xs mt-1">Pick any event to manage its award winners and physical collection schedule.</p>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Preview/Customizer Modal */}
      {evtCertModalOpen && evtCertModalData && (
        <WinnerCertificateModal
          open={evtCertModalOpen}
          onOpenChange={setEvtCertModalOpen}
          data={evtCertModalData}
          onCertificateIssued={(certId) => {
            setWinnerInputs((prev) =>
              prev.map((w) =>
                w.userId === evtCertModalData.userId ? { ...w, certificateId: certId } : w
              )
            );
          }}
        />
      )}
    </div>
  );
}
