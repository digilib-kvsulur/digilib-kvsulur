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
import { Calendar, Plus, Trash2, Users } from "lucide-react";

export default function EventsManager() {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", location: "", capacity: "", image_orientation: "horizontal" });

  const load = async () => {
    const { data } = await supabase.from("library_events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);
    const { data: r } = await supabase.from("event_registrations").select("event_id");
    const counts: Record<string, number> = {};
    (r || []).forEach((x: any) => { counts[x.event_id] = (counts[x.event_id] || 0) + 1; });
    setRegs(counts);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title || !form.event_date) { toast({ title: "Title and date required", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let imageUrl = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user?.id || 'admin'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("event-images").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("event-images").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      let error;
      const payload = {
        title: form.title, 
        description: form.description || null,
        event_date: new Date(form.event_date).toISOString(),
        location: form.location || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        image_orientation: form.image_orientation,
        ...(imageUrl && { image_url: imageUrl }),
      };

      if (editingId) {
        ({ error } = await supabase.from("library_events").update(payload).eq("id", editingId));
      } else {
        ({ error } = await supabase.from("library_events").insert({
          ...payload,
          created_by: user?.id,
          image_url: imageUrl,
        }));
      }
      
      if (error) throw error;
      
      toast({ title: editingId ? "Event updated" : "Event created" });
      setOpen(false); 
      setEditingId(null);
      setForm({ title: "", description: "", event_date: "", location: "", capacity: "", image_orientation: "horizontal" });
      setFile(null);
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
      location: ev.location || "",
      capacity: ev.capacity ? String(ev.capacity) : "",
      image_orientation: ev.image_orientation || "horizontal"
    });
    setEditingId(ev.id);
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("library_events").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Library Events</h2>
          <p className="text-sm text-muted-foreground">Create events and see registrations.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingId(null); setForm({ title: "", description: "", event_date: "", location: "", capacity: "", image_orientation: "horizontal" }); setFile(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Date &amp; time</Label><Input type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Capacity (optional)</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
              <div>
                <Label>Event Image (Optional)</Label>
                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>Image Orientation</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.image_orientation} onChange={e => setForm({ ...form, image_orientation: e.target.value })}>
                  <option value="horizontal">Horizontal (Landscape)</option>
                  <option value="vertical">Vertical (Portrait)</option>
                </select>
              </div>
              <Button onClick={create} className="w-full" disabled={uploading}>
                {uploading ? "Saving..." : editingId ? "Save Changes" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {events.map(ev => (
          <Card key={ev.id} className="flex flex-col">
            {ev.image_url && (
              <div className="w-full relative bg-slate-100 border-b rounded-t-xl overflow-hidden">
                <img src={ev.image_url} alt={ev.title} className="w-full h-auto object-contain" style={{ maxHeight: '300px' }} />
              </div>
            )}
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{ev.title}</CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" /> {new Date(ev.event_date).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(ev)} className="text-indigo-600 hover:text-indigo-700">Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(ev.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {ev.description && <p className="text-sm text-muted-foreground mb-2">{ev.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                {ev.location && <Badge variant="outline">{ev.location}</Badge>}
                <Badge className="gradient-primary text-primary-foreground"><Users className="h-3 w-3 mr-1" />{regs[ev.id] || 0}{ev.capacity ? `/${ev.capacity}` : ""} registered</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No events yet.</p>}
      </div>
    </div>
  );
}
