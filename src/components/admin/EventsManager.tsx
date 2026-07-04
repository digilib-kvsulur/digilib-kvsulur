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
  const [form, setForm] = useState({ title: "", description: "", event_date: "", location: "", capacity: "" });

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
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("library_events").insert({
      title: form.title, description: form.description || null,
      event_date: new Date(form.event_date).toISOString(),
      location: form.location || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      created_by: user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event created" });
    setOpen(false); setForm({ title: "", description: "", event_date: "", location: "", capacity: "" });
    load();
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Date &amp; time</Label><Input type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Capacity (optional)</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(ev => (
          <Card key={ev.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{ev.title}</CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" /> {new Date(ev.event_date).toLocaleString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(ev.id)}><Trash2 className="h-4 w-4" /></Button>
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
