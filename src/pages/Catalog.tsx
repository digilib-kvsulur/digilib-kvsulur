
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock book data
const mockBooks = [
  {
    id: 1,
    title: "The Alchemist",
    author: "Paulo Coelho",
    genre: "Fiction",
    isbn: "978-0061122415",
    available: true,
    description: "A mystical story about a young shepherd's journey to find treasure.",
    coverUrl: "/placeholder.svg"
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    genre: "Classic Literature",
    isbn: "978-0446310789",
    available: true,
    description: "A gripping tale of racial injustice and childhood innocence.",
    coverUrl: "/placeholder.svg"
  },
  {
    id: 3,
    title: "The Science of Everything",
    author: "Dr. Sarah Johnson",
    genre: "Science",
    isbn: "978-1234567890",
    available: false,
    description: "An comprehensive guide to understanding the natural world.",
    coverUrl: "/placeholder.svg"
  },
  {
    id: 4,
    title: "Mathematics for Class X",
    author: "R.D. Sharma",
    genre: "Academic",
    isbn: "978-9876543210",
    available: true,
    description: "Complete mathematics textbook for class 10 students.",
    coverUrl: "/placeholder.svg"
  },
  {
    id: 5,
    title: "Harry Potter and the Philosopher's Stone",
    author: "J.K. Rowling",
    genre: "Fantasy",
    isbn: "978-0747532699",
    available: true,
    description: "The magical story of a young wizard's adventures.",
    coverUrl: "/placeholder.svg"
  },
  {
    id: 6,
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    genre: "Science",
    isbn: "978-0553380163",
    available: true,
    description: "Exploring the mysteries of the universe in simple terms.",
    coverUrl: "/placeholder.svg"
  }
];

const Catalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const navigate = useNavigate();

  const genres = ["all", ...Array.from(new Set(mockBooks.map(book => book.genre)))];

  const filteredBooks = mockBooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.isbn.includes(searchTerm);
    const matchesGenre = selectedGenre === "all" || book.genre === selectedGenre;
    const matchesAvailability = !showAvailableOnly || book.available;
    
    return matchesSearch && matchesGenre && matchesAvailability;
  });

  const handleBookRequest = (bookId: number) => {
    // Mock book request - in real app, this would connect to Firebase
    console.log("Requesting book:", bookId);
    // For now, just navigate to login if not authenticated
    navigate("/login");
  };

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
            <Button onClick={() => navigate('/')} variant="outline">
              Home
            </Button>
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
                  <Badge variant={book.available ? "default" : "secondary"}>
                    {book.available ? "Available" : "Issued"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Genre:</span>
                    <Badge variant="outline">{book.genre}</Badge>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ISBN:</span>
                    <span className="font-mono text-xs">{book.isbn}</span>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {book.description}
                  </p>
                  
                  <Button 
                    className="w-full" 
                    disabled={!book.available}
                    onClick={() => handleBookRequest(book.id)}
                  >
                    {book.available ? "Request Book" : "Currently Issued"}
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
            <p className="text-gray-600">Try adjusting your search terms or filters.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Catalog;
