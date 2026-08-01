import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Search, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookRow { id: string; title: string; author: string; accession_number: string | null; total_copies: number; available_copies: number; }
interface Condemnation { id: string; book_title: string; accession_number: string | null; copies: number; reason: string; book_condition: string | null; notes: string | null; condemned_at: string; }

const REASONS = ["Damaged", "Lost", "Worn Out", "Outdated", "Missing Pages", "Water Damage", "Other"];
const CONDITIONS = ["Poor", "Unusable", "Destroyed", "Missing"];

export default function BookCondemnation() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState<BookRow[]>([]);
  const [history, setHistory] = useState<Condemnation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<BookRow | null>(null);
  const [copies, setCopies] = useState("1");
  const [reason, setReason] = useState(REASONS[0]);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("book_condemnations" as any)
      .select("*")
      .order("condemned_at", { ascending: false })
      .limit(100);
    setHistory((data as any) || []);
  };

  const runSearch = async () => {
    if (!search.trim()) { setBooks([]); return; }
    setLoading(true);
    const q = search.trim();
    const { data } = await supabase
      .from("books")
      .select("id,title,author,accession_number,total_copies,available_copies")
      .or(`title.ilike.%${q}%,author.ilike.%${q}%,accession_number.ilike.%${q}%`)
      .limit(25);
    setBooks(data || []);
    setLoading(false);
  };

  const submit = async () => {
    if (!selected) return;
    const n = Math.max(1, Number(copies) || 1);
    if (n > selected.total_copies) {
      toast({ title: "Too many copies", description: `Only ${selected.total_copies} copies exist.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("book_condemnations" as any).insert({
        book_id: selected.id,
        accession_number: selected.accession_number,
        book_title: selected.title,
        copies: n,
        reason,
        book_condition: condition,
        notes: notes.trim() || null,
        condemned_by: user?.id ?? null,
      } as any);
      if (insErr) throw insErr;

      const { error: updErr } = await supabase.from("books").update({
        total_copies: Math.max(0, selected.total_copies - n),
        available_copies: Math.max(0, selected.available_copies - n),
      }).eq("id", selected.id);
      if (updErr) throw updErr;

      toast({ title: "Book condemned", description: `${n} copy(ies) of "${selected.title}" withdrawn from stock.` });
      setSelected(null); setCopies("1"); setNotes("");
      runSearch(); loadHistory();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Book Condemnation</h2>
          <p className="text-sm text-muted-foreground">Withdraw damaged or lost copies from the shelf and keep an audit trail.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Find a Book</CardTitle>
          <CardDescription>Search by title, author or accession number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} placeholder="e.g. 10245 or Wings of Fire" />
            <Button onClick={runSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            {books.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.author} · Acc. {b.accession_number || "—"} · {b.available_copies}/{b.total_copies} available
                  </p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => { setSelected(b); setCopies("1"); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Condemn
                </Button>
              </div>
            ))}
            {!loading && search && books.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No matching books.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Condemnation Register</CardTitle>
          <CardDescription>Recent withdrawals from the collection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No books condemned yet.</p>}
          {history.map(h => (
            <div key={h.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{h.book_title}</p>
                <p className="text-xs text-muted-foreground">
                  Acc. {h.accession_number || "—"} · {h.copies} copy(ies) · {new Date(h.condemned_at).toLocaleDateString()}
                </p>
                {h.notes && <p className="text-xs text-muted-foreground mt-1 italic">{h.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="destructive" className="text-[10px]">{h.reason}</Badge>
                {h.book_condition && <Badge variant="outline" className="text-[10px]">{h.book_condition}</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Condemn Book
            </DialogTitle>
            <DialogDescription>
              "{selected?.title}" — copies will be permanently removed from available stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Copies to condemn</Label>
              <Input type="number" min={1} max={selected?.total_copies || 1} value={copies} onChange={e => setCopies(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1" placeholder="Details for the register…" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Confirm Condemnation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
