import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, BookOpen, Clock, RefreshCw, AlertCircle, Bookmark, Search, Check, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CurrentBooksProps {
  books: any[];
}

const CurrentBooks = ({ books = [] }: CurrentBooksProps) => {
  const { toast } = useToast();
  const [renewOpen, setRenewOpen] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [renewals, setRenewals] = useState<any[]>([]);

  // Search catalog state
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogBooks, setCatalogBooks] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestedBookIds, setRequestedBookIds] = useState<Set<string>>(new Set());

  // Filter out any duplicates to prevent duplicate cards
  const uniqueIssues = books.reduce((acc: any[], current: any) => {
    const bookId = current.books?.id;
    if (!bookId) {
      acc.push(current);
    } else if (!acc.some(item => item.books?.id === bookId)) {
      acc.push(current);
    }
    return acc;
  }, []);

  const fetchRenewals = async () => {
    if (!uniqueIssues || uniqueIssues.length === 0) return;
    const issueIds = uniqueIssues.map(b => b.id);
    const { data } = await supabase.from("book_renewals").select("*").in("book_issue_id", issueIds);
    setRenewals(data || []);
  };

  useEffect(() => {
    fetchRenewals();
  }, [books]);

  // Search catalog function
  useEffect(() => {
    if (!catalogOpen) return;
    const search = async () => {
      setSearching(true);
      try {
        let q = supabase.from("books").select("id, title, author, category, cover_url, available_copies").gt("total_copies", 0);
        if (searchQuery.trim()) {
          q = q.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`);
        }
        const { data } = await q.limit(6);
        setCatalogBooks(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    };
    const delayDebounceFn = setTimeout(search, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, catalogOpen]);

  const handleRequestBook = async (bookId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Sign in required", variant: "destructive" });
        return;
      }

      // Check if already requested
      const { data: existing } = await supabase
        .from("book_requests")
        .select("id")
        .eq("book_id", bookId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast({ title: "Already requested", description: "You have a pending request for this book.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("book_requests").insert({ book_id: bookId, user_id: user.id });
      if (error) throw error;

      setRequestedBookIds(prev => new Set([...prev, bookId]));
      toast({ title: "Request submitted!", description: "An admin will process your request." });
    } catch (err: any) {
      toast({ title: "Failed to request", description: err.message, variant: "destructive" });
    }
  };

  const submitRenewal = async (issue: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("book_renewals").insert({
      book_issue_id: issue.id, user_id: user.id, requested_days: days, student_note: note || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Renewal requested", description: "An admin will review shortly." });
    setRenewOpen(null); setNote(""); setDays(7);
    fetchRenewals();
  };

  const getGradientByTitle = (title: string) => {
    const gradients = [
      "from-blue-500 to-indigo-600",
      "from-emerald-400 to-teal-600",
      "from-rose-400 to-red-600",
      "from-amber-400 to-orange-600",
      "from-purple-500 to-fuchsia-600"
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="space-y-6">
      {/* Header section with Borrow from Catalog button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg">Currently Reading</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage renewals and requests for your borrowed items.</p>
        </div>
        
        <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-9 text-xs shadow-sm gap-2">
              <Search className="w-3.5 h-3.5" /> Request a Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-[92%] rounded-2xl p-5 gap-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Search className="h-4.5 w-4.5 text-indigo-600" /> Quick Book Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search catalog by title or author..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 text-sm rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {searching ? (
                  <p className="text-center text-xs text-muted-foreground py-8">Searching library catalog...</p>
                ) : catalogBooks.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">
                    {searchQuery ? "No matching books found." : "Type above to search books..."}
                  </p>
                ) : (
                  catalogBooks.map(book => {
                    const requested = requestedBookIds.has(book.id);
                    return (
                      <div key={book.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-14 rounded-lg bg-slate-100 shrink-0 overflow-hidden relative shadow-xs">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
                              <BookOpen className="h-4 w-4 text-indigo-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-800 truncate">{book.title}</h5>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">by {book.author}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className={`text-[8px] font-bold px-1.5 py-0 ${book.available_copies > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                              {book.available_copies > 0 ? `${book.available_copies} Available` : "Checked Out"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={requested}
                          onClick={() => handleRequestBook(book.id)}
                          className={`h-7 px-3 text-[10px] font-bold rounded-lg ${requested ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                        >
                          {requested ? <Check className="w-3.5 h-3.5" /> : "Request"}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <Button onClick={() => setCatalogOpen(false)} className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
              Close Window
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {uniqueIssues.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-indigo-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No books currently borrowed</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Visit the library catalog to find your next great read and expand your knowledge!</p>
          <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => window.location.href = '/catalog'}>Browse Catalog</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {uniqueIssues.map((issue) => {
            const book = issue.books || {};
            const title = book.title || 'Unknown Book';
            const author = book.author || 'Unknown Author';
            const issueDate = issue.issue_date;
            const dueDate = issue.due_date;
            const totalDays = issueDate && dueDate ? Math.ceil((new Date(dueDate).getTime() - new Date(issueDate).getTime()) / (1000 * 60 * 60 * 24)) : 14;
            const daysLeft = dueDate
              ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : 0;
            const isOverdue = daysLeft < 0;
            const isUrgent = daysLeft >= 0 && daysLeft <= 3;
            
            const progressPercent = isOverdue ? 100 : Math.max(0, 100 - (daysLeft / totalDays) * 100);

            const pendingRenewal = renewals.find(
              (r) => r.book_issue_id === issue.id && r.status === "pending"
            );
            const hasPending = !!pendingRenewal;
            const gradient = getGradientByTitle(title);

            return (
              <div key={issue.id}
                className={`flex rounded-xl border bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 duration-300 ${
                  isOverdue ? 'border-red-200 shadow-red-50/50'
                  : isUrgent ? 'border-amber-200 shadow-amber-50/50'
                  : 'border-slate-200 shadow-slate-50/30 hover:border-indigo-300'
                }`}>
                
                {/* Book Cover (Actual or elegant fallback) */}
                <div className="w-20 sm:w-28 sm:shrink-0 overflow-hidden relative shadow-inner flex items-center justify-center shrink-0">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} p-3 flex flex-col justify-between`}>
                      <div className="relative z-10">
                        <div className="text-white/80 text-[8px] uppercase font-bold tracking-wider">Book</div>
                        <div className="text-white font-black text-sm leading-tight line-clamp-3 mt-1 shadow-sm">{title.substring(0, 2).toUpperCase()}</div>
                      </div>
                      {issue.accession_number && (
                        <div className="relative z-10 mt-auto">
                          <span className="bg-black/20 text-white text-[8px] font-mono px-1 rounded backdrop-blur-sm">
                            #{issue.accession_number}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 p-3 sm:p-5 flex flex-col min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate" title={title}>{title}</h4>
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate">by {author}</p>
                    </div>
                    {book.category && <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[8px] sm:text-[10px] whitespace-nowrap px-1.5 py-0 shrink-0">{book.category}</Badge>}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                      <span className="text-slate-400">Issued</span>
                      <span className={isOverdue ? 'text-red-500 font-black' : isUrgent ? 'text-amber-500 font-black' : 'text-slate-400'}>
                        {isOverdue ? `${Math.abs(daysLeft)} days overdue!` : `${daysLeft} days left`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] sm:text-[9px] font-medium text-slate-400">
                      <span>{new Date(issueDate).toLocaleDateString()}</span>
                      <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {hasPending && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/30">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-semibold truncate">Renewal pending (+{pendingRenewal.requested_days} days)</span>
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 mt-auto flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-7 text-[10px] font-bold rounded-lg ${isOverdue ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'}`}
                      onClick={() => setRenewOpen(issue.id)}
                      disabled={isOverdue || hasPending}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {isOverdue ? "Overdue" : hasPending ? "Requested" : "Renew"}
                    </Button>
                  </div>

                  <Dialog open={renewOpen === issue.id} onOpenChange={o => !o && setRenewOpen(null)}>
                    <DialogContent className="sm:max-w-[425px] w-[92%] rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">Renew "{title}"</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-3 text-xs">
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold">Additional Days Needed (1–30)</Label>
                          <Input type="number" min={1} max={30} value={days} onChange={e => setDays(parseInt(e.target.value) || 7)} className="h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold">Reason (Optional)</Label>
                          <Textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Why do you need more time?" className="resize-none h-20" />
                        </div>
                        <Button className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => submitRenewal(issue)}>Submit Request</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CurrentBooks;
