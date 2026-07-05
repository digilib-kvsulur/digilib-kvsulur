import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Search, CheckCircle, AlertTriangle, FileX, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  book_id: string;
  accession_number: string | null;
  status: string;
  notes: string | null;
  audited_at: string;
  books?: { title: string; author: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
}

export default function InventoryAuditManager() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [selectedBookId, setSelectedBookId] = useState("");
  const [accessionNumber, setAccessionNumber] = useState("");
  const [status, setStatus] = useState("verified");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      // Load all books for catalog lookup
      const { data: booksData } = await supabase.from("books").select("id, title, author").order("title");
      setBooks(booksData || []);

      // Load recent audit logs
      const { data: auditLogs, error } = await supabase
        .from("book_audit_logs")
        .select("*, books(title, author), profiles:verified_by(first_name, last_name)")
        .order("audited_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setLogs((auditLogs as any[]) || []);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error loading audit logs", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAudit = async () => {
    if (!selectedBookId) {
      toast({ title: "Validation Error", description: "Please select a book to audit.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("book_audit_logs").insert({
        book_id: selectedBookId,
        accession_number: accessionNumber.trim() || null,
        status,
        verified_by: user.id,
        notes: notes.trim() || null
      });

      if (error) throw error;
      toast({ title: "Audit Logged", description: "Book copy audit recorded successfully!" });
      
      // Reset form
      setSelectedBookId("");
      setAccessionNumber("");
      setStatus("verified");
      setNotes("");
      
      loadData();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Audit Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "verified": return <Badge className="bg-success text-white hover:bg-success/80">Verified</Badge>;
      case "missing": return <Badge variant="destructive">Missing</Badge>;
      case "damaged": return <Badge className="bg-warning text-white hover:bg-warning/80">Damaged</Badge>;
      case "withdrawn": return <Badge className="bg-gray-500 text-white hover:bg-gray-600">Withdrawn</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "verified": return <CheckCircle className="h-4 w-4 text-success shrink-0" />;
      case "missing": return <FileX className="h-4 w-4 text-destructive shrink-0" />;
      case "damaged": return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
      default: return <ClipboardList className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  const filteredBooks = books.filter(b => 
    `${b.title} ${b.author}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0f1b3d]">Inventory Audit Mode</h2>
        <p className="text-sm text-muted-foreground">Verify copy status, log damage, report missing items, and record stock checks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Audit form */}
        <Card className="border-border/50 bg-white lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Record Audit Check
            </CardTitle>
            <CardDescription>Log condition of a book copy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Select Book</Label>
              <Input 
                placeholder="Type title or author to search..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="h-9 mb-2" 
              />
              <div className="max-h-40 overflow-y-auto border rounded-lg p-1.5 divide-y divide-border/40 bg-muted/10">
                {filteredBooks.slice(0, 10).map(b => (
                  <button 
                    key={b.id} 
                    type="button" 
                    onClick={() => { setSelectedBookId(b.id); setSearchQuery(`${b.title}`); }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted rounded transition-colors ${selectedBookId === b.id ? "bg-primary/15 font-semibold text-primary" : ""}`}
                  >
                    {b.title} <span className="text-[10px] text-muted-foreground">by {b.author}</span>
                  </button>
                ))}
                {filteredBooks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No matching books found</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="accession">Accession / Barcode Number</Label>
              <Input 
                id="accession" 
                placeholder="e.g. KV-ACC-1049" 
                value={accessionNumber} 
                onChange={e => setAccessionNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Copy Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified (On Shelf / Good)</SelectItem>
                  <SelectItem value="missing">Missing (Lost / Stolen)</SelectItem>
                  <SelectItem value="damaged">Damaged (Requires Repair)</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn (Scrapped / Disposed)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="audit-notes">Condition / Audit Notes</Label>
              <Input 
                id="audit-notes" 
                placeholder="e.g. verified on Shelf A-3" 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <Button onClick={handleCreateAudit} disabled={saving} className="w-full gradient-primary border-0 mt-2">
              <Plus className="h-4 w-4 mr-1" /> {saving ? "Logging..." : "Log Audit Check"}
            </Button>
          </CardContent>
        </Card>

        {/* Audit History Log */}
        <Card className="border-border/50 bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Audit History Registry</CardTitle>
            <CardDescription>Logs of stock audits and verified inventory conditions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No stock check audit logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Book Details</TableHead>
                      <TableHead>Barcode / Copy</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Audited By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell>
                          <div className="flex items-start gap-2">
                            {getStatusIcon(log.status)}
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground block truncate max-w-[200px]">{log.books?.title}</span>
                              {log.notes && <span className="text-[10px] text-muted-foreground italic block max-w-[200px] truncate">"{log.notes}"</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.accession_number ? (
                            <Badge variant="outline" className="font-mono text-[10px]">{log.accession_number}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="truncate max-w-[100px]">
                          {log.profiles?.first_name} {log.profiles?.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[10px]">
                          {new Date(log.audited_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
