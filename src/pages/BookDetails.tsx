import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft, Star, Heart, Bookmark, BookmarkCheck, Calendar, BookOpen, 
  Languages, GraduationCap, ClipboardList, Info, HelpCircle, Loader2, Sparkles
} from "lucide-react";
import { fetchBookByQuery } from "@/lib/bookApi";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
}

export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedBooks, setRelatedBooks] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState("");
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    init();
  }, [id]);

  const init = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);

      // Load book
      const { data: bookData, error: bookErr } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();
      
      if (bookErr || !bookData) {
        toast({ title: "Error", description: "Book not found", variant: "destructive" });
        navigate("/catalog");
        return;
      }
      setBook(bookData);

      // If missing description or cover, try to auto-fetch
      if (!bookData.description || !bookData.cover_url) {
        triggerAutofetch(bookData);
      }

      // Check wishlist / reservation status
      if (uid) {
        const [{ data: wl }, { data: rs }, { data: rq }] = await Promise.all([
          supabase.from("book_wishlist").select("id").eq("user_id", uid).eq("book_id", id).maybeSingle(),
          supabase.from("book_reservations").select("id").eq("user_id", uid).eq("book_id", id).eq("status", "pending").maybeSingle(),
          supabase.from("book_requests").select("id").eq("user_id", uid).eq("book_id", id).eq("status", "pending").maybeSingle(),
        ]);
        setInWishlist(!!wl);
        setIsReserved(!!rs);
        setIsRequested(!!rq);
      }

      // Load reviews
      const { data: revs } = await supabase
        .from("book_reviews")
        .select("*, profiles:user_id(first_name,last_name,avatar_url)")
        .eq("book_id", id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });
      
      const castRevs = (revs || []).map((r: any) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] || null : r.profiles || null
      })) as Review[];

      setReviews(castRevs);

      if (uid) {
        const mine = castRevs.find((r) => r.user_id === uid);
        if (mine) {
          setMyRating(mine.rating);
          setMyText(mine.review_text || "");
          setMyReviewId(mine.id);
        } else {
          setMyRating(0);
          setMyText("");
          setMyReviewId(null);
        }
      }

      // Load related books (by category)
      if (bookData.category) {
        const { data: rels } = await supabase
          .from("books")
          .select("id, title, author, cover_url, category")
          .eq("category", bookData.category)
          .neq("id", id)
          .limit(4);
        setRelatedBooks(rels || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutofetch = async (currentBook: any) => {
    try {
      const details = await fetchBookByQuery(currentBook.title, currentBook.author);
      if (details) {
        const updates: any = {};
        if (!currentBook.description && details.description) updates.description = details.description;
        if (!currentBook.cover_url && details.cover_url) updates.cover_url = details.cover_url;
        if (!currentBook.category && details.category) updates.category = details.category;
        if (!currentBook.subject && details.subject) updates.subject = details.subject;
        if (!currentBook.language && details.language) updates.language = details.language;

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase.from("books").update(updates).eq("id", currentBook.id);
          if (!error) {
            setBook((prev: any) => ({ ...prev, ...updates }));
          }
        }
      }
    } catch (err) {
      console.error("Autofetch failed in details view:", err);
    }
  };

  const toggleWishlist = async () => {
    if (!userId) { toast({ title: "Sign in required", variant: "destructive" }); navigate("/login"); return; }
    setActionLoading(true);
    try {
      if (inWishlist) {
        await supabase.from("book_wishlist").delete().eq("user_id", userId).eq("book_id", id);
        setInWishlist(false);
        toast({ title: "Removed from Wishlist" });
      } else {
        await supabase.from("book_wishlist").insert({ user_id: userId, book_id: id });
        setInWishlist(true);
        toast({ title: "Added to Wishlist" });
      }
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const requestOrBorrow = async () => {
    if (!userId) { toast({ title: "Sign in required", variant: "destructive" }); navigate("/login"); return; }
    setActionLoading(true);
    try {
      if (book.available_copies <= 0) {
        // Reserve / Waitlist
        if (isReserved) {
          toast({ title: "Already on waitlist", description: "You are already waitlisted for this book." });
        } else {
          await supabase.from("book_reservations").insert({ user_id: userId, book_id: id });
          setIsReserved(true);
          toast({ title: "Added to waitlist", description: "We will notify you when a copy becomes available!" });
        }
      } else {
        // Request borrow
        if (isRequested) {
          toast({ title: "Already requested", description: "Your borrow request is pending admin approval." });
        } else {
          await supabase.from("book_requests").insert({ user_id: userId, book_id: id });
          setIsRequested(true);
          toast({ title: "Request submitted", description: "Your request is pending admin approval." });
        }
      }
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { toast({ title: "Sign in required", variant: "destructive" }); navigate("/login"); return; }
    if (myRating < 1) { toast({ title: "Error", description: "Please pick a star rating.", variant: "destructive" }); return; }

    setSubmittingReview(true);
    try {
      const payload = {
        book_id: id,
        user_id: userId,
        rating: myRating,
        review_text: myText.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = myReviewId
        ? await supabase.from("book_reviews").update(payload).eq("id", myReviewId)
        : await supabase.from("book_reviews").insert(payload);

      if (error) throw error;
      toast({ title: "Success", description: "Review posted successfully!" });
      init();
    } catch (e: any) {
      toast({ title: "Failed to post review", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "No reviews";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Loading book details...</p>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="min-h-screen bg-[#070913] text-gray-100 pb-20 select-none">
      {/* Blurred cover background wrapper */}
      <div className="relative h-72 w-full overflow-hidden border-b border-white/5 bg-[#0a0d1e]">
        {book.cover_url ? (
          <img src={book.cover_url} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-30" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-950/20 to-violet-950/20 opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070913] via-transparent to-transparent" />
        <div className="absolute top-6 left-6 z-10">
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl border-white/10 bg-black/40 hover:bg-black/60 text-white font-semibold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 -mt-36 relative z-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column - Cover & Actions */}
          <div className="md:col-span-4 space-y-5">
            <div className="aspect-[2/3] w-full rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-white/5 relative group">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-500/10 to-violet-600/10">
                  <BookOpen className="h-12 w-12 text-indigo-400/40 mb-3" />
                  <span className="text-sm font-semibold text-gray-400 line-clamp-3 leading-snug">{book.title}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={requestOrBorrow} 
                disabled={actionLoading}
                className="gradient-primary border-0 rounded-xl font-bold h-12 shadow-lg hover:shadow-xl transition-all"
              >
                {book.available_copies > 0 ? (isRequested ? "Requested" : "Borrow Book") : (isReserved ? "Waitlisted" : "Join Waitlist")}
              </Button>
              <Button 
                onClick={toggleWishlist}
                variant="outline" 
                disabled={actionLoading}
                className="rounded-xl border-white/10 hover:bg-white/5 font-semibold h-12"
              >
                {inWishlist ? (
                  <><BookmarkCheck className="h-4 w-4 mr-2 text-indigo-400" /> Saved</>
                ) : (
                  <><Bookmark className="h-4 w-4 mr-2" /> Wishlist</>
                )}
              </Button>
            </div>

            {/* Copies status widget */}
            <Card className="border-white/5 bg-[#090b16] rounded-2xl">
              <CardContent className="p-4.5 space-y-3.5">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                  <span>Available Copies</span>
                  <span className="text-white font-extrabold text-sm">{book.available_copies} / {book.total_copies}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500" 
                    style={{ width: `${Math.min(100, (book.available_copies / book.total_copies) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  {book.available_copies === 0 
                    ? "⚠️ All copies currently checked out. Click Join Waitlist to reserve."
                    : `🟢 ${book.available_copies} copies ready to borrow immediately.`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Information */}
          <div className="md:col-span-8 space-y-6">
            <div className="space-y-3.5">
              <h2 className="text-3.5xl font-black text-white tracking-tight leading-tight">{book.title}</h2>
              <p className="text-lg font-bold text-indigo-400">by {book.author}</p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                {book.category && <Badge variant="secondary" className="bg-white/5 text-indigo-300 font-bold border-0">{book.category}</Badge>}
                {book.subject && <Badge variant="secondary" className="bg-white/5 text-purple-300 font-bold border-0">{book.subject}</Badge>}
                {book.class_level && <Badge variant="secondary" className="bg-white/5 text-emerald-300 font-bold border-0">Class {book.class_level}</Badge>}
                {book.language && <Badge variant="secondary" className="bg-white/5 text-amber-300 font-bold border-0">{book.language}</Badge>}
              </div>
            </div>

            {/* Book Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center sm:text-left">
                <ClipboardList className="h-4 w-4 text-indigo-400 mb-1 mx-auto sm:mx-0" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Accession #</span>
                <span className="text-sm font-black text-white font-mono">{book.accession_number || "—"}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center sm:text-left">
                <Languages className="h-4 w-4 text-purple-400 mb-1 mx-auto sm:mx-0" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Language</span>
                <span className="text-sm font-black text-white">{book.language || "—"}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center sm:text-left">
                <GraduationCap className="h-4 w-4 text-emerald-400 mb-1 mx-auto sm:mx-0" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Grade Class</span>
                <span className="text-sm font-black text-white">{book.class_level ? `Class ${book.class_level}` : "All Grades"}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center sm:text-left">
                <Star className="h-4 w-4 text-amber-400 mb-1 mx-auto sm:mx-0 fill-amber-400/10" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">User Rating</span>
                <span className="text-sm font-black text-white">{averageRating}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-400" /> Book Overview
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed bg-[#090b16] border border-white/5 rounded-2xl p-5">
                {book.description || (
                  <span className="italic text-gray-500">No overview description available. Details are being fetched from online registers...</span>
                )}
              </p>
            </div>

            {/* Review Writer Block */}
            {userId && (
              <Card className="border-white/5 bg-[#090b16] rounded-2xl">
                <CardHeader className="pb-3 border-b border-white/5">
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" /> {myReviewId ? "Update your Review" : "Write a Review"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-wider">Your Rating</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setMyRating(n)} type="button" className="hover:scale-110 transition-transform">
                        <Star className={`h-5 w-5 ${myRating >= n ? "fill-amber-400 text-amber-400" : "text-gray-500"}`} />
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Textarea 
                      placeholder="Share your thoughts about this book (favorite parts, reading level, lesson learned)..." 
                      value={myText} 
                      onChange={(e) => setMyText(e.target.value)} 
                      rows={3} 
                      maxLength={500}
                      className="rounded-xl border-white/10 bg-white/5 text-sm"
                    />
                  </div>
                  <Button 
                    onClick={submitReview} 
                    disabled={submittingReview} 
                    size="sm" 
                    className="gradient-primary border-0 rounded-xl font-bold px-5"
                  >
                    {submittingReview ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : (myReviewId ? "Update Review" : "Post Review")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Review List */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Student Reviews ({reviews.length})</h3>
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-500 italic bg-white/5 p-4 rounded-xl border border-dashed border-white/5">No student reviews written yet. Be the first to share your thoughts!</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => {
                    const authorInitials = `${(r.profiles?.first_name?.[0] || "").toUpperCase()}${(r.profiles?.last_name?.[0] || "").toUpperCase()}`;
                    return (
                      <div key={r.id} className="p-4 rounded-2xl bg-[#090b16] border border-white/5 flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-400 shrink-0">
                          {authorInitials || <HelpCircle className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white">{r.profiles?.first_name} {r.profiles?.last_name}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: r.rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          {r.review_text && <p className="text-sm text-gray-400 leading-relaxed font-medium">{r.review_text}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <div className="border-t border-white/5 pt-10 space-y-6">
            <h3 className="text-xl font-black text-white">Recommended For You</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {relatedBooks.map((b) => (
                <div key={b.id} onClick={() => navigate(`/book/${b.id}`)} className="group cursor-pointer space-y-2">
                  <div className="aspect-[2/3] w-full rounded-2xl border border-white/5 bg-white/5 overflow-hidden relative shadow-lg group-hover:border-indigo-500/20 transition-colors">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#090b16]">
                        <BookOpen className="h-7 w-7 text-indigo-400/40 mb-2" />
                        <span className="text-xs font-semibold text-gray-400 line-clamp-3 leading-snug">{b.title}</span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors leading-snug">{b.title}</h4>
                  <p className="text-[10px] text-gray-500 truncate">by {b.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
