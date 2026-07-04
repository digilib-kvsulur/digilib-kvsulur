import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, BookOpen, Clock, RefreshCw } from "lucide-react";
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

  const submitRenewal = async (issue: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("book_renewals").insert({
      book_issue_id: issue.id, user_id: user.id, requested_days: days, student_note: note || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Renewal requested", description: "An admin will review shortly." });
    setRenewOpen(null); setNote(""); setDays(7);
  };

  if (!books || books.length === 0) {
    return (
      <div className="text-center py-10">
        <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No books currently borrowed</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Browse the catalog to find your next read!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {books.map((issue) => {
        const book = issue.books || {};
        const title = book.title || 'Unknown Book';
        const author = book.author || 'Unknown Author';
        const issueDate = issue.issue_date;
        const dueDate = issue.due_date;
        const daysLeft = dueDate
          ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        const isOverdue = daysLeft < 0;
        const isUrgent = daysLeft >= 0 && daysLeft <= 3;

        return (
          <div key={issue.id}
            className={`p-4 rounded-xl border transition-all hover:shadow-md ${
              isOverdue ? 'border-destructive/30 bg-destructive/5'
              : isUrgent ? 'border-warning/30 bg-warning/5'
              : 'border-border/50 bg-card hover:border-primary/30'
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isOverdue ? 'bg-destructive/10' : isUrgent ? 'bg-warning/10' : 'bg-primary/10'
              }`}>
                <BookOpen className={`h-5 w-5 ${isOverdue ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate">{title}</h4>
                <p className="text-xs text-muted-foreground truncate">by {author}</p>
                {book.category && <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">{book.category}</Badge>}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Due: {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <Badge variant={isOverdue ? 'destructive' : isUrgent ? 'secondary' : 'default'}
                className={`text-[10px] ${isUrgent && !isOverdue ? 'bg-warning/10 text-warning border-warning/20' : ''}`}>
                <Clock className="h-3 w-3 mr-1" />
                {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft <= 3 ? `Due soon · ${daysLeft}d` : `${daysLeft}d left`}
              </Badge>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/70">Issued: {issueDate ? new Date(issueDate).toLocaleDateString() : 'N/A'}</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRenewOpen(issue.id)}>
                <RefreshCw className="h-3 w-3 mr-1" />Request renewal
              </Button>
            </div>

            <Dialog open={renewOpen === issue.id} onOpenChange={o => !o && setRenewOpen(null)}>
              <DialogContent>
                <DialogHeader><DialogTitle>Renew "{title}"</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Extra days (1–30)</Label>
                    <Input type="number" min={1} max={30} value={days} onChange={e => setDays(parseInt(e.target.value) || 7)} />
                  </div>
                  <div>
                    <Label>Note (optional)</Label>
                    <Textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Why do you need more time?" />
                  </div>
                  <Button className="w-full" onClick={() => submitRenewal(issue)}>Submit request</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      })}
    </div>
  );
};

export default CurrentBooks;
