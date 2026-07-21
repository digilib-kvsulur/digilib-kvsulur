import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, User, Plus, Bookmark, BookmarkCheck, Star, Clock, MessageSquare } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BookRequestForm from "@/components/BookRequestForm";
import BookDetailDialog from "@/components/catalog/BookDetailDialog";

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearchTerm(q);
  }, [searchParams]);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedLang, setSelectedLang] = useState("all");
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const [availability, setAvailability] = useState<"all" | "available" | "new">("all");
  const [sortBy, setSortBy] = useState<"newest" | "most_borrowed" | "most_recommended" | "title_az">("newest");

  const [books, setBooks] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [borrowCounts, setBorrowCounts] = useState<Record<string, number>>({});
  const [recommendCounts, setRecommendCounts] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [myReservations, setMyReservations] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [detailBook, setDetailBook] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    await loadBooks();
    if (user) {
      const [{ data: wl }, { data: rs }] = await Promise.all([
        supabase.from("book_wishlist").select("book_id").eq("user_id", user.id),
        supabase.from("book_reservations").select("book_id").eq("user_id", user.id).eq("status", "pending"),
      ]);
      setWishlist(new Set((wl || []).map((x: any) => x.book_id)));
      setMyReservations(new Set((rs || []).map((x: any) => x.book_id)));
    }
  };

  const loadBooks = async () => {
    try {
      let allBooks: any[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .gt("total_copies", 0)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allBooks = [...allBooks, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setBooks(allBooks);
      const { data: rev } = await supabase.from("book_reviews").select("book_id, rating").eq("is_hidden", false);
      const agg: Record<string, { sum: number; count: number }> = {};
      (rev || []).forEach((r: any) => {
        agg[r.book_id] = agg[r.book_id] || { sum: 0, count: 0 };
        agg[r.book_id].sum += r.rating; agg[r.book_id].count++;
      });
      const map: Record<string, { avg: number; count: number }> = {};
      Object.entries(agg).forEach(([k, v]) => { map[k] = { avg: v.sum / v.count, count: v.count }; });
      setRatings(map);

      const [{ data: issues }, { data: recs }] = await Promise.all([
        supabase.from("book_issues").select("book_id"),
        supabase.from("class_book_recommendations").select("book_id"),
      ]);
      const issueMap: Record<string, number> = {};
      (issues || []).forEach((i: any) => { if (i.book_id) issueMap[i.book_id] = (issueMap[i.book_id] || 0) + 1; });
      const recMap: Record<string, number> = {};
      (recs || []).forEach((r: any) => { if (r.book_id) recMap[r.book_id] = (recMap[r.book_id] || 0) + 1; });
      setBorrowCounts(issueMap);
      setRecommendCounts(recMap);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load catalog", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();
  const genres = uniq(books.map(b => b.category));
  const subjects = uniq(books.map(b => b.subject));
  const classLevels = uniq(books.map(b => b.class_level));
  const languages = uniq(books.map(b => b.language));
  const authors = uniq(books.map(b => b.author));

  const oneMonthAgo = Date.now() - 30 * 86400_000;

  let filteredBooks = books.filter(b => {
    const s = searchTerm.toLowerCase();
    if (searchTerm && !(b.title?.toLowerCase().includes(s) || b.author?.toLowerCase().includes(s) || (b.accession_number || "").toLowerCase().includes(s) || (b.category || "").toLowerCase().includes(s))) return false;
    if (selectedGenre !== "all" && b.category !== selectedGenre) return false;
    if (selectedSubject !== "all" && b.subject !== selectedSubject) return false;
    if (selectedClass !== "all" && b.class_level !== selectedClass) return false;
    if (selectedLang !== "all" && b.language !== selectedLang) return false;
    if (selectedAuthor !== "all" && b.author !== selectedAuthor) return false;
    if (availability === "available" && b.available_copies <= 0) return false;
    if (availability === "new" && !(b.first_added_at && new Date(b.first_added_at).getTime() > oneMonthAgo)) return false;
    return true;
  });

  filteredBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.first_added_at || b.created_at || 0).getTime() - new Date(a.first_added_at || a.created_at || 0).getTime();
    if (sortBy === "most_borrowed") return (borrowCounts[b.id] || 0) - (borrowCounts[a.id] || 0) || (a.title || "").localeCompare(b.title || "");
    if (sortBy === "most_recommended") return (recommendCounts[b.id] || 0) - (recommendCounts[a.id] || 0) || (ratings[b.id]?.avg || 0) - (ratings[a.id]?.avg || 0) || (a.title || "").localeCompare(b.title || "");
    return (a.title || "").localeCompare(b.title || "");
  });

  const requireAuth = () => { if (!user) { toast({ title: "Sign in required", variant: "destructive" }); navigate("/login"); return false; } return true; };

  const toggleWishlist = async (id: string) => {
    if (!requireAuth()) return;
    if (wishlist.has(id)) {
      await supabase.from("book_wishlist").delete().eq("user_id", user.id).eq("book_id", id);
      wishlist.delete(id); setWishlist(new Set(wishlist));
      toast({ title: "Removed from wishlist" });
    } else {
      const { error } = await supabase.from("book_wishlist").insert({ user_id: user.id, book_id: id });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      wishlist.add(id); setWishlist(new Set(wishlist));
      toast({ title: "Saved to wishlist" });
    }
  };

  const reserveBook = async (id: string) => {
    if (!requireAuth()) return;
    if (myReservations.has(id)) { toast({ title: "Already on waitlist" }); return; }
    const { error } = await supabase.from("book_reservations").insert({ user_id: user.id, book_id: id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    myReservations.add(id); setMyReservations(new Set(myReservations));
    toast({ title: "Added to waitlist", description: "We'll notify you when a copy is available." });
  };

  const requestBook = async (bookId: string) => {
    if (!requireAuth()) return;
    const { data: existing } = await supabase.from("book_requests").select("id").eq("book_id", bookId).eq("user_id", user.id).eq("status", "pending").maybeSingle();
    if (existing) { toast({ title: "Already requested", variant: "destructive" }); return; }
    const { error } = await supabase.from("book_requests").insert({ book_id: bookId, user_id: user.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Request submitted" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-16 w-16 border-b-2 border-primary rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center"><BookOpen className="h-6 w-6 text-white" /></div>
            <div><h1 className="text-lg font-bold text-gray-900">Digital Library</h1><p className="text-sm text-gray-600">Book Catalog</p></div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowRequestDialog(true)}><Plus className="h-4 w-4 mr-2" />Request New Book</Button>
            <BookRequestForm open={showRequestDialog} onOpenChange={setShowRequestDialog} onSuccess={() => setShowRequestDialog(false)} />
            <Button onClick={() => navigate("/")} variant="outline">Home</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search title, author or ISBN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}><SelectTrigger className="w-36"><SelectValue placeholder="Genre" /></SelectTrigger><SelectContent><SelectItem value="all">All genres</SelectItem>{genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}><SelectTrigger className="w-36"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{subjects.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger className="w-32"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem>{classLevels.map(g => <SelectItem key={g} value={g}>Class {g}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedLang} onValueChange={setSelectedLang}><SelectTrigger className="w-32"><SelectValue placeholder="Language" /></SelectTrigger><SelectContent><SelectItem value="all">All languages</SelectItem>{languages.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedAuthor} onValueChange={setSelectedAuthor}><SelectTrigger className="w-40"><SelectValue placeholder="Author" /></SelectTrigger><SelectContent><SelectItem value="all">All authors</SelectItem>{authors.slice(0, 100).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
            <Select value={availability} onValueChange={(v: any) => setAvailability(v)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All books</SelectItem><SelectItem value="available">Available now</SelectItem><SelectItem value="new">New arrivals</SelectItem></SelectContent></Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}><SelectTrigger className="w-48"><SelectValue placeholder="Sort" /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="most_borrowed">Most borrowed</SelectItem><SelectItem value="most_recommended">Most recommended</SelectItem><SelectItem value="title_az">Title A-Z</SelectItem></SelectContent></Select>
          </div>
        </div>

        <p className="text-gray-600 mb-4">{filteredBooks.length} book{filteredBooks.length !== 1 ? "s" : ""}</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map(book => {
            const r = ratings[book.id];
            const isNew = book.first_added_at && new Date(book.first_added_at).getTime() > oneMonthAgo;
            return (
              <Card 
                key={book.id} 
                onClick={() => navigate(`/book/${book.id}`)}
                className="hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer flex flex-col group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2 truncate group-hover:text-indigo-600 transition-colors">{book.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mb-1"><User className="h-4 w-4" />by {book.author}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={book.available_copies > 0 ? "default" : "secondary"}>{book.available_copies > 0 ? `${book.available_copies} avail` : "Not avail"}</Badge>
                      {isNew && <Badge className="bg-primary/10 text-primary border-primary/20">New</Badge>}
                    </div>
                  </div>
                  {r && (
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="font-medium">{r.avg.toFixed(1)}</span>
                      <span className="text-muted-foreground">({r.count})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    {borrowCounts[book.id] > 0 && <span>{borrowCounts[book.id]} borrowed</span>}
                    {recommendCounts[book.id] > 0 && <span>{recommendCounts[book.id]} recommended</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 text-sm flex-1">
                    <div className="flex flex-wrap gap-1">
                      {book.category && <Badge variant="outline" className="text-[10px]">{book.category}</Badge>}
                      {book.subject && <Badge variant="outline" className="text-[10px]">{book.subject}</Badge>}
                      {book.class_level && <Badge variant="outline" className="text-[10px]">Class {book.class_level}</Badge>}
                    </div>
                    {book.description && <p className="text-sm text-gray-600 line-clamp-2">{book.description}</p>}
                  </div>
                  <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button className="flex-1" disabled={book.available_copies <= 0} onClick={() => requestBook(book.id)}>
                        {book.available_copies > 0 ? "Request" : "Unavailable"}
                      </Button>
                      {book.available_copies <= 0 && (
                        <Button variant="outline" onClick={() => reserveBook(book.id)}>
                          <Clock className="h-4 w-4 mr-1" />{myReservations.has(book.id) ? "Waitlisted" : "Waitlist"}
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleWishlist(book.id)}>
                        {wishlist.has(book.id) ? <><BookmarkCheck className="h-4 w-4 mr-1" />Saved</> : <><Bookmark className="h-4 w-4 mr-1" />Save</>}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/book/${book.id}`)}>
                        <BookOpen className="h-4 w-4 mr-1" />Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters.</p>
          </div>
        )}
      </main>

      <BookDetailDialog book={detailBook} userId={user?.id || null} open={!!detailBook} onOpenChange={o => !o && setDetailBook(null)} />
    </div>
  );
};

export default Catalog;
