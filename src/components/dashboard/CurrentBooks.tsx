import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Clock } from "lucide-react";

interface CurrentBooksProps {
  books: any[];
}

const CurrentBooks = ({ books }: CurrentBooksProps) => {
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
          <div
            key={issue.id}
            className={`p-4 rounded-xl border transition-all hover:shadow-md ${
              isOverdue
                ? 'border-destructive/30 bg-destructive/5'
                : isUrgent
                ? 'border-warning/30 bg-warning/5'
                : 'border-border/50 bg-card hover:border-primary/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isOverdue ? 'bg-destructive/10' : isUrgent ? 'bg-warning/10' : 'bg-primary/10'
              }`}>
                <BookOpen className={`h-5 w-5 ${
                  isOverdue ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-primary'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate">{title}</h4>
                <p className="text-xs text-muted-foreground truncate">by {author}</p>
                {book.category && (
                  <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                    {book.category}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Due: {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <Badge
                variant={isOverdue ? 'destructive' : isUrgent ? 'secondary' : 'default'}
                className={`text-[10px] ${
                  isUrgent && !isOverdue ? 'bg-warning/10 text-warning border-warning/20' : ''
                }`}
              >
                <Clock className="h-3 w-3 mr-1" />
                {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
              </Badge>
            </div>

            <div className="mt-2 text-[10px] text-muted-foreground/70">
              Issued: {issueDate ? new Date(issueDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CurrentBooks;
