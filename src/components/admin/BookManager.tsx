import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, BookOpen, Search, CheckSquare, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BulkImportBooks from "./BulkImportBooks";
import { fetchBookByQuery } from "@/lib/bookApi";

interface Book {
  id: string;
  title: string;
  author: string;
  accession_number?: string;
  language?: string;
  subject?: string;
  class_level?: string;
  category?: string;
  description?: string;
  total_copies: number;
  available_copies: number;
  cover_url?: string;
}

interface BookFormData {
  title: string;
  author: string;
  accession_number: string;
  language: string;
  category: string;
  subject: string;
  class_level: string;
  description: string;
  total_copies: number;
  cover_url: string;
}

const emptyForm: BookFormData = {
  title: '', author: '', accession_number: '', language: '', category: '', subject: '', class_level: '', description: '', total_copies: 1, cover_url: '',
};

const BookManager = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEdit, setBulkEdit] = useState({ category: "", language: "", subject: "", class_level: "" });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [formData, setFormData] = useState<BookFormData>(emptyForm);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchAllProgress, setFetchAllProgress] = useState("");
  const { toast } = useToast();

  useEffect(() => { loadBooks(); }, []);

  const loadBooks = async () => {
    try {
      // Fetch ALL books using pagination (Supabase default limit is 1000)
      let allBooks: Book[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allBooks = [...allBooks, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setBooks(allBooks);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load books", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        author: formData.author,
        accession_number: formData.accession_number.trim() || null,
        language: formData.language.trim() || null,
        category: formData.category.trim() || null,
        subject: formData.subject.trim() || null,
        class_level: formData.class_level.trim() || null,
        description: formData.description.trim() || null,
        cover_url: formData.cover_url.trim() || null,
        total_copies: formData.total_copies,
      };
      if (editingBook) {
        const { error } = await supabase.from('books').update({
          ...payload,
          available_copies: editingBook.available_copies + (formData.total_copies - editingBook.total_copies),
        }).eq('id', editingBook.id);
        if (error) throw error;
        toast({ title: "Success", description: "Book updated" });
      } else {
        const { error } = await supabase.from('books').insert({ ...payload, available_copies: formData.total_copies });
        if (error) throw error;
        toast({ title: "Success", description: "Book added" });
      }
      setShowAddDialog(false); setEditingBook(null); setFormData(emptyForm); loadBooks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save book", variant: "destructive" });
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title, author: book.author,
      accession_number: book.accession_number || '',
      language: book.language || '',
      category: book.category || '', subject: book.subject || '', class_level: book.class_level || '',
      description: book.description || '', total_copies: book.total_copies, cover_url: (book as any).cover_url || '',
    });
    setShowAddDialog(true);
  };

  const fetchBookDetails = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Enter a title first", description: "Type the book title before fetching details.", variant: "destructive" });
      return;
    }
    setFetchingDetails(true);
    try {
      const details = await fetchBookByQuery(formData.title.trim(), formData.author.trim());
      if (!details) { 
        toast({ title: "Not found", description: "No matching book found. Fill details manually.", variant: "destructive" }); 
        return; 
      }

      setFormData(prev => ({
        ...prev,
        title: details.title || prev.title,
        author: details.author || prev.author,
        language: prev.language || details.language || "",
        category: prev.category || details.category || "",
        subject: prev.subject || details.subject || "",
        description: prev.description || details.description || "",
        cover_url: prev.cover_url || details.cover_url || "",
      }));
      toast({ title: "Details fetched!", description: "Review and adjust the auto-filled fields as needed." });
    } catch (e: any) {
      toast({ title: "Fetch failed", description: e.message || "Could not fetch details.", variant: "destructive" });
    } finally {
      setFetchingDetails(false);
    }
  };

  const fetchBookCoverOnly = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Enter a title first", description: "Type the book title before fetching cover.", variant: "destructive" });
      return;
    }
    setFetchingDetails(true);
    try {
      const details = await fetchBookByQuery(formData.title.trim(), formData.author.trim());
      if (!details || !details.cover_url) { 
        toast({ title: "Not found", description: "No cover image found for this book.", variant: "destructive" }); 
        return; 
      }
      setFormData(prev => ({ ...prev, cover_url: details.cover_url || "" }));
      toast({ title: "Cover fetched!", description: "Review the auto-filled cover URL." });
    } catch (e: any) {
      toast({ title: "Fetch failed", description: e.message || "Could not fetch cover.", variant: "destructive" });
    } finally {
      setFetchingDetails(false);
    }
  };

  const clearFetchedData = () => {
    setFormData(prev => ({ ...prev, cover_url: "", description: "" }));
    toast({ title: "Fetched data cleared", description: "Cover URL and description have been cleared." });
  };

  // Batch-fetch online metadata for ALL books that have missing description/cover/category
  const fetchAllMissingMetadata = async () => {
    const targets = books.filter(b =>
      !b.description || (b.description as string).trim().length < 20 || !b.cover_url || !b.category
    );
    if (targets.length === 0) {
      toast({ title: "All books already have metadata", description: "Nothing to update." });
      return;
    }
    setFetchingAll(true);
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const book = targets[i];
      setFetchAllProgress(`Fetching ${i + 1}/${targets.length}: ${book.title.slice(0, 30)}...`);
      try {
        const details = await fetchBookByQuery(book.title, book.author);
        const patch: any = {};
        if (details) {
          if ((!book.description || (book.description as string).trim().length < 20) && details.description) patch.description = details.description;
          if (!book.cover_url && details.cover_url) patch.cover_url = details.cover_url;
          if (!book.category && details.category) patch.category = details.category;
          if (!(book as any).language && details.language) patch.language = details.language;
        }
        if (!patch.description) {
          const { generateSmartBookDescription } = await import("@/lib/bookApi");
          patch.description = generateSmartBookDescription(book.title, book.author, book.category || undefined);
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from('books').update(patch).eq('id', book.id);
          updated++;
        }
        // Small delay to avoid hammering APIs
        await new Promise(r => setTimeout(r, 400));
      } catch {
        failed++;
      }
    }
    setFetchingAll(false);
    setFetchAllProgress("");
    toast({
      title: "Metadata fetch complete",
      description: `${updated} books updated${failed > 0 ? `, ${failed} failed` : ""}.`
    });
    loadBooks();
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book?')) return;
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" }); loadBooks();
  };

  const handleAddNew = () => { setEditingBook(null); setFormData(emptyForm); setShowAddDialog(true); };

  const toggleSelectBook = (id: string) => {
    const next = new Set(selectedBookIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedBookIds(next);
  };
  const toggleSelectAll = (filtered: Book[]) => {
    if (selectedBookIds.size === filtered.length && filtered.every(b => selectedBookIds.has(b.id))) setSelectedBookIds(new Set());
    else setSelectedBookIds(new Set(filtered.map(b => b.id)));
  };
  const handleBulkEdit = async () => {
    if (selectedBookIds.size === 0) return;
    const patch: any = {};
    (["category", "language", "subject", "class_level"] as const).forEach(k => {
      const v = bulkEdit[k].trim();
      if (v) patch[k] = v;
    });
    if (Object.keys(patch).length === 0) { toast({ title: "No changes", description: "Fill in at least one field.", variant: "destructive" }); return; }
    setBulkBusy(true);
    const ids = Array.from(selectedBookIds);
    const { error } = await supabase.from("books").update(patch).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated", description: `${ids.length} book(s) updated` }); setSelectedBookIds(new Set()); setBulkEdit({ category: "", language: "", subject: "", class_level: "" }); setShowBulkEdit(false); loadBooks(); }
    setBulkBusy(false);
  };
  const handleBulkDelete = async () => {
    if (selectedBookIds.size === 0) return;
    if (!confirm(`Delete ${selectedBookIds.size} book(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    const ids = Array.from(selectedBookIds);
    const { error } = await supabase.from("books").delete().in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted", description: `${ids.length} book(s) removed` }); setSelectedBookIds(new Set()); loadBooks(); }
    setBulkBusy(false);
  };
  const handleBulkClearMetadata = async () => {
    if (selectedBookIds.size === 0) return;
    if (!confirm(`Clear auto-fetched metadata (cover & description) from ${selectedBookIds.size} book(s)?`)) return;
    setBulkBusy(true);
    const ids = Array.from(selectedBookIds);
    const { error } = await supabase.from("books").update({ cover_url: null, description: null }).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Metadata Cleared", description: `Cleared metadata for ${ids.length} book(s).` }); setSelectedBookIds(new Set()); loadBooks(); }
    setBulkBusy(false);
  };

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean))) as string[];
  const filteredBooks = books.filter(b => {
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (availabilityFilter === "available" && b.available_copies <= 0) return false;
    if (availabilityFilter === "issued" && b.available_copies >= b.total_copies) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.accession_number || "").toLowerCase().includes(q);
  });
  const totalCopies = books.reduce((s, b) => s + b.total_copies, 0);
  const availableCopies = books.reduce((s, b) => s + b.available_copies, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />Book Management
          </h2>
          <p className="text-sm text-muted-foreground">{books.length} titles · {totalCopies} copies · {availableCopies} available</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {fetchingAll && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {fetchAllProgress || "Fetching metadata..."}
            </div>
          )}
          <Button
            onClick={fetchAllMissingMetadata}
            disabled={fetchingAll}
            variant="outline"
            size="sm"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Fetch Online Data
          </Button>
          <BulkImportBooks onImported={loadBooks} />
          <Button onClick={handleAddNew} className="gradient-primary border-0 shadow-md">
            <Plus className="h-4 w-4 mr-2" />Add Book
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search title, author, accession..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available only</SelectItem>
                <SelectItem value="issued">Issued only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedBookIds.size > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">{selectedBookIds.size} selected</span>
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <Button size="sm" onClick={() => setShowBulkEdit(true)} disabled={bulkBusy}><Edit className="h-3.5 w-3.5 mr-1.5" />Bulk Edit</Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkBusy}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Selected</Button>
              <Button size="sm" variant="outline" onClick={handleBulkClearMetadata} disabled={bulkBusy} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">Clear Metadata</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedBookIds(new Set())}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">All Books</CardTitle>
          <CardDescription>Showing {filteredBooks.length} of {books.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={filteredBooks.length > 0 && filteredBooks.every(b => selectedBookIds.has(b.id))} onChange={() => toggleSelectAll(filteredBooks)} />
                  </TableHead>
                  <TableHead>Accession</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.map((book) => (
                  <TableRow key={book.id} className={selectedBookIds.has(book.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <input type="checkbox" checked={selectedBookIds.has(book.id)} onChange={() => toggleSelectBook(book.id)} />
                    </TableCell>
                    <TableCell className="text-xs font-mono">{book.accession_number || '—'}</TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell className="text-xs">{book.language || '—'}</TableCell>
                    <TableCell>{book.category || '—'}</TableCell>
                    <TableCell>{book.available_copies}/{book.total_copies}</TableCell>
                    <TableCell>
                      {book.available_copies === 0
                        ? <Badge variant="destructive">Out</Badge>
                        : book.available_copies < book.total_copies
                          ? <Badge variant="secondary">Partial</Badge>
                          : <Badge className="bg-green-600">Available</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(book)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(book.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBooks.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {books.length === 0 ? "No books yet. Add your first book or bulk import!" : "No books match your filters."}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            <DialogDescription>{editingBook ? 'Update book information' : 'Add a new book to the library'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="accession_number">Accession Number / Library Book Code</Label>
              <Input id="accession_number" value={formData.accession_number} onChange={(e) => setFormData(p => ({ ...p, accession_number: e.target.value }))} placeholder="e.g. KV-ACC-1001" />
            </div>
            <div>
              <Label htmlFor="title">Book Name *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="author">Author *</Label>
              <Input id="author" value={formData.author} onChange={(e) => setFormData(p => ({ ...p, author: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="language">Language</Label>
                <Input id="language" value={formData.language} onChange={(e) => setFormData(p => ({ ...p, language: e.target.value }))} placeholder="English / Tamil / Hindi" />
              </div>
              <div>
                <Label htmlFor="total_copies">Copies *</Label>
                <Input id="total_copies" type="number" min="1" value={formData.total_copies} onChange={(e) => setFormData(p => ({ ...p, total_copies: parseInt(e.target.value) || 1 }))} required />
              </div>
            </div>

            {/* AI Auto-Fetch Button */}
            <div className="rounded-lg border border-dashed border-indigo-400/40 bg-indigo-500/5 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-bold text-foreground">Auto-Fill</span> — fill Accession #, Title, Author & Copies above, then click below to fetch details from Open Library.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={fetchBookDetails} disabled={fetchingDetails} className="flex-1 border-indigo-400/40 hover:bg-indigo-500/10 font-semibold text-indigo-600 dark:text-indigo-400">
                  {fetchingDetails ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching...</> : <><Wand2 className="h-4 w-4 mr-2" />Auto-Fill All</>}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={fetchBookCoverOnly} disabled={fetchingDetails} className="flex-1 border-indigo-400/40 hover:bg-indigo-500/10 font-semibold text-indigo-600 dark:text-indigo-400">
                  {fetchingDetails ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching...</> : <><BookOpen className="h-4 w-4 mr-2" />Fetch Cover Only</>}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearFetchedData} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                  Clear Data
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="category">Catalogue / Category (optional)</Label>
              <Input id="category" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Fiction, Science" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="subject">Subject (optional)</Label>
                <Input id="subject" value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="class_level">Class Level (optional)</Label>
                <Input id="class_level" value={formData.class_level} onChange={(e) => setFormData(p => ({ ...p, class_level: e.target.value }))} placeholder="e.g. 11" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label htmlFor="cover_url">Cover Image URL (optional)</Label>
              <Input id="cover_url" value={formData.cover_url} onChange={(e) => setFormData(p => ({ ...p, cover_url: e.target.value }))} placeholder="https://covers.openlibrary.org/b/id/..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">{editingBook ? 'Update' : 'Add'} Book</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedBookIds.size} Book(s)</DialogTitle>
            <DialogDescription>Only filled fields will be applied to selected books. Leave blank to keep existing values.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Input value={bulkEdit.category} onChange={e => setBulkEdit(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Fiction" />
            </div>
            <div>
              <Label>Language</Label>
              <Input value={bulkEdit.language} onChange={e => setBulkEdit(p => ({ ...p, language: e.target.value }))} placeholder="e.g. English" />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={bulkEdit.subject} onChange={e => setBulkEdit(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Science" />
            </div>
            <div>
              <Label>Class Level</Label>
              <Input value={bulkEdit.class_level} onChange={e => setBulkEdit(p => ({ ...p, class_level: e.target.value }))} placeholder="e.g. 11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEdit(false)}>Cancel</Button>
            <Button onClick={handleBulkEdit} disabled={bulkBusy} className="gradient-primary border-0">{bulkBusy ? "Applying…" : "Apply Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookManager;
