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
import { Plus, Edit, Trash2, BookOpen, Search, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BulkImportBooks from "./BulkImportBooks";

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
}

const emptyForm: BookFormData = {
  title: '', author: '', accession_number: '', language: '', category: '', subject: '', class_level: '', description: '', total_copies: 1,
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
  const { toast } = useToast();

  useEffect(() => { loadBooks(); }, []);

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
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
      description: book.description || '', total_copies: book.total_copies,
    });
    setShowAddDialog(true);
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input className="h-8 max-w-[200px] text-sm" placeholder="New category…" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} />
              <Button size="sm" disabled={bulkUpdating} onClick={handleBulkCategoryUpdate}>{bulkUpdating ? "Updating…" : "Update Category"}</Button>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">{editingBook ? 'Update' : 'Add'} Book</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookManager;
