
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, BookOpen, User, Plus, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BookRequestForm from "@/components/BookRequestForm";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  available_copies: number;
  total_copies: number;
  description: string;
}

const Catalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadBooks();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .gt('total_copies', 0) // Only show books that are actually in the library
        .order('title');

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      toast({
        title: "Error",
        description: "Failed to load books catalog",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const genres = ["all", ...Array.from(new Set(books.map(book => book.category).filter(Boolean)))];

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (book.isbn && book.isbn.includes(searchTerm));
    const matchesGenre = selectedGenre === "all" || book.category === selectedGenre;
    const matchesAvailability = !showAvailableOnly || book.available_copies > 0;
    
    return matchesSearch && matchesGenre && matchesAvailability;
  });

  const handleBookRequest = async (bookId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to request books.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    try {
      // Check if user already has a pending request for this book
      const { data: existingRequest } = await supabase
        .from('book_requests')
        .select('id')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: "Request Already Exists",
          description: "You already have a pending request for this book.",
          variant: "destructive",
        });
        return;
      }

      // Create new book request
      const { error } = await supabase
        .from('book_requests')
        .insert({
          book_id: bookId,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your book request has been submitted successfully.",
      });

    } catch (error) {
      console.error('Error requesting book:', error);
      toast({
        title: "Error",
        description: "Failed to submit book request. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Digital Library</h1>
                <p className="text-sm text-gray-600">Book Catalog</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Request New Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Request a New Book</DialogTitle>
                  </DialogHeader>
                  <BookRequestForm 
                    onClose={() => setShowRequestDialog(false)}
                    onSuccess={() => setShowRequestDialog(false)}
                  />
                </DialogContent>
              </Dialog>
              
              <Button onClick={() => navigate('/')} variant="outline">
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search books, authors, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-4 items-center">
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map(genre => (
                    <SelectItem key={genre} value={genre}>
                      {genre === "all" ? "All Genres" : genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant={showAvailableOnly ? "default" : "outline"}
                onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                className="whitespace-nowrap"
              >
                Available Only
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Found {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Books Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{book.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mb-2">
                      <User className="h-4 w-4" />
                      by {book.author}
                    </CardDescription>
                  </div>
                  <Badge variant={book.available_copies > 0 ? "default" : "secondary"}>
                    {book.available_copies > 0 ? `${book.available_copies} Available` : "Not Available"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Category:</span>
                    <Badge variant="outline">{book.category || 'Uncategorized'}</Badge>
                  </div>
                  
                  {book.isbn && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ISBN:</span>
                      <span className="font-mono text-xs">{book.isbn}</span>
                    </div>
                  )}
                  
                  {book.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {book.description}
                    </p>
                  )}
                  
                  <Button 
                    className="w-full" 
                    disabled={book.available_copies <= 0}
                    onClick={() => handleBookRequest(book.id)}
                  >
                    {book.available_copies > 0 ? "Request Book" : "Currently Not Available"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search terms or filters.</p>
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Request a New Book
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Request a New Book</DialogTitle>
                </DialogHeader>
                <BookRequestForm 
                  onClose={() => setShowRequestDialog(false)}
                  onSuccess={() => setShowRequestDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
};

export default Catalog;
