import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Search, RefreshCw, ExternalLink, Link,
  CheckCircle, XCircle, AlertTriangle, Upload, FileDown
} from "lucide-react";

const CLASSES = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const SUBJECTS = [
  "Mathematics","Science","Social Science","History","Geography","Civics",
  "Physics","Chemistry","Biology","English","Hindi","Sanskrit",
  "Economics","Political Science","Accountancy","Business Studies",
  "Computer Science","Environmental Science"
];

interface NcertBook {
  id: string;
  sourceType: "ncert" | "cbse";
  class: string;
  subject: string;
  title: string;
  url: string;
  status?: "ok" | "broken" | "restricted" | "unchecked";
  last_checked?: string;
}

export default function NcertCbseReview() {
  const [books, setBooks] = useState<NcertBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editBook, setEditBook] = useState<NcertBook | null>(null);
  const [deleteBook, setDeleteBook] = useState<NcertBook | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState<{sourceType: "ncert"|"cbse", class: string, subject: string, title: string, url: string}>({ sourceType: "ncert", class: "", subject: "", title: "", url: "" });

  useEffect(() => { loadBooks(); }, []);

  const loadBooks = async () => {
    setLoading(true);
    
    const { data: ncertData, error: err1 } = await supabase.from("ncert_books").select("*").order("class_number", { ascending: true });
    const { data: cbseData, error: err2 } = await supabase.from("cbse_curriculum").select("*").order("class_number", { ascending: true });
    
    if (err1 || err2) { toast.error("Failed to load NCERT/CBSE data"); setLoading(false); return; }

    const mappedNcert: NcertBook[] = (ncertData || []).map((r: any) => ({
      id: r.id,
      sourceType: "ncert",
      class: r.class_number,
      subject: r.subject,
      title: r.chapter_title || r.book_name || "Untitled",
      url: r.file_url,
      status: "unchecked",
    }));

    const mappedCbse: NcertBook[] = (cbseData || []).map((r: any) => ({
      id: r.id,
      sourceType: "cbse",
      class: r.class_number,
      subject: r.subject,
      title: r.chapter_title || r.category || "Untitled",
      url: r.file_url,
      status: "unchecked",
    }));

    setBooks([...mappedNcert, ...mappedCbse]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.class || !form.subject || !form.title || !form.url) {
      toast.error("All fields are required");
      return;
    }
    
    const table = form.sourceType === "ncert" ? "ncert_books" : "cbse_curriculum";
    const payload = form.sourceType === "ncert" ? {
      class_number: form.class,
      subject: form.subject,
      chapter_title: form.title,
      file_url: form.url,
      book_name: form.title, // fallback
    } : {
      class_number: form.class,
      subject: form.subject,
      chapter_title: form.title,
      file_url: form.url,
      category: "Manual Entry", // fallback
    };

    if (editBook) {
      const { error } = await supabase.from(table).update(payload).eq("id", editBook.id);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Book updated successfully");
      setEditBook(null);
    } else {
      const { error } = await supabase.from(table).insert(payload);
      if (error) { toast.error("Insert failed"); return; }
      toast.success("Book added successfully");
      setAddOpen(false);
    }
    setForm({ sourceType: "ncert", class: "", subject: "", title: "", url: "" });
    loadBooks();
  };

  const handleDelete = async () => {
    if (!deleteBook) return;
    const table = deleteBook.sourceType === "ncert" ? "ncert_books" : "cbse_curriculum";
    const { error } = await supabase.from(table).delete().eq("id", deleteBook.id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Deleted successfully");
    setDeleteBook(null);
    loadBooks();
  };

  const verifyLink = async (book: NcertBook) => {
    setVerifying(book.id);
    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: "unchecked" } : b));
    try {
      const urlToCheck = book.url;
      const isDrive = urlToCheck.includes("drive.google.com");
      
      if (isDrive) {
        // Try to convert to preview link and check
        const match = urlToCheck.match(/\/d\/([^/]+)/);
        const fileId = match ? match[1] : null;
        if (fileId) {
          const previewUrl = `https://drive.google.com/file/d/${fileId}/view`;
          const res = await fetch(previewUrl, { method: "HEAD", mode: "no-cors" });
          // no-cors means we can't check status — mark as potentially restricted
          setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: "restricted" } : b));
        } else {
          setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: "broken" } : b));
        }
      } else {
        const res = await fetch(urlToCheck, { method: "HEAD", mode: "no-cors" });
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: "ok" } : b));
      }
    } catch {
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, status: "broken" } : b));
    } finally {
      setVerifying(null);
    }
  };

  const verifyAll = async () => {
    for (const book of filtered) {
      await verifyLink(book);
    }
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").slice(1); // skip header
      let count = 0;
      for (const line of lines) {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 4) continue;
        const [cls, subject, title, url] = parts;
        if (!cls || !subject || !title || !url) continue;
        const { error } = await supabase.from("ncert_books").insert({
          class_number: cls, subject, chapter_title: title, book_name: title, file_url: url
        });
        if (!error) count++;
      }
      toast.success(`Imported ${count} books`);
      loadBooks();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportCSV = () => {
    const header = "class,subject,title,url\n";
    const rows = books.map(b => `"${b.class}","${b.subject}","${b.title}","${b.url}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ncert_cbse_books.csv";
    a.click();
  };

  const statusIcon = (s?: string) => {
    if (s === "ok") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === "broken") return <XCircle className="w-4 h-4 text-red-500" />;
    if (s === "restricted") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <span className="w-4 h-4 rounded-full bg-slate-200 inline-block" />;
  };

  const statusBadge = (s?: string) => {
    if (s === "ok") return <Badge className="bg-green-100 text-green-700 border-green-200">OK</Badge>;
    if (s === "broken") return <Badge className="bg-red-100 text-red-700 border-red-200">Broken</Badge>;
    if (s === "restricted") return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Restricted</Badge>;
    return <Badge variant="outline" className="text-slate-400">Unchecked</Badge>;
  };

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q);
    const matchClass = filterClass === "all" || b.class === filterClass;
    const matchSubject = filterSubject === "all" || b.subject === filterSubject;
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchClass && matchSubject && matchStatus;
  });

  const openEdit = (book: NcertBook) => {
    setForm({ sourceType: book.sourceType, class: book.class, subject: book.subject, title: book.title, url: book.url });
    setEditBook(book);
  };

  const openAdd = () => {
    setForm({ sourceType: "ncert", class: "", subject: "", title: "", url: "" });
    setAddOpen(true);
  };

  const totalOk = books.filter(b => b.status === "ok").length;
  const totalBroken = books.filter(b => b.status === "broken").length;
  const totalRestricted = books.filter(b => b.status === "restricted").length;

  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">NCERT &amp; CBSE Data Review</h2>
          <p className="text-sm text-muted-foreground">Manage, verify, and fix NCERT/CBSE book links and metadata.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <FileDown className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={verifyAll}>
            <Link className="w-4 h-4 mr-1" /> Verify All Links
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1">
            <Plus className="w-4 h-4" /> Add Book
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black">{books.length}</div>
            <div className="text-xs text-muted-foreground">Total Books</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-green-700">{totalOk}</div>
            <div className="text-xs text-green-600">Links OK</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-amber-700">{totalRestricted}</div>
            <div className="text-xs text-amber-600">Restricted</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-red-700">{totalBroken}</div>
            <div className="text-xs text-red-600">Broken Links</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search title or subject..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-28 h-9"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
            <SelectItem value="broken">Broken</SelectItem>
            <SelectItem value="unchecked">Unchecked</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={loadBooks}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Link Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No NCERT books found. Click "Add Book" to add one.</TableCell></TableRow>
                ) : filtered.map(book => (
                  <TableRow key={book.id}>
                    <TableCell className="font-bold">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${book.sourceType === 'ncert' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          {book.sourceType}
                        </Badge>
                        <span>Class {book.class}</span>
                      </div>
                    </TableCell>
                    <TableCell>{book.subject}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="truncate font-medium">{book.title}</div>
                      <a href={book.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block max-w-[240px]">
                        {book.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusBadge(book.status)}
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={verifying === book.id}
                          onClick={() => verifyLink(book)}
                        >
                          {verifying === book.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Link className="w-3 h-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(book.url, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(book)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteBook(book)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen || !!editBook} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditBook(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editBook ? "Edit Material" : "Add NCERT/CBSE Material"}</DialogTitle>
            <DialogDescription>Fill in the details and provide the PDF/Drive link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editBook && (
              <div className="space-y-1.5">
                <Label>Source Type</Label>
                <Select value={form.sourceType} onValueChange={(v: "ncert"|"cbse") => setForm(f => ({ ...f, sourceType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ncert">NCERT Book Chapter</SelectItem>
                    <SelectItem value="cbse">CBSE Curriculum Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={form.class} onValueChange={v => setForm(f => ({ ...f, class: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Book Title</Label>
              <Input placeholder="e.g., Mathematics Part I" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>PDF / Drive URL</Label>
              <Input placeholder="https://ncert.nic.in/..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Paste the NCERT PDF link or Google Drive share link.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditBook(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editBook ? "Save Changes" : "Add Book"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteBook} onOpenChange={(o) => !o && setDeleteBook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteBook?.title}</strong> will be permanently removed from study materials. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
