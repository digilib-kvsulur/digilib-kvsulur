import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, Trash2, ShieldAlert, Upload, Plus, Printer, FileDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CondemnationBatch {
  id: string;
  batch_number: string;
  fund_source: string;
  created_at: string;
}

interface CondemnationEntry {
  id: string;
  accession_number: string;
  book_title: string;
  cost: number;
  discount_pct: number;
  discount_amount: number;
  rate: number;
  depreciation_amount: number;
  net_value: number;
  year_of_purchase: number;
  date_became_unserviceable: string;
  reason: string;
  fund_source: string;
}

export default function BookCondemnation() {
  const { toast } = useToast();
  const [batches, setBatches] = useState<CondemnationBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<CondemnationBatch | null>(null);
  const [entries, setEntries] = useState<CondemnationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Manual Entry Form State
  const [bookId, setBookId] = useState<string | null>(null);
  const [accession, setAccession] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [cost, setCost] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [reason, setReason] = useState("Damaged");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (activeBatch) loadEntries(activeBatch.id);
  }, [activeBatch]);

  const loadBatches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("condemnation_batches" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setBatches(data || []);
    setLoading(false);
  };

  const loadEntries = async (batchId: string) => {
    const { data } = await supabase
      .from("book_condemnations" as any)
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true });
    setEntries(data || []);
  };

  const createBatch = async (fundSource: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const batchNumber = `COND-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
    
    const { data, error } = await supabase
      .from("condemnation_batches" as any)
      .insert({
        batch_number: batchNumber,
        fund_source: fundSource,
        created_by: user?.id
      })
      .select()
      .single();
      
    if (error) {
      toast({ title: "Error creating batch", description: error.message, variant: "destructive" });
    } else if (data) {
      toast({ title: "Batch Created", description: `Batch ${batchNumber} created.` });
      await loadBatches();
      setActiveBatch(data);
    }
  };

  const searchBook = async () => {
    if (!accession.trim()) return;
    const { data, error } = await supabase
      .from("books")
      .select("id, title, first_added_at")
      .or(`accession_number.eq.${accession},accession_numbers.cs.{${accession}}`)
      .single();
      
    if (data) {
      setBookId(data.id);
      setTitle(data.title);
      if (data.first_added_at) {
        setYear(new Date(data.first_added_at).getFullYear());
      }
      toast({ title: "Book Found", description: data.title });
    } else {
      toast({ title: "Not Found", description: "Could not find a book with that accession number.", variant: "destructive" });
    }
  };

  const addManualEntry = async () => {
    if (!activeBatch || !accession || !title || cost <= 0) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase.rpc("condemn_book_v2", {
        p_batch_id: activeBatch.id,
        p_book_id: bookId,
        p_accession_number: accession,
        p_title: title,
        p_year: year,
        p_cost: cost,
        p_reason: reason,
        p_fund: activeBatch.fund_source
      });
      
      // We need to do a manual update to insert discount if not in RPC
      if (!error) {
        // Find the newly created entry and update its discount
        // Simplified approach: just rely on the RPC and load entries. The RPC doesn't take discount in args currently, 
        // but we can update it immediately after
        const { data: latestEntry } = await supabase
          .from("book_condemnations" as any)
          .select("id")
          .eq("batch_id", activeBatch.id)
          .eq("accession_number", accession)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        if (latestEntry && discount > 0) {
           await supabase.from("book_condemnations" as any).update({ discount_pct: discount }).eq("id", latestEntry.id);
        }
        
        toast({ title: "Added", description: "Book added to condemnation list." });
        setAccession(""); setTitle(""); setCost(0); setDiscount(0); setBookId(null);
        loadEntries(activeBatch.id);
      } else {
        throw error;
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBatch) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      let successCount = 0;
      
      setSaving(true);
      
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Expected CSV format: Accession, Title, Year, Cost, Discount, Reason
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
          const acc = cols[0];
          const tit = cols[1];
          const yr = parseInt(cols[2]) || new Date().getFullYear();
          const cst = parseFloat(cols[3]) || 0;
          const disc = parseFloat(cols[4]) || 0;
          const rsn = cols[5] || "Damaged";
          
          try {
            await supabase.rpc("condemn_book_v2", {
              p_batch_id: activeBatch.id,
              p_book_id: null,
              p_accession_number: acc,
              p_title: tit,
              p_year: yr,
              p_cost: cst,
              p_reason: rsn,
              p_fund: activeBatch.fund_source
            });
            
            const { data: latestEntry } = await supabase
              .from("book_condemnations" as any)
              .select("id")
              .eq("batch_id", activeBatch.id)
              .eq("accession_number", acc)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
              
            if (latestEntry && disc > 0) {
               await supabase.from("book_condemnations" as any).update({ discount_pct: disc }).eq("id", latestEntry.id);
            }
            successCount++;
          } catch(err) {
            console.error("Error adding row", err);
          }
        }
      }
      
      toast({ title: "Upload Complete", description: `Successfully added ${successCount} books.` });
      setSaving(false);
      loadEntries(activeBatch.id);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = "Accession,Title,Year,Cost,Discount,Reason\n1001,Sample Book,2020,500,0,Damaged";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'condemnation_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const removeEntry = async (id: string) => {
    if (!confirm("Remove this book from the batch?")) return;
    await supabase.from("book_condemnations" as any).delete().eq("id", id);
    if (activeBatch) loadEntries(activeBatch.id);
  };
  
  const printReport = () => {
    window.print();
  };

  if (activeBatch) {
    return (
      <div className="space-y-6 print:m-0 print:p-0">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActiveBatch(null)}>← Back</Button>
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Batch: {activeBatch.batch_number}</h2>
              <p className="text-sm text-muted-foreground">Fund: {activeBatch.fund_source}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={printReport} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" /> Print CS-49 Report
            </Button>
          </div>
        </div>

        {/* Printable Report Section */}
        <div className="hidden print:block font-serif space-y-4">
          <div className="text-center space-y-1 pb-4 border-b-2 border-black mb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider">KENDRIYA VIDYALAYA SULUR</h1>
            <h2 className="text-lg font-bold">PROFORMA FOR CONDEMNATION OF LIBRARY BOOKS (FORM CS-49)</h2>
            <p><strong>Batch:</strong> {activeBatch.batch_number} &nbsp; | &nbsp; <strong>Fund:</strong> {activeBatch.fund_source} &nbsp; | &nbsp; <strong>Date:</strong> {new Date().toLocaleDateString()}</p>
          </div>
          <table className="w-full text-[11px] border-collapse border border-black text-center">
            <thead>
              <tr>
                <th className="border border-black p-1">Sl. No.</th>
                <th className="border border-black p-1">Acc No.</th>
                <th className="border border-black p-1 text-left">Book Title</th>
                <th className="border border-black p-1">Yr. Purch.</th>
                <th className="border border-black p-1">Cost (₹)</th>
                <th className="border border-black p-1">Disc%</th>
                <th className="border border-black p-1">Disc (₹)</th>
                <th className="border border-black p-1">Rate (₹)</th>
                <th className="border border-black p-1">Dep% (₹)</th>
                <th className="border border-black p-1">Net Val (₹)</th>
                <th className="border border-black p-1">Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, idx) => (
                <tr key={e.id}>
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1">{e.accession_number}</td>
                  <td className="border border-black p-1 text-left">{e.book_title}</td>
                  <td className="border border-black p-1">{e.year_of_purchase}</td>
                  <td className="border border-black p-1">{Number(e.cost).toFixed(2)}</td>
                  <td className="border border-black p-1">{Number(e.discount_pct).toFixed(0)}%</td>
                  <td className="border border-black p-1">{Number(e.discount_amount).toFixed(2)}</td>
                  <td className="border border-black p-1">{Number(e.rate).toFixed(2)}</td>
                  <td className="border border-black p-1">{Number(e.depreciation_amount).toFixed(2)}</td>
                  <td className="border border-black p-1">{Number(e.net_value).toFixed(2)}</td>
                  <td className="border border-black p-1 text-[9px]">{e.reason}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-100">
                <td colSpan={4} className="border border-black p-1 text-right">TOTAL</td>
                <td className="border border-black p-1">{entries.reduce((sum, e) => sum + Number(e.cost), 0).toFixed(2)}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1">{entries.reduce((sum, e) => sum + Number(e.discount_amount), 0).toFixed(2)}</td>
                <td className="border border-black p-1">{entries.reduce((sum, e) => sum + Number(e.rate), 0).toFixed(2)}</td>
                <td className="border border-black p-1">{entries.reduce((sum, e) => sum + Number(e.depreciation_amount), 0).toFixed(2)}</td>
                <td className="border border-black p-1">{entries.reduce((sum, e) => sum + Number(e.net_value), 0).toFixed(2)}</td>
                <td className="border border-black p-1"></td>
              </tr>
            </tbody>
          </table>
          <div className="pt-24 flex justify-between px-10 items-end">
             <div className="text-center font-bold">
               <div>__________________________</div>
               <div className="mt-1">Librarian</div>
             </div>
             <div className="text-center font-bold">
               <div>__________________________</div>
               <div className="mt-1">Member 1</div>
             </div>
             <div className="text-center font-bold">
               <div>__________________________</div>
               <div className="mt-1">Member 2</div>
             </div>
             <div className="text-center font-bold">
               <div>__________________________</div>
               <div className="mt-1">Principal</div>
             </div>
          </div>
          <div className="pt-16 px-10 text-center font-bold italic">
            "Certified that the books mentioned above are unserviceable and recommended for write-off."
          </div>
        </div>

        <Card className="border-border/50 print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">Add Books to Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-muted/30 p-4 rounded-lg border border-border">
              <div className="md:col-span-2 space-y-2">
                <Label>Accession No.</Label>
                <div className="flex gap-2">
                   <Input value={accession} onChange={e => setAccession(e.target.value)} onBlur={searchBook} onKeyDown={e => e.key === 'Enter' && searchBook()} />
                   <Button size="icon" variant="secondary" onClick={searchBook}><Search className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label>Book Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Year of Purch.</Label>
                <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Cost (₹)</Label>
                <Input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Discount %</Label>
                <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
              </div>
              <div className="md:col-span-1">
                <Button onClick={addManualEntry} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-border">
              <div>
                 <h4 className="font-semibold text-sm">Bulk Upload (CSV)</h4>
                 <p className="text-xs text-muted-foreground mt-1">Format: Accession, Title, Year, Cost, Discount, Reason</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}><FileDown className="h-4 w-4 mr-2" /> Template</Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload CSV
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">Books in this Batch ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No books added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sl</TableHead>
                      <TableHead>Acc No</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Disc %</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Net Val</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e, idx) => (
                      <TableRow key={e.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{e.accession_number}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={e.book_title}>{e.book_title}</TableCell>
                        <TableCell>₹{Number(e.cost).toFixed(2)}</TableCell>
                        <TableCell>{e.discount_pct}%</TableCell>
                        <TableCell>₹{Number(e.rate).toFixed(2)}</TableCell>
                        <TableCell>₹{Number(e.net_value).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => removeEntry(e.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                             <Trash2 className="h-4 w-4" />
                           </Button>
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Book Condemnation</h2>
          <p className="text-sm text-muted-foreground">Manage and print Form CS-49 reports for unserviceable books.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Condemnation Batches</CardTitle>
            <CardDescription>Select a batch to view or create a new one.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createBatch("SCHOOL_FUND")} variant="outline" className="gap-2 text-primary border-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" /> New (School Fund)
            </Button>
            <Button onClick={() => createBatch("VVN_FUND")} className="gap-2">
              <Plus className="h-4 w-4" /> New (VVN Fund)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : batches.length === 0 ? (
             <p className="text-center text-muted-foreground py-8">No condemnation batches found.</p>
          ) : (
             <div className="space-y-2">
               {batches.map(b => (
                 <div key={b.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setActiveBatch(b)}>
                   <div>
                     <p className="font-semibold">{b.batch_number}</p>
                     <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <Badge variant={b.fund_source === 'VVN_FUND' ? 'default' : 'outline'}>{b.fund_source}</Badge>
                     <Button variant="ghost" size="sm">Open →</Button>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
