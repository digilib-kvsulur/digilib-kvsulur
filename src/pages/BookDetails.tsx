import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Star, Bookmark, BookmarkCheck, BookOpen, MapPin,
  Languages, GraduationCap, ClipboardList, Info, HelpCircle, Loader2, Sparkles, Wand2, Layers
} from "lucide-react";
import { fetchBookByQuery, generateSmartBookDescription } from "@/lib/bookApi";

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
  const [generatingAi, setGeneratingAi] = useState(false);
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

      // If missing description or cover, try to auto-fetch/generate
      if (!bookData.description || bookData.description.trim().length < 20 || !bookData.cover_url || !bookData.category) {
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
      const updates: any = {};

      if (details) {
        if ((!currentBook.description || currentBook.description.trim().length < 20) && details.description) {
          updates.description = details.description;
        }
        if (!currentBook.cover_url && details.cover_url) updates.cover_url = details.cover_url;
        if (!currentBook.category && details.category) updates.category = details.category;
        if (!currentBook.subject && details.subject) updates.subject = details.subject;
        if (!currentBook.language && details.language) updates.language = details.language;
      }

      // If still missing description, generate smart AI summary
      if (!currentBook.description && !updates.description) {
        updates.description = generateSmartBookDescription(currentBook.title, currentBook.author, currentBook.category);
      }
      if (!currentBook.category && !updates.category) {
        updates.category = "General Literature";
      }
      if (!currentBook.language && !updates.language) {
        updates.language = "English";
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("books").update(updates).eq("id", currentBook.id);
        if (!error) {
          setBook((prev: any) => ({ ...prev, ...updates }));
        }
      }
    } catch (err) {
      console.error("Autofetch failed in details view:", err);
    }
  };

  const handleAiRegenerateDetails = async () => {
    if (!book) return;
    setGeneratingAi(true);
    try {
      const smartDesc = generateSmartBookDescription(book.title, book.author, book.category);
      const updates: any = {
        description: smartDesc,
        category: book.category || "General Literature",
        language: book.language || "English"
      };

      const { error } = await supabase.from("books").update(updates).eq("id", book.id);
      if (error) throw error;

      setBook((prev: any) => ({ ...prev, ...updates }));
      toast({ title: "AI Details Generated!", description: "Book overview and metadata have been refreshed." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingAi(false);
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
        if (isReserved) {
          toast({ title: "Already on waitlist", description: "You are already waitlisted for this book." });
        } else {
          await supabase.from("book_reservations").insert({ user_id: userId, book_id: id });
          setIsReserved(true);
          toast({ title: "Added to waitlist", description: "We will notify you when a copy becomes available!" });
        }
      } else {
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

  // Fix: only show numeric average when reviews exist
  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-600 font-semibold">Loading book details...</p>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Header Banner */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-slate-100 to-blue-50">
        {book.cover_url ? (
          <img src={book.cover_url} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-20" />
        ) : (
          <div className="w-full h-full bg-indigo-100/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl border-slate-200 bg-white/90 text-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 font-bold shadow-xs transition-colors text-sm h-9">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-28 sm:-mt-36 relative z-10 space-y-6 sm:space-y-8">
        {/* Top Grid: Cover + Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column - Cover & Actions */}
          <div className="md:col-span-4 space-y-4">
            {/* Cover image – constrained width on mobile */}
            <div className="w-40 sm:w-full mx-auto md:mx-0 aspect-[2/3] rounded-2xl border border-slate-200 overflow-hidden shadow-xl bg-white">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-50 to-blue-50">
                  <BookOpen className="h-10 w-10 text-indigo-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700 line-clamp-3 leading-snug">{book.title}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={requestOrBorrow} 
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-xl font-bold h-11 shadow-md hover:shadow-lg transition-all text-sm"
              >
                {book.available_copies > 0 ? (isRequested ? "Requested ✓" : "Borrow Book") : (isReserved ? "Waitlisted ✓" : "Join Waitlist")}
              </Button>
              <Button 
                onClick={toggleWishlist}
                variant="outline" 
                disabled={actionLoading}
                className={`rounded-xl border-slate-200 bg-white font-semibold h-11 text-sm transition-colors ${inWishlist ? "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-indigo-700 border-indigo-200" : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"}`}
              >
                {inWishlist ? (
                  <><BookmarkCheck className="h-4 w-4 mr-1.5 text-indigo-600" /> Saved</>
                ) : (
                  <><Bookmark className="h-4 w-4 mr-1.5 text-slate-500" /> Wishlist</>
                )}
              </Button>
            </div>

            {/* Copies status */}
            <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Available Copies</span>
                  <span className="text-slate-900 font-extrabold text-sm">{book.available_copies} / {book.total_copies}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-all duration-500" 
                    style={{ width: `${book.total_copies > 0 ? Math.min(100, (book.available_copies / book.total_copies) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {book.available_copies === 0 
                    ? "⚠️ All copies currently checked out."
                    : `🟢 ${book.available_copies} cop${book.available_copies > 1 ? "ies" : "y"} ready to borrow.`}
                </p>
              </CardContent>
            </Card>

            {/* Shelf Location — combined code e.g. 11A (cupboard + shelf row) */}
            {(book.cupboard_number || book.shelf_number) && (
              <Card className="border-indigo-200/80 bg-indigo-50/60 rounded-2xl shadow-xs">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Library Location</p>
                    <p className="text-2xl font-black text-indigo-900 font-mono tracking-tight">
                      {book.cupboard_number ?? ""}{book.shelf_number ?? ""}
                    </p>
                    <p className="text-[10px] text-indigo-400 font-medium">
                      {book.cupboard_number && `Cupboard ${book.cupboard_number}`}
                      {book.cupboard_number && book.shelf_number && " · "}
                      {book.shelf_number && `Row ${book.shelf_number}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Information */}
          <div className="md:col-span-8 space-y-5">
            {/* Title + Badges */}
            <div className="space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">{book.title}</h1>
              <p className="text-base sm:text-lg font-bold text-indigo-600">by {book.author}</p>
              
              <div className="flex flex-wrap gap-1.5 pt-1">
                {book.category && <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-bold border-indigo-100 text-[11px]">{book.category}</Badge>}
                {book.subject && <Badge variant="secondary" className="bg-purple-50 text-purple-700 font-bold border-purple-100 text-[11px]">{book.subject}</Badge>}
                {book.class_level && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold border-emerald-100 text-[11px]">Class {book.class_level}</Badge>}
                {book.language && <Badge variant="secondary" className="bg-amber-50 text-amber-700 font-bold border-amber-100 text-[11px]">{book.language}</Badge>}
              </div>
            </div>

            {/* Book Info Grid — responsive 2-col on mobile, 4-col on sm */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <ClipboardList className="h-4 w-4 text-indigo-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Accession #</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono break-all">{book.accession_number || "—"}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <Languages className="h-4 w-4 text-purple-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Language</span>
                <span className="text-xs sm:text-sm font-black text-slate-900">{book.language || "English"}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <GraduationCap className="h-4 w-4 text-emerald-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Grade</span>
                <span className="text-xs sm:text-sm font-black text-slate-900">{book.class_level ? `Class ${book.class_level}` : "All"}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <Star className="h-4 w-4 text-amber-500 mb-1 fill-amber-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rating</span>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {averageRating ? (
                    <span className="flex items-center gap-1">{averageRating} <Star className="h-3 w-3 fill-amber-400 text-amber-400" /></span>
                  ) : (
                    <span className="text-slate-400 font-semibold text-[11px]">No reviews</span>
                  )}
                </span>
              </div>
            </div>

            {/* Shelf Location inline if not shown in left column on desktop (always show in right column on mobile) */}
            {(book.shelf_number || book.row_number) && (
              <div className="md:hidden">
                {/* Already shown in left column on desktop, handled by conditional above */}
              </div>
            )}

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-600" /> Book Overview
                </h3>
                <Button 
                  onClick={handleAiRegenerateDetails} 
                  disabled={generatingAi} 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                >
                  {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                  AI Auto-generate
                </Button>
              </div>
              
              <div className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                {book.description || generateSmartBookDescription(book.title, book.author, book.category)}
              </div>
            </div>

            {/* Review Writer Block */}
            {userId && (
              <Card className="border-slate-200/80 bg-white rounded-2xl shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-slate-900">
                    <Sparkles className="h-4 w-4 text-amber-500" /> {myReviewId ? "Update your Review" : "Write a Review"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider">Your Rating</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setMyRating(n)} type="button" className="hover:scale-110 transition-transform">
                        <Star className={`h-5 w-5 ${myRating >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
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
                      className="rounded-xl border-slate-200 bg-slate-50 text-sm"
                    />
                  </div>
                  <Button 
                    onClick={submitReview} 
                    disabled={submittingReview} 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-xl font-bold px-5"
                  >
                    {submittingReview ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : (myReviewId ? "Update Review" : "Post Review")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Review List */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Student Reviews ({reviews.length})
                {averageRating && (
                  <span className="ml-2 text-sm font-bold text-amber-500">{averageRating} ★</span>
                )}
              </h3>
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-white p-4 rounded-xl border border-dashed border-slate-200">No student reviews written yet. Be the first to share your thoughts!</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => {
                    const authorInitials = `${(r.profiles?.first_name?.[0] || "").toUpperCase()}${(r.profiles?.last_name?.[0] || "").toUpperCase()}`;
                    return (
                      <div key={r.id} className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex gap-3 sm:gap-4 items-start">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600 shrink-0">
                          {authorInitials || <HelpCircle className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{r.profiles?.first_name} {r.profiles?.last_name}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: r.rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                              {Array.from({ length: 5 - r.rating }).map((_, i) => (
                                <Star key={`e${i}`} className="h-3 w-3 text-slate-200" />
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          {r.review_text && <p className="text-sm text-slate-600 leading-relaxed">{r.review_text}</p>}
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
          <div className="border-t border-slate-200 pt-8 space-y-5">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Recommended For You</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
              {relatedBooks.map((b) => (
                <div key={b.id} onClick={() => navigate(`/book/${b.id}`)} className="group cursor-pointer space-y-2">
                  <div className="aspect-[2/3] w-full rounded-2xl border border-slate-200 bg-white overflow-hidden relative shadow-md group-hover:shadow-lg transition-all">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-indigo-50">
                        <BookOpen className="h-7 w-7 text-indigo-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700 line-clamp-3 leading-snug">{b.title}</span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors leading-snug">{b.title}</h4>
                  <p className="text-[10px] text-slate-500 truncate">by {b.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
