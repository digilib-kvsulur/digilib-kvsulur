import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, BookOpen, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BulkImportBooks from "./BulkImportBooks";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  description?: string;
  total_copies: number;
  available_copies: number;
  cover_url?: string;
}

interface BookFormData {
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  total_copies: number;
}

const BookManager = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    author: '',
    isbn: '',
    category: '',
    description: '',
    total_copies: 1
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      toast({
        title: "Error",
        description: "Failed to load books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update({
            title: formData.title,
            author: formData.author,
            isbn: formData.isbn || null,
            category: formData.category || null,
            description: formData.description || null,
            total_copies: formData.total_copies,
            available_copies: editingBook.available_copies + (formData.total_copies - editingBook.total_copies)
          })
          .eq('id', editingBook.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Book updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('books')
          .insert({
            title: formData.title,
            author: formData.author,
            isbn: formData.isbn || null,
            category: formData.category || null,
            description: formData.description || null,
            total_copies: formData.total_copies,
            available_copies: formData.total_copies
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Book added successfully",
        });
      }

      setShowAddDialog(false);
      setEditingBook(null);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        category: '',
        description: '',
        total_copies: 1
      });
      loadBooks();
    } catch (error) {
      console.error('Error saving book:', error);
      toast({
        title: "Error",
        description: "Failed to save book",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category: book.category || '',
      description: book.description || '',
      total_copies: book.total_copies
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book deleted successfully",
      });

      loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast({
        title: "Error",
        description: "Failed to delete book",
        variant: "destructive",
      });
    }
  };

  const handleAddNew = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      description: '',
      total_copies: 1
    });
    setShowAddDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean))) as string[];
  const filteredBooks = books.filter(b => {
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (availabilityFilter === "available" && b.available_copies <= 0) return false;
    if (availabilityFilter === "issued" && b.available_copies >= b.total_copies) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.isbn || "").toLowerCase().includes(q);
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
              <Input placeholder="Search title, author, ISBN..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Copies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.category || 'N/A'}</TableCell>
                  <TableCell className="text-xs font-mono">{book.isbn || '—'}</TableCell>
                  <TableCell>{book.available_copies}/{book.total_copies}</TableCell>
                  <TableCell>
                    {book.available_copies === 0
                      ? <Badge variant="destructive">Out of stock</Badge>
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
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {books.length === 0 ? "No books yet. Add your first book or bulk import!" : "No books match your filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            <DialogDescription>
              {editingBook ? 'Update book information' : 'Add a new book to the library'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                value={formData.isbn}
                onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Fiction, Science, History"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="total_copies">Total Copies *</Label>
              <Input
                id="total_copies"
                type="number"
                min="1"
                value={formData.total_copies}
                onChange={(e) => setFormData(prev => ({ ...prev, total_copies: parseInt(e.target.value) || 1 }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary border-0">
                {editingBook ? 'Update' : 'Add'} Book
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookManager;
