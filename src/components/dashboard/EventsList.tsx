import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";

export default function EventsList({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = async () => {
    const { data: ev } = await supabase.from("library_events").select("*")
      .eq("is_published", true).gte("event_date", new Date().toISOString()).order("event_date");
    setEvents(ev || []);
    const { data: my } = await supabase.from("event_registrations").select("event_id").eq("user_id", userId);
    setMine(new Set((my || []).map((x: any) => x.event_id)));
    const { data: r } = await supabase.from("event_registrations").select("event_id");
    const c: Record<string, number> = {};
    (r || []).forEach((x: any) => { c[x.event_id] = (c[x.event_id] || 0) + 1; });
    setCounts(c);
  };
  useEffect(() => { if (userId) load(); }, [userId]);

  const toggle = async (ev: any) => {
    if (mine.has(ev.id)) {
      await supabase.from("event_registrations").delete().eq("event_id", ev.id).eq("user_id", userId);
      toast({ title: "Registration cancelled" });
    } else {
      if (ev.capacity && (counts[ev.id] || 0) >= ev.capacity) {
        toast({ title: "Event full", variant: "destructive" }); return;
      }
      const { error } = await supabase.from("event_registrations").insert({ event_id: ev.id, user_id: userId });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "You're registered!" });
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" /> Library Events</h2>
        <p className="text-sm text-muted-foreground">Register for upcoming events.</p>
      </div>
      {events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(ev => {
          const registered = mine.has(ev.id);
          const full = ev.capacity && (counts[ev.id] || 0) >= ev.capacity && !registered;
          return (
            <Card key={ev.id} className="overflow-hidden flex flex-col">
              {ev.image_url && (
                <div className={`w-full relative bg-slate-100 ${ev.image_orientation === 'vertical' ? 'aspect-[3/4]' : 'h-48'}`}>
                  <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold">{ev.title}</h3>
                  {registered && <Badge className="gradient-primary text-primary-foreground">Registered</Badge>}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" />{new Date(ev.event_date).toLocaleString()}</p>
                {ev.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="h-3 w-3" />{ev.location}</p>}
                {ev.description && <p className="text-sm mb-3">{ev.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-4">
                  <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{counts[ev.id] || 0}{ev.capacity ? `/${ev.capacity}` : ""}</Badge>
                  <Button size="sm" variant={registered ? "outline" : "default"} disabled={!!full} onClick={() => toggle(ev)}>
                    {registered ? "Cancel" : full ? "Full" : "Register"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
