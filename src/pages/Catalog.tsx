import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Plus, Bookmark, BookmarkCheck, Star, Clock, Library, Compass, Edit, Sparkles } from "lucide-react";
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



  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(24);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  const [genres, setGenres] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classLevels, setClassLevels] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGenre, selectedSubject, selectedClass, selectedLang, selectedAuthor, availability, sortBy, debouncedSearch]);

  useEffect(() => {
    fetchBooks();
  }, [currentPage, debouncedSearch, selectedGenre, selectedSubject, selectedClass, selectedLang, selectedAuthor, availability, sortBy]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setUser({ ...user, role: profile?.role });
    } else {
      setUser(null);
    }
    await loadFilterOptions();
    if (user) {
      const [{ data: wl }, { data: rs }] = await Promise.all([
        supabase.from("book_wishlist").select("book_id").eq("user_id", user.id),
        supabase.from("book_reservations").select("book_id").eq("user_id", user.id).eq("status", "pending"),
      ]);
      setWishlist(new Set((wl || []).map((x: any) => x.book_id)));
      setMyReservations(new Set((rs || []).map((x: any) => x.book_id)));
    }
  };

  const loadFilterOptions = async () => {
    try {
      const { data, error } = await supabase.rpc("get_distinct_book_filters");
      if (error) throw error;
      if (data) {
        setGenres(data.categories || []);
        setSubjects(data.subjects || []);
        setClassLevels(data.class_levels || []);
        setLanguages(data.languages || []);
        setAuthors(data.authors || []);
      }
    } catch (e) {
      console.error("Failed to load filter options:", e);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("books")
        .select("*", { count: "exact" })
        .gt("total_copies", 0);

      if (debouncedSearch.trim()) {
        const s = `%${debouncedSearch.trim()}%`;
        query = query.or(`title.ilike.${s},author.ilike.${s},accession_number.ilike.${s},subject.ilike.${s}`);
      }

      if (selectedGenre !== "all") query = query.eq("category", selectedGenre);
      if (selectedSubject !== "all") query = query.eq("subject", selectedSubject);
      if (selectedClass !== "all") query = query.eq("class_level", selectedClass);
      if (selectedLang !== "all") query = query.eq("language", selectedLang);
      if (selectedAuthor !== "all") query = query.eq("author", selectedAuthor);

      if (availability === "available") {
        query = query.gt("available_copies", 0);
      } else if (availability === "new") {
        const oneMonthAgoIso = new Date(Date.now() - 30 * 86400_000).toISOString();
        query = query.gte("first_added_at", oneMonthAgoIso);
      }

      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "title_az") {
        query = query.order("title", { ascending: true });
      } else {
        query = query.order("title", { ascending: true });
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setBooks(data || []);
      setTotalCount(count || 0);

      // Load ratings, borrows & recs in parallel for the displayed page
      if (data && data.length > 0) {
        const bookIds = data.map(b => b.id);
        const { data: rev } = await supabase.from("book_reviews").select("book_id, rating").in("book_id", bookIds).eq("is_hidden", false);
        const agg: Record<string, { sum: number; count: number }> = {};
        (rev || []).forEach((r: any) => {
          agg[r.book_id] = agg[r.book_id] || { sum: 0, count: 0 };
          agg[r.book_id].sum += r.rating; agg[r.book_id].count++;
        });
        const map: Record<string, { avg: number; count: number }> = {};
        Object.entries(agg).forEach(([k, v]) => { map[k] = { avg: v.sum / v.count, count: v.count }; });
        setRatings(map);

        const [{ data: countsData }, { data: recs }] = await Promise.all([
          supabase.rpc('get_book_borrow_counts'),
          supabase.from("class_book_recommendations").select("book_id").in("book_id", bookIds),
        ]);
        const issueMap: Record<string, number> = {};
        (countsData || []).forEach((item: any) => {
          if (item.book_id) issueMap[item.book_id] = Number(item.borrow_count) || 0;
        });
        const recMap: Record<string, number> = {};
        (recs || []).forEach((r: any) => { if (r.book_id) recMap[r.book_id] = (recMap[r.book_id] || 0) + 1; });
        setBorrowCounts(issueMap);
        setRecommendCounts(recMap);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load catalog", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const oneMonthAgo = Date.now() - 30 * 86400_000;
  const filteredBooks = books;

  const requireAuth = () => { if (!user) { toast({ title: "Sign in required", variant: "destructive" }); navigate("/login"); return false; } return true; };

  const handleRequestNewBook = () => {
    if (!requireAuth()) return;
    setShowRequestDialog(true);
  };

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

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden pb-12">
      {/* Background patterns matching Index */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            {/* Dual Logo Placeholders */}
            <div className="flex items-center -space-x-2.5 shrink-0">
              <div className="relative w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shadow-xs" title="PM SHRI Logo">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain relative z-10" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <Sparkles className="h-5 w-5 text-amber-500 absolute hidden" />
              </div>
              <div className="relative w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shadow-xs z-10" title="KV Logo">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain relative z-10" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <BookOpen className="h-5 w-5 text-indigo-600 absolute hidden" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">KV Sulur Library</h1>
              <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">Digital Catalog</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleRequestNewBook} variant="outline" className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-slate-700 shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Request Book
            </Button>
            <BookRequestForm open={showRequestDialog} onOpenChange={setShowRequestDialog} onSuccess={() => setShowRequestDialog(false)} />
            <Button onClick={() => navigate("/")} variant="ghost" className="rounded-xl text-slate-600 font-bold hover:text-indigo-600 hover:bg-indigo-50">
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Search and Filters Strip */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm relative z-30 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input 
              placeholder="Search by title, author, ISBN, or subject..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-12 pr-4 py-6 rounded-2xl border-slate-200 shadow-sm text-base focus-visible:ring-indigo-500 bg-slate-50/50 focus:bg-white transition-colors" 
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { val: selectedGenre, set: setSelectedGenre, lbl: "Genre", opts: genres },
              { val: selectedSubject, set: setSelectedSubject, lbl: "Subject", opts: subjects },
              { val: selectedClass, set: setSelectedClass, lbl: "Class", opts: classLevels, format: (v: string) => `Class ${v}` },
              { val: selectedLang, set: setSelectedLang, lbl: "Language", opts: languages },
              { val: selectedAuthor, set: setSelectedAuthor, lbl: "Author", opts: authors.slice(0, 100) }
            ].map((filter, i) => (
              <Select key={i} value={filter.val} onValueChange={filter.set}>
                <SelectTrigger className="w-32 sm:w-36 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-sm h-10">
                  <SelectValue placeholder={filter.lbl} />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[300px]">
                  <SelectItem value="all" className="font-semibold text-indigo-600">All {filter.lbl}s</SelectItem>
                  {filter.opts.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>{filter.format ? filter.format(opt) : opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            <Select value={availability} onValueChange={(v: any) => setAvailability(v)}>
              <SelectTrigger className="w-36 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-sm h-10">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All books</SelectItem>
                <SelectItem value="available">Available now</SelectItem>
                <SelectItem value="new">New arrivals</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-40 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-sm h-10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="most_borrowed">Most borrowed</SelectItem>
                <SelectItem value="most_recommended">Most recommended</SelectItem>
                <SelectItem value="title_az">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Catalog Results</h2>
          <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-bold px-3 py-1 rounded-full shadow-sm">
            {totalCount} book{totalCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        {filteredBooks.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
              {filteredBooks.map(book => {
                const r = ratings[book.id];
                const isNew = book.first_added_at && new Date(book.first_added_at).getTime() > oneMonthAgo;
                return (
                  <div key={book.id} onClick={() => navigate(`/book/${book.id}`)} className="group cursor-pointer flex flex-col bg-white rounded-2.5xl shadow-sm hover:shadow-xl border border-slate-200/80 hover:border-indigo-300 transition-all overflow-hidden p-1.5 h-full">
                    <div className="aspect-[2/3] w-full rounded-2xl bg-slate-100 overflow-hidden relative shadow-inner mb-3">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-indigo-50 to-blue-50">
                          <BookOpen className="h-8 w-8 text-indigo-400 mb-2" />
                          <span className="text-xs font-semibold text-slate-700 line-clamp-3 leading-snug">{book.title}</span>
                        </div>
                      )}
                      {/* Status badges overlay */}
                      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 pointer-events-none">
                        <div className="flex flex-wrap gap-1">
                          {isNew && <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm uppercase tracking-wider">NEW</span>}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm uppercase tracking-wider ${book.available_copies > 0 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-200"}`}>
                            {book.available_copies > 0 ? `${book.available_copies} AVAIL` : "CHECKED OUT"}
                          </span>
                        </div>
                        {user?.role === 'admin' && (
                          <Button size="icon" variant="secondary" className="h-6 w-6 rounded-md bg-white/90 shadow-sm hover:bg-white hover:text-indigo-700 text-indigo-600 z-10 pointer-events-auto shrink-0" onClick={(e) => { e.stopPropagation(); navigate('/admin-dashboard'); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-1.5 flex-1 flex flex-col">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1">{book.title}</h4>
                      <p className="text-xs text-slate-500 truncate mb-2 font-medium">by {book.author}</p>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {book.category && <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">{book.category}</span>}
                        {book.class_level && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">Class {book.class_level}</span>}
                      </div>
                      
                      {(r || borrowCounts[book.id]) && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-2 mt-auto">
                          {r && (
                            <div className="flex items-center gap-0.5 text-amber-600">
                              <Star className="h-3 w-3 fill-amber-500" /> {r.avg.toFixed(1)}
                            </div>
                          )}
                          {borrowCounts[book.id] > 0 && <span className="ml-auto">{borrowCounts[book.id]} borrows</span>}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        {book.available_copies > 0 ? (
                          <Button size="sm" className="h-8 text-[10px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-0 px-0 w-full" onClick={() => requestBook(book.id)}>
                            Borrow
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 px-0 w-full" onClick={() => reserveBook(book.id)}>
                            <Clock className="h-3 w-3 mr-1" /> Waitlist
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className={`h-8 text-[10px] font-bold rounded-lg px-0 w-full border-slate-200 ${wishlist.has(book.id) ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'hover:bg-slate-50 text-slate-700'}`} onClick={() => toggleWishlist(book.id)}>
                          {wishlist.has(book.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalCount > pageSize && (
              <div className="flex justify-center items-center gap-3 pt-6 border-t border-slate-200/60">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="rounded-xl border-slate-200 h-9 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Previous
                </Button>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border">
                  Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                  className="rounded-xl border-slate-200 h-9 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Compass className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No books found</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">We couldn't find any books matching your current filters. Try adjusting your search criteria or clearing filters.</p>
            <Button variant="outline" onClick={() => {
              setSearchTerm(""); setSelectedGenre("all"); setSelectedSubject("all"); setSelectedClass("all"); setSelectedLang("all"); setSelectedAuthor("all"); setAvailability("all");
            }} className="rounded-xl font-bold text-slate-700">Clear All Filters</Button>
          </div>
        )}
      </main>

      <BookDetailDialog book={detailBook} userId={user?.id || null} open={!!detailBook} onOpenChange={o => !o && setDetailBook(null)} />
    </div>
  );
};

export default Catalog;
