import { useEffect, useMemo, useState } from "react";
import { Mail, Send, Search, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Profile = { id: string; first_name: string | null; last_name: string | null; student_class: string | null; admission_number: string | null; notification_email: string | null; notification_email_confirmed_at: string | null };
const presets = [
  ["library_update", "Library update"], ["due_reminder", "Book return reminder"], ["event_invite", "Event invitation"], ["certificate_notice", "Certificate available"],
] as const;

export default function EmailCampaignManager() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]), [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(""), [preset, setPreset] = useState("library_update"), [message, setMessage] = useState(""), [sending, setSending] = useState(false);
  const load = async () => { const { data } = await supabase.from("profiles").select("id, first_name, last_name, student_class, admission_number, notification_email, notification_email_confirmed_at").eq("is_approved", true).order("first_name"); setProfiles((data as Profile[]) || []); };
  useEffect(() => { load(); }, []);
  const verified = profiles.filter(p => p.notification_email_confirmed_at && p.notification_email);
  const visible = useMemo(() => verified.filter(p => `${p.first_name} ${p.last_name} ${p.admission_number} ${p.student_class}`.toLowerCase().includes(search.toLowerCase())), [verified, search]);
  const toggle = (id: string) => setSelected(old => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const send = async () => { if (!selected.size) return toast({ title: "Select recipients", description: "Choose at least one verified email recipient.", variant: "destructive" }); setSending(true); const { data, error } = await supabase.functions.invoke("send-email-campaign", { body: { recipientIds: [...selected], preset, customMessage: message } }); setSending(false); if (error) return toast({ title: "Email not sent", description: error.message, variant: "destructive" }); toast({ title: "Email campaign sent", description: `${data.sent} email(s) sent. ${data.skipped || 0} skipped.` }); setSelected(new Set()); setMessage(""); };
  return <Card className="border-primary/20"><CardHeader><CardTitle className="flex gap-2 text-lg"><Mail className="h-5 w-5 text-primary" />Verified email & preset campaigns</CardTitle><CardDescription>{verified.length} of {profiles.length} approved users have confirmed an update email. Select users—no addresses need to be typed.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2"><div className="space-y-3"><div className="flex gap-2"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, admission no. or class" /><Button variant="outline" onClick={() => setSelected(new Set(visible.map(p => p.id)))}>Select shown</Button></div><div className="max-h-64 overflow-y-auto rounded-lg border p-1">{visible.map(p => <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded p-2 text-sm hover:bg-muted"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /><span className="flex-1">{p.first_name} {p.last_name} <span className="text-xs text-muted-foreground">{p.admission_number ? `· ${p.admission_number}` : ""} {p.student_class ? `· ${p.student_class}` : ""}</span></span><Badge variant="outline" className="text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />Verified</Badge></label>)}{!visible.length && <p className="p-4 text-center text-sm text-muted-foreground">No verified update emails found.</p>}</div></div><div className="space-y-3"><div><Label>Preset</Label><Select value={preset} onValueChange={setPreset}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{presets.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Optional personal note</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} placeholder="Add event date, reminder, or short instructions…" /></div><Button className="w-full" onClick={send} disabled={sending || !selected.size}><Send className="mr-2 h-4 w-4" />{sending ? "Sending…" : `Send preset email (${selected.size})`}</Button></div></CardContent></Card>;
}
