import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Plus, Bookmark, BookmarkCheck, Star, Clock, Library, Compass, Edit, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import BookRequestForm from "@/components/BookRequestForm";
import BookDetailDialog from "@/components/catalog/BookDetailDialog";
import LibraryMapExplorer from "@/components/student/LibraryMapExplorer";
import { normalizeAuthorName, displayGenre } from "@/lib/catalogDisplay";

const BookCoverPlaceholder = ({ seed, category, subject }: { seed: string; category?: string | null; subject?: string | null }) => {
  const hash = Array.from(seed).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  const genre = displayGenre(category, undefined, undefined).toLowerCase();
  const hue = genre.includes("science") || genre.includes("physics") || genre.includes("chemistry") ? 218
    : genre.includes("math") ? 188
    : genre.includes("history") || genre.includes("social") || genre.includes("biography") ? 28
    : genre.includes("fiction") || genre.includes("fantasy") ? 274
    : genre.includes("computer") ? 252
    : 218 + (hash % 42);
  return <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br p-3 text-center text-white" style={{ backgroundImage: `linear-gradient(145deg, hsl(${hue} 68% 42%), hsl(${(hue + 34) % 360} 68% 28%))` }}>
    <span aria-hidden="true" className="absolute -right-8 -top-6 h-28 w-28 rounded-full border border-white/20" />
    <span aria-hidden="true" className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full border border-white/15" />
    <BookOpen className="relative z-10 mb-2 h-7 w-7 text-white/90" />
    <span className="relative z-10 text-[10px] font-black tracking-[0.2em] text-white/90">DLMS LIBRARY</span>
  </div>;
};

const isbnCoverUrl = (isbn?: string | null) => {
  const cleanIsbn = String(isbn || "").replace(/[^0-9X]/gi, "");
  return /^(?:\d{10}|\d{13})$/i.test(cleanIsbn) ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false` : "";
};

const normaliseAuthorName = (author?: string | null) => {
  return normalizeAuthorName(author);
};

const allFilterLabel = (label: string) => label === "Class" ? "All Classes" : `All ${label}s`;

const featuredReason = (book: { issue_count?: number | null; available_copies?: number | null }) => {
  if ((book.issue_count || 0) >= 10) return "Popular with readers";
  if ((book.available_copies || 0) > 0) return "Available to borrow";
  return "Library pick";
};

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
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
      const cached = sessionStorage.getItem("kvsulur_catalog_filter_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.categories)) {
            setGenres(parsed.categories || []);
            setSubjects(parsed.subjects || []);
            setClassLevels(parsed.class_levels || []);
            setLanguages(parsed.languages || []);
            setAuthors(parsed.authors || []);
            return;
          }
        } catch {
          // parse error, re-fetch
        }
      }

      const { data: raw, error } = await supabase.rpc("get_distinct_book_filters");
      if (error) throw error;
      const data: any = raw;
      if (data) {
        setGenres(data.categories || []);
        setSubjects(data.subjects || []);
        setClassLevels(data.class_levels || []);
        setLanguages(data.languages || []);
        setAuthors(data.authors || []);
        sessionStorage.setItem("kvsulur_catalog_filter_cache", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to load filter options:", e);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let data: any[] | null = null;
      let count = 0;

      if (debouncedSearch.trim()) {
        // Use RPC function for Full-Text Search (Feature 18)
        const { data: searchResults, error: searchErr } = await supabase.rpc("search_books", {
          search_query: debouncedSearch.trim(),
          p_category: selectedGenre === "all" ? null : selectedGenre,
          p_subject: selectedSubject === "all" ? null : selectedSubject,
          p_class_level: selectedClass === "all" ? null : selectedClass,
          p_language: selectedLang === "all" ? null : selectedLang,
          p_author: selectedAuthor === "all" ? null : selectedAuthor,
          p_availability: availability,
          p_sort_by: sortBy === "most_recommended" ? "most_borrowed" : sortBy,
          p_limit: 1000 // Grab enough to virtualize locally or paginate
        });
        if (searchErr) throw searchErr;
        const arrivalCutoff = Date.now() - 14 * 86400_000;
        const matchingResults = (searchResults || []).filter((book: any) => availability !== "new" || new Date(book.first_added_at || book.created_at).getTime() >= arrivalCutoff);
        count = matchingResults.length;
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize;
        data = matchingResults.slice(from, to);
      } else {
        let query = supabase
          .from("books")
          .select("id,title,author,category,subject,class_level,language,cover_url,isbn,total_copies,available_copies,first_added_at,created_at,accession_number,issue_count,shelf_number,cupboard_number", { count: "estimated" })
          .gt("total_copies", 0);

        if (selectedGenre !== "all") query = query.eq("category", selectedGenre);
        if (selectedSubject !== "all") query = query.eq("subject", selectedSubject);
        if (selectedClass !== "all") query = query.eq("class_level", selectedClass);
        if (selectedLang !== "all") query = query.eq("language", selectedLang);
        if (selectedAuthor !== "all") query = query.eq("author", selectedAuthor);

        if (availability === "available") {
          query = query.gt("available_copies", 0);
        } else if (availability === "new") {
          const arrivalCutoffIso = new Date(Date.now() - 14 * 86400_000).toISOString();
          query = query.or(`first_added_at.gte.${arrivalCutoffIso},and(first_added_at.is.null,created_at.gte.${arrivalCutoffIso})`);
        }

        if (sortBy === "newest") {
          query = query.order("created_at", { ascending: false });
        } else if (sortBy === "most_borrowed") {
          query = query.order("issue_count", { ascending: false, nullsFirst: false });
        } else if (sortBy === "title_az") {
          query = query.order("title", { ascending: true }).order("author", { ascending: true });
        } else {
          // Keep pagination stable when popularity values tie.
          query = query.order("issue_count", { ascending: false, nullsFirst: false }).order("title", { ascending: true });
        }

        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: dbData, count: dbCount, error } = await query;
        if (error) throw error;
        data = dbData;
        count = dbCount || 0;
      }

      setBooks(data || []);
      setTotalCount(count);
      setLoading(false);

      // Enrich the visible page in the background (does not block rendering)
      if (data && data.length > 0) {
        const visibleSlice = data;
        const bookIds = visibleSlice.map(b => b.id);
        setBorrowCounts(Object.fromEntries(data.map((b: any) => [b.id, b.issue_count || 0])));
        void (async () => {
          const [{ data: rev }, { data: recs }] = await Promise.all([
            supabase.from("book_reviews").select("book_id, rating").in("book_id", bookIds).eq("is_approved", true),
            supabase.from("class_book_recommendations").select("book_id").in("book_id", bookIds),
          ]);
          const agg: Record<string, { sum: number; count: number }> = {};
          (rev || []).forEach((r: any) => {
            agg[r.book_id] = agg[r.book_id] || { sum: 0, count: 0 };
            agg[r.book_id].sum += r.rating; agg[r.book_id].count++;
          });
          const map: Record<string, { avg: number; count: number }> = {};
          Object.entries(agg).forEach(([k, v]) => { map[k] = { avg: v.sum / v.count, count: v.count }; });
          setRatings(map);
          const recMap: Record<string, number> = {};
          (recs || []).forEach((r: any) => { if (r.book_id) recMap[r.book_id] = (recMap[r.book_id] || 0) + 1; });
          setRecommendCounts(recMap);
        })();
      }

    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load catalog", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const oneMonthAgo = Date.now() - 14 * 86400_000;
  const displayedBooks = useMemo(() => {
    // Both database and full-text paths already return the active page in the
    // requested order. Re-slicing search results here skipped pages after page 1.
    return books;
  }, [books]);

  const sortedOptions = (options: string[]) => [...options].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );

  const showFeatured = !debouncedSearch && selectedGenre === "all" && selectedSubject === "all" && selectedClass === "all" && currentPage === 1 && books.length > 0;
  const withCovers = useMemo(() => {
    const valid = books.filter((b) => (b.cover_url && b.cover_url.trim().length > 5) || isbnCoverUrl(b.isbn));
    return [...valid].sort((a, b) => (b.issue_count || 0) - (a.issue_count || 0));
  }, [books]);
  const featuredList = useMemo(() => (withCovers.length >= 4 ? withCovers : books).slice(0, 6), [withCovers, books]);
  const featuredIdSet = useMemo(() => new Set(featuredList.map(b => b.id)), [featuredList]);

  // Group duplicate titles/editions so catalog does not repeat exact duplicates
  const deduplicatedBooks = useMemo(() => {
    const map = new Map<string, any>();
    for (const b of displayedBooks) {
      const titleKey = (b.title || "").trim().toLowerCase();
      const authorKey = (b.author || "").trim().toLowerCase();
      const key = `${titleKey}::${authorKey}`;
      if (!map.has(key)) {
        map.set(key, { ...b, editionCount: 1 });
      } else {
        const existing = map.get(key)!;
        existing.editionCount = (existing.editionCount || 1) + 1;
        existing.available_copies = (existing.available_copies || 0) + (b.available_copies || 0);
        existing.total_copies = (existing.total_copies || 0) + (b.total_copies || 0);
        existing.issue_count = Math.max(existing.issue_count || 0, b.issue_count || 0);
        if (!existing.cover_url && b.cover_url) existing.cover_url = b.cover_url;
        if (!existing.isbn && b.isbn) existing.isbn = b.isbn;
      }
    }
    return Array.from(map.values());
  }, [displayedBooks]);

  // Exclude featured books from the catalog grid on page 1 so the exact same books aren't repeated right below
  const catalogGridBooks = useMemo(() => {
    if (showFeatured && featuredList.length > 0) {
      const filtered = deduplicatedBooks.filter(b => !featuredIdSet.has(b.id));
      return filtered.length > 0 ? filtered : deduplicatedBooks;
    }
    return deduplicatedBooks;
  }, [showFeatured, deduplicatedBooks, featuredIdSet, featuredList.length]);

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
    if (existing) { toast({ title: "Already requested", description: "You already have a pending request for this title.", variant: "destructive" }); return; }

    let overwritten = false;
    let overwrittenTitle = "";

    // Try atomic RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("submit_book_request", {
      p_book_id: bookId
    });

    if (!rpcErr && rpcRes) {
      overwritten = (rpcRes as any).overwritten;
      overwrittenTitle = (rpcRes as any).overwritten_title;
    } else {
      // Fallback: check pending count
      const { data: pendingReqs } = await supabase
        .from("book_requests")
        .select("id, requested_title, books(title), created_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (pendingReqs && pendingReqs.length >= 2) {
        const oldest = pendingReqs[0];
        overwritten = true;
        overwrittenTitle = oldest.requested_title || (oldest.books as any)?.title || "Previous Request";
        await supabase.from("book_requests").delete().eq("id", oldest.id);
      }

      const { error } = await supabase.from("book_requests").insert({ book_id: bookId, user_id: user.id });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }

    if (overwritten) {
      toast({
        title: "Request submitted (Limit: 2)",
        description: `Max 2 active requests allowed. Your oldest request ("${overwrittenTitle}") was automatically replaced.`,
      });
    } else {
      toast({ title: "Request submitted", description: "Your book borrow request was sent to the librarian." });
    }
  };

  const skeletonGrid = (
    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-3 animate-pulse flex flex-col justify-between">
          <div>
            <div className="aspect-[3/4] w-full rounded-xl bg-slate-200/70 mb-3" />
            <div className="space-y-2 pb-2">
              <div className="h-3.5 rounded bg-slate-200/70" />
              <div className="h-3 w-2/3 rounded bg-slate-200/70" />
              <div className="h-4 w-1/3 rounded bg-slate-100" />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="h-3 w-1/2 rounded bg-slate-100" />
            <div className="h-9 rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/20 selection:text-indigo-900 overflow-x-hidden pb-12 animate-in fade-in duration-300">
      {/* Background patterns matching Index */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => navigate("/dashboard")}>
            {/* Dual Logo Placeholders */}
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="relative w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shadow-xs" title="PM SHRI Logo">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain relative z-10" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <Sparkles className="h-4 w-4 text-amber-500 absolute hidden" />
              </div>
              <div className="relative w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shadow-xs z-10" title="KV Logo">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain relative z-10" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <BookOpen className="h-4 w-4 text-indigo-600 absolute hidden" />
              </div>
            </div>
            <div>
              <h1 className="text-xs font-black tracking-tight text-slate-900 leading-none">DLMS KV Sulur</h1>
              <p className="text-[8px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">Catalog</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewMode(viewMode === "grid" ? "map" : "grid")}
              variant="outline"
              size="sm"
              className="rounded-xl border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 font-bold text-indigo-700 shadow-sm transition-all duration-200 text-xs px-3 py-1.5 h-8 sm:h-9 gap-1"
            >
              <Compass className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{viewMode === "grid" ? "Library Map" : "View Books"}</span>
            </Button>
            <Button onClick={handleRequestNewBook} variant="outline" size="sm" className="rounded-xl border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 font-bold text-indigo-700 shadow-sm transition-all duration-200 text-xs px-3 py-1.5 h-8 sm:h-9">
              <Plus className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">Request Book</span><span className="sm:hidden">Request</span>
            </Button>
            <BookRequestForm open={showRequestDialog} onOpenChange={setShowRequestDialog} onSuccess={() => setShowRequestDialog(false)} />
            <Button onClick={() => navigate("/dashboard")} variant="ghost" size="sm" className="rounded-xl text-slate-600 font-bold hover:text-indigo-600 hover:bg-indigo-50 text-xs px-3 py-1.5 h-8 sm:h-9">
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Search and Filters Strip */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs relative z-30 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
              <Input 
                placeholder="Search by title, author, ISBN..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10 pr-4 py-5 rounded-xl border-slate-200 shadow-xs text-sm focus-visible:ring-indigo-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
            
            {/* Mobile filters button */}
            <Button 
              variant="outline" 
              onClick={() => setShowMobileFilters(true)}
              aria-label="Open catalog filters"
              className="lg:hidden rounded-xl border-slate-200 px-3 h-11 bg-slate-50/50 hover:bg-slate-100"
            >
              <SlidersHorizontal className="h-4 w-4" /><span className="ml-1.5 text-xs">Filters</span>
            </Button>
          </div>

          {/* Desktop Filters (Hidden on Mobile) */}
          <div className="hidden lg:flex flex-wrap justify-center gap-2">
            {[
              { val: selectedGenre, set: setSelectedGenre, lbl: "Genre", opts: genres },
              { val: selectedClass, set: setSelectedClass, lbl: "Class", opts: classLevels, format: (v: string) => `Class ${v}` },
            ].map((filter, i) => (
              <Select key={i} value={filter.val} onValueChange={filter.set}>
                <SelectTrigger className="w-36 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-xs h-9 text-xs">
                  <SelectValue placeholder={filter.lbl} />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[300px]">
                  <SelectItem value="all" className="font-semibold text-indigo-600">{allFilterLabel(filter.lbl)}</SelectItem>
                  {sortedOptions(filter.opts).map((opt: string) => (
                    <SelectItem key={opt} value={opt}>{filter.format ? filter.format(opt) : opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            <Select value={availability} onValueChange={(v: any) => setAvailability(v)}>
              <SelectTrigger className="w-36 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-xs h-9 text-xs">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Any availability</SelectItem>
                <SelectItem value="available">Available now</SelectItem>
                <SelectItem value="new">New arrivals</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowMobileFilters(true)} className="h-9 rounded-xl text-xs"><SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />More filters</Button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {[
              { label: "🔥 Popular", action: () => setSortBy("most_borrowed") },
              { label: "📘 Reference Material", action: () => setSelectedGenre("Reference Material") },
              { label: "⚡ Available Now", action: () => setAvailability("available") },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={chip.action}
                className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-slate-600 shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
          {(selectedGenre !== "all" || selectedClass !== "all" || availability !== "all" || selectedSubject !== "all" || selectedLang !== "all" || selectedAuthor !== "all" || debouncedSearch.trim()) && <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-3" aria-label="Active catalog filters">
            <span className="text-xs font-semibold text-slate-500">Showing:</span>
            {debouncedSearch.trim() && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">Search: {debouncedSearch}</span>}
            {selectedGenre !== "all" && <button type="button" onClick={() => setSelectedGenre("all")} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">{selectedGenre} ×</button>}
            {selectedSubject !== "all" && <button type="button" onClick={() => setSelectedSubject("all")} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">{selectedSubject} ×</button>}
            {selectedClass !== "all" && <button type="button" onClick={() => setSelectedClass("all")} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">Class {selectedClass} ×</button>}
            {selectedLang !== "all" && <button type="button" onClick={() => setSelectedLang("all")} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">{selectedLang} ×</button>}
            {selectedAuthor !== "all" && <button type="button" onClick={() => setSelectedAuthor("all")} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">{selectedAuthor} ×</button>}
            {availability !== "all" && <button type="button" onClick={() => setAvailability("all")} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">{availability === "available" ? "Available now" : "New arrivals"} ×</button>}
            <button type="button" onClick={() => { setSearchTerm(""); setSelectedGenre("all"); setSelectedSubject("all"); setSelectedClass("all"); setSelectedLang("all"); setSelectedAuthor("all"); setAvailability("all"); }} className="inline-flex min-h-10 items-center gap-1 px-2 text-xs font-semibold text-indigo-700 underline-offset-2 hover:underline"><X className="h-3.5 w-3.5" />Clear all</button>
          </div>}
        </div>
      </div>

      {/* Mobile Filters Drawer / Modal */}
      <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <DialogContent className="catalog-filter-sheet max-w-md w-[90%] rounded-2xl p-5 gap-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-600" /> More filters and sorting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {[
              { val: selectedGenre, set: setSelectedGenre, lbl: "Genre", opts: genres },
              { val: selectedSubject, set: setSelectedSubject, lbl: "Subject", opts: subjects },
              { val: selectedClass, set: setSelectedClass, lbl: "Class Level", opts: classLevels, format: (v: string) => `Class ${v}` },
              { val: selectedLang, set: setSelectedLang, lbl: "Language", opts: languages },
              { val: selectedAuthor, set: setSelectedAuthor, lbl: "Author", opts: authors }
            ].map((filter, i) => (
              <div key={i} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{filter.lbl}</label>
                <Select value={filter.val} onValueChange={filter.set}>
                  <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50/50 font-medium text-slate-800 shadow-xs h-10 text-sm">
                    <SelectValue placeholder={`Select ${filter.lbl}`} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[250px]">
                    <SelectItem value="all" className="font-semibold text-indigo-600">{allFilterLabel(filter.lbl)}</SelectItem>
                    {sortedOptions(filter.opts).map((opt: string) => (
                      <SelectItem key={opt} value={opt}>{filter.format ? filter.format(opt) : opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Availability</label>
              <Select value={availability} onValueChange={(v: any) => setAvailability(v)}>
                <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50/50 font-medium text-slate-800 shadow-xs h-10 text-sm">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Any availability</SelectItem>
                  <SelectItem value="available">Available now</SelectItem>
                  <SelectItem value="new">New arrivals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50/50 font-medium text-slate-800 shadow-xs h-10 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">Recently added</SelectItem>
                  <SelectItem value="most_borrowed">Most borrowed</SelectItem>
                  <SelectItem value="most_recommended">Popular (most borrowed)</SelectItem>
                  <SelectItem value="title_az">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2 border-t flex flex-row gap-2 mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm(""); setSelectedGenre("all"); setSelectedSubject("all"); setSelectedClass("all"); setSelectedLang("all"); setSelectedAuthor("all"); setAvailability("all");
                setShowMobileFilters(false);
              }}
              className="flex-1 rounded-xl text-xs"
            >
              Reset
            </Button>
            <Button 
              onClick={() => setShowMobileFilters(false)}
              className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs"
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {viewMode === "map" ? (
          <div className="bg-white rounded-3xl p-6 border shadow-sm mb-8">
            <LibraryMapExplorer />
          </div>
        ) : (
          <>
            {/* Featured & Popular Books Section (Clean Professional Showcase) */}
            {showFeatured && featuredList.length > 0 && (
              <div className="mb-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="h-4.5 w-4.5 text-indigo-600" /> Featured &amp; Popular Books
                    </h3>
                    <p className="text-xs text-slate-500">Frequently borrowed titles &amp; recommended reading in KV Sulur</p>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Popular Picks
                  </Badge>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-4">
                  {featuredList.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => navigate(`/book/${b.id}`)}
                      className="group w-32 shrink-0 cursor-pointer bg-slate-50/80 hover:bg-white rounded-xl p-2.5 border border-slate-200/70 hover:border-indigo-300 transition-all duration-200 hover:shadow-md flex flex-col justify-between sm:w-40"
                    >
                      <div className="aspect-[3/4] w-full rounded-lg overflow-hidden mb-2 bg-slate-200/80 relative shadow-xs">
                        {(b.cover_url || isbnCoverUrl(b.isbn)) && !failedImages.has(`feat-${b.id}`) ? (
                          <img
                            src={b.cover_url || isbnCoverUrl(b.isbn)}
                            alt={b.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => setFailedImages((prev) => new Set(prev).add(`feat-${b.id}`))}
                          />
                        ) : (
                          <BookCoverPlaceholder seed={b.id} category={b.category} subject={b.subject} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 min-h-[2rem] group-hover:text-indigo-600 transition-colors">{b.title}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">by {normalizeAuthorName(b.author)}</p>
                        <p className="mt-1 text-[10px] font-semibold text-indigo-600">{featuredReason(b)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Library Catalog</h2>
              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-semibold px-3 py-1 rounded-full shadow-2xs text-xs">
                {loading ? "Loading…" : `${totalCount} book${totalCount !== 1 ? "s" : ""}`}
              </Badge>
            </div>

            {loading ? skeletonGrid : catalogGridBooks.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
                  {catalogGridBooks.map(book => {
                    const r = ratings[book.id];
                    const issueCount = borrowCounts[book.id] ?? book.issue_count ?? 0;
                    return (
                      <div
                        key={book.id}
                        onClick={() => navigate(`/book/${book.id}`)}
                        className="group cursor-pointer flex flex-col bg-white rounded-2xl shadow-xs hover:shadow-xl hover:-translate-y-1 border border-slate-200/90 hover:border-indigo-300 transition-all duration-300 overflow-hidden p-3 h-full justify-between"
                      >
                        <div>
                          {/* 3/4 Cover with clean crop and no title-obscuring badge */}
                          <div className="aspect-[3/4] w-full rounded-xl bg-slate-100 overflow-hidden relative shadow-inner mb-3">
                            {(book.cover_url || isbnCoverUrl(book.isbn)) && !failedImages.has(book.id) ? (
                              <img
                                src={book.cover_url || isbnCoverUrl(book.isbn)}
                                alt={book.title}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={() => setFailedImages((prev) => new Set(prev).add(book.id))}
                              />
                            ) : (
                              <BookCoverPlaceholder seed={book.id} category={book.category} subject={book.subject} />
                            )}
                            {user?.role === 'admin' && (
                              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  aria-label={`Edit ${book.title}`}
                                  className="h-6 w-6 rounded-md bg-white/95 shadow-xs hover:bg-white hover:text-indigo-700 text-indigo-600 shrink-0"
                                  onClick={() => navigate('/admin-dashboard')}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            {/* Title (2 lines) */}
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-indigo-600 transition-colors mb-1">
                              {book.title}
                            </h4>
                            {/* Author (1 line normalized) */}
                            <p className="text-[11px] text-slate-500 line-clamp-1 mb-2 font-medium">
                              by {normalizeAuthorName(book.author)}
                            </p>
                            
                            {/* Single Genre Chip */}
                            <div className="flex flex-wrap gap-1 mb-2.5">
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate max-w-full">
                                {displayGenre(book.category, book.title, book.author)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          {/* Standardized footer row: Status + Issue Count on every card for uniform height */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-2 pt-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              book.available_copies > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              {book.available_copies > 0 ? "Available" : "All issued"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {issueCount} issue{issueCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          
                          <div className="flex gap-1.5 pt-2 border-t border-slate-100 relative z-20" onClick={(e) => e.stopPropagation()}>
                            {book.available_copies > 0 ? (
                              <Button size="sm" className="h-9 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs border-0 flex-1 transition-all" onClick={() => requestBook(book.id)}>
                                Borrow
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" className="h-9 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex-1 transition-all" onClick={() => reserveBook(book.id)}>
                                Waitlist
                              </Button>
                            )}
                            <Button size="icon" variant="outline" aria-label={wishlist.has(book.id) ? `Remove ${book.title} from saved books` : `Save ${book.title}`} className={`h-9 w-9 rounded-xl shrink-0 border-slate-200 ${wishlist.has(book.id) ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'hover:bg-slate-100 text-slate-700'}`} onClick={() => toggleWishlist(book.id)}>
                              {wishlist.has(book.id) ? <BookmarkCheck className="h-4 w-4 text-indigo-600" /> : <Bookmark className="h-4 w-4" />}
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
          </>
        )}
      </main>

      <BookDetailDialog book={detailBook} userId={user?.id || null} open={!!detailBook} onOpenChange={o => !o && setDetailBook(null)} />
    </div>
  );
};

export default Catalog;
