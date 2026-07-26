import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Users, Upload, FileText, Eye, Download, X, Paperclip } from "lucide-react";
import EventDetailModal from "@/components/dashboard/EventDetailModal";

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
    image_orientation: "horizontal"
  });
  // Existing schedule files (when editing)
  const [existingScheduleFiles, setExistingScheduleFiles] = useState<ScheduleFile[]>([]);

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
    setForm({ title: "", description: "", event_date: "", end_date: "", location: "", capacity: "", image_orientation: "horizontal" });
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

      let imageUrl = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user?.id || "admin"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("event-images").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      // Build event first to get ID (for editing) or insert
      const eventId = editingId || crypto.randomUUID();
      const allScheduleFiles = await uploadScheduleFiles(user?.id || "admin", eventId);

      const payload = {
        title: form.title,
        description: form.description || null,
        event_date: new Date(form.event_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        location: form.location || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        image_orientation: form.image_orientation,
        schedule_files: JSON.stringify(allScheduleFiles),
        ...(imageUrl && { image_url: imageUrl }),
      };

      let error;
      if (editingId) {
        ({ error } = await supabase.from("library_events").update(payload).eq("id", editingId));
      } else {
        ({ error } = await supabase.from("library_events").insert({
          ...payload,
          id: eventId,
          created_by: user?.id,
          image_url: imageUrl,
        }));
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
      event_date: new Date(ev.event_date).toISOString().slice(0, 16),
      end_date: ev.end_date ? new Date(ev.end_date).toISOString().slice(0, 16) : "",
      location: ev.location || "",
      capacity: ev.capacity ? String(ev.capacity) : "",
      image_orientation: ev.image_orientation || "horizontal",
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
          <p className="text-sm text-muted-foreground">Create events with schedules, guidelines &amp; day-wise files.</p>
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
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Capacity (optional)</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>

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
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setViewEvent(ev)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    variant={ev.is_published ? "secondary" : "default"}
                    className="flex-1 h-8 text-xs"
                    onClick={() => togglePublish(ev)}
                  >
                    {ev.is_published ? "Unpublish" : "Publish"}
                  </Button>
                </div>
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
    </div>
  );
}
