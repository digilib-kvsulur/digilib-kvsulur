import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, BookOpen, Clock, RefreshCw, AlertCircle, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CurrentBooksProps {
  books: any[];
}

const CurrentBooks = ({ books }: CurrentBooksProps) => {
  const { toast } = useToast();
  const [renewOpen, setRenewOpen] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [renewals, setRenewals] = useState<any[]>([]);

  const fetchRenewals = async () => {
    if (!books || books.length === 0) return;
    const issueIds = books.map(b => b.id);
    const { data } = await supabase.from("book_renewals").select("*").in("book_issue_id", issueIds);
    setRenewals(data || []);
  };

  useEffect(() => {
    fetchRenewals();
  }, [books]);

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

  if (!books || books.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-indigo-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No books currently borrowed</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Visit the library catalog to find your next great read and expand your knowledge!</p>
        <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => window.location.href = '/catalog'}>Browse Catalog</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {books.map((issue) => {
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
            className={`flex flex-col sm:flex-row rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300 ${
              isOverdue ? 'border-red-200 shadow-red-100/50'
              : isUrgent ? 'border-amber-200 shadow-amber-100/50'
              : 'border-slate-200 shadow-slate-100/50 hover:border-indigo-300'
            }`}>
            
            {/* Book Cover Abstract */}
            <div className={`w-full sm:w-28 sm:shrink-0 bg-gradient-to-br ${gradient} p-4 flex flex-col justify-between relative overflow-hidden h-32 sm:h-auto`}>
              <div className="absolute top-0 right-0 p-2 opacity-20">
                <Bookmark className="h-12 w-12 text-white" />
              </div>
              <div className="relative z-10">
                <div className="text-white/80 text-[10px] uppercase font-bold tracking-wider">Book</div>
                <div className="text-white font-black text-xl leading-tight line-clamp-3 mt-1 shadow-sm">{title.substring(0, 2).toUpperCase()}</div>
              </div>
              {issue.accession_number && (
                <div className="relative z-10 mt-auto pt-2">
                  <span className="bg-black/20 text-white text-[9px] font-mono px-2 py-0.5 rounded backdrop-blur-sm">
                    #{issue.accession_number}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h4 className="font-bold text-base text-slate-900 line-clamp-1" title={title}>{title}</h4>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">by {author}</p>
                </div>
                {book.category && <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] whitespace-nowrap">{book.category}</Badge>}
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-slate-400">Issued</span>
                  <span className={isOverdue ? 'text-red-500 font-black' : isUrgent ? 'text-amber-500 font-black' : 'text-slate-400'}>
                    {isOverdue ? `${Math.abs(daysLeft)} days overdue!` : `${daysLeft} days left`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-medium text-slate-400">
                  <span>{new Date(issueDate).toLocaleDateString()}</span>
                  <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
                </div>
              </div>

              {hasPending && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/50">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Renewal pending (+{pendingRenewal.requested_days} days)</span>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 mt-auto flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs font-bold rounded-lg ${isOverdue ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  onClick={() => setRenewOpen(issue.id)}
                  disabled={isOverdue || hasPending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  {isOverdue ? "Overdue" : hasPending ? "Requested" : "Renew Book"}
                </Button>
              </div>

              <Dialog open={renewOpen === issue.id} onOpenChange={o => !o && setRenewOpen(null)}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Renew "{title}"</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Additional Days Needed (1–30)</Label>
                      <Input type="number" min={1} max={30} value={days} onChange={e => setDays(parseInt(e.target.value) || 7)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Reason (Optional)</Label>
                      <Textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Why do you need more time?" className="resize-none h-24" />
                    </div>
                    <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => submitRenewal(issue)}>Submit Request</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CurrentBooks;
