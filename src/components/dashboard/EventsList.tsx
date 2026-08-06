import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, FileText, Paperclip, ChevronRight } from "lucide-react";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import { formatDeadline, isRegistrationClosed } from "@/lib/eventDeadlines";

export default function EventsList({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

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

    // Keep selected event in sync with fresh deadlines from DB
    if (selectedEvent?.id && ev) {
      const fresh = ev.find((x: any) => x.id === selectedEvent.id);
      if (fresh) setSelectedEvent(fresh);
    }
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const toggle = async (ev: any) => {
    if (mine.has(ev.id)) {
      await supabase.from("event_registrations").delete().eq("event_id", ev.id).eq("user_id", userId);
      toast({ title: "Registration cancelled" });
    } else {
      if (isRegistrationClosed(ev)) {
        toast({
          title: "Registration closed",
          description: ev.registration_deadline
            ? `Deadline was ${formatDeadline(ev.registration_deadline)}.`
            : "The registration window for this event has ended.",
          variant: "destructive",
        });
        return;
      }
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
      if (filterType === "upcoming") return evDate > now;
      if (filterType === "past") return evDate < now;
      if (filterType === "ongoing") {
        const diffMs = Math.abs(evDate.getTime() - now.getTime());
        return diffMs <= 12 * 60 * 60 * 1000;
      }
      return true;
    });
  };

  const getScheduleFileCount = (ev: any): number => {
    try {
      if (!ev.schedule_files) return 0;
      const parsed = JSON.parse(ev.schedule_files);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch { return 0; }
  };

  const visibleEvents = getFilteredEvents();
  const selectedRegistered = selectedEvent ? mine.has(selectedEvent.id) : false;
  const selectedFull = selectedEvent ? (selectedEvent.capacity && (counts[selectedEvent.id] || 0) >= selectedEvent.capacity && !selectedRegistered) : false;
  const selectedPast = selectedEvent ? new Date(selectedEvent.end_date || selectedEvent.event_date) < now : false;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" /> Library Events</h2>
        <p className="text-sm text-muted-foreground">Register for events. Click any event to view schedule files &amp; details.</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {visibleEvents.map(ev => {
                const registered = mine.has(ev.id);
                const full = ev.capacity && (counts[ev.id] || 0) >= ev.capacity && !registered;
                const isPast = new Date(ev.end_date || ev.event_date) < now;
                const regClosed = isRegistrationClosed(ev, now);
                const fileCount = getScheduleFileCount(ev);

                return (
                  <Card
                    key={ev.id}
                    className="overflow-hidden border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer group rounded-2xl"
                    onClick={() => setSelectedEvent(ev)}
                  >
                    {ev.image_url && (
                      <div className={`w-full relative bg-slate-50 overflow-hidden ${ev.image_orientation === "vertical" ? "aspect-[3/4]" : "h-40"}`}>
                        <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {registered && (
                          <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                            Registered ✓
                          </span>
                        )}
                        {isPast && (
                          <span className="absolute top-2 right-2 bg-slate-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                            Completed
                          </span>
                        )}
                        {!registered && regClosed && (
                          <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                            Reg. closed
                          </span>
                        )}
                      </div>
                    )}
                    <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-bold text-sm text-foreground line-clamp-2 flex-1 group-hover:text-primary transition-colors">{ev.title}</h3>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
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
                        {ev.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />{ev.location}
                          </p>
                        )}
                        {ev.registration_deadline && (
                          <p className={`text-[10px] font-semibold ${regClosed ? "text-rose-600" : "text-slate-500"}`}>
                            Register by {formatDeadline(ev.registration_deadline)}
                            {regClosed ? " · closed" : ""}
                          </p>
                        )}
                        {ev.submission_deadline && (
                          <p className="text-[10px] font-semibold text-slate-500">
                            Submit by {formatDeadline(ev.submission_deadline)}
                          </p>
                        )}
                        {ev.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            <Users className="h-3 w-3 mr-1" />{counts[ev.id] || 0}{ev.capacity ? `/${ev.capacity}` : ""}
                          </Badge>
                          {fileCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-semibold">
                              <Paperclip className="h-3 w-3 mr-1" />{fileCount} file{fileCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        {(registered || !regClosed) ? (
                          <Button
                            size="sm"
                            variant={registered ? "outline" : "default"}
                            disabled={!registered && (!!full || regClosed)}
                            onClick={e => { e.stopPropagation(); toggle(ev); }}
                            className="h-8 text-xs font-bold rounded-xl px-4"
                          >
                            {registered ? "Cancel" : full ? "Full" : "Register"}
                          </Button>
                        ) : (
                          <span className="text-xs text-rose-500 font-semibold">Reg. closed</span>
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

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onToggleRegister={toggle}
        isRegistered={selectedRegistered}
        isFull={!!selectedFull}
        isPast={selectedPast}
        registrationCount={selectedEvent ? counts[selectedEvent.id] || 0 : undefined}
      />
    </div>
  );
}
