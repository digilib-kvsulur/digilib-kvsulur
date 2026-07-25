import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users } from "lucide-react";

export default function EventsList({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filterType, setFilterType] = useState<string>("all");

  const load = async () => {
    const { data: ev } = await supabase.from("library_events").select("*")
      .eq("is_published", true).order("event_date", { ascending: true });
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

  const now = new Date();

  const getFilteredEvents = () => {
    return events.filter(ev => {
      const evDate = new Date(ev.event_date);
      if (filterType === "upcoming") {
        return evDate > now;
      } else if (filterType === "past") {
        return evDate < now;
      } else if (filterType === "ongoing") {
        // Ongoing if happening today (within ±12 hours)
        const diffMs = Math.abs(evDate.getTime() - now.getTime());
        return diffMs <= 12 * 60 * 60 * 1000;
      }
      return true; // all
    });
  };

  const visibleEvents = getFilteredEvents();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" /> Library Events</h2>
        <p className="text-sm text-muted-foreground">Register for reading events, book exhibitions, and quizzes.</p>
      </div>

      <Tabs defaultValue="all" value={filterType} onValueChange={setFilterType} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="mt-0">
          {visibleEvents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              No events found matching this status.
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleEvents.map(ev => {
                const registered = mine.has(ev.id);
                const full = ev.capacity && (counts[ev.id] || 0) >= ev.capacity && !registered;
                const isPast = new Date(ev.event_date) < now;

                return (
                  <Card key={ev.id} className="overflow-hidden border-border/60 hover:shadow-md transition-all flex flex-col">
                    {ev.image_url && (
                      <div className={`w-full relative bg-slate-50 ${ev.image_orientation === 'vertical' ? 'aspect-[4/3]' : 'h-48'}`}>
                        <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-foreground line-clamp-1">{ev.title}</h3>
                          {registered && <Badge className="gradient-primary text-primary-foreground text-[10px] font-bold">Registered</Badge>}
                          {isPast && <Badge variant="secondary" className="text-[10px] font-medium">Completed</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" />{new Date(ev.event_date).toLocaleString()}</p>
                        {ev.location && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" />{ev.location}</p>}
                        {ev.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{ev.description}</p>}
                      </div>
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                        <Badge variant="outline" className="text-[10px] font-semibold"><Users className="h-3.5 w-3.5 mr-1" />{counts[ev.id] || 0}{ev.capacity ? `/${ev.capacity}` : ""}</Badge>
                        {!isPast && (
                          <Button size="sm" variant={registered ? "outline" : "default"} disabled={!!full} onClick={() => toggle(ev)} className="h-8 text-xs font-bold rounded-xl px-4">
                            {registered ? "Cancel" : full ? "Full" : "Register"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
