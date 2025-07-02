
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Book Management
        </h2>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Books</CardTitle>
          <CardDescription>Manage your library collection</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Copies</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.category || 'N/A'}</TableCell>
                  <TableCell>{book.isbn || 'N/A'}</TableCell>
                  <TableCell>{book.total_copies}</TableCell>
                  <TableCell>{book.available_copies}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(book)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(book.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {books.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No books found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
