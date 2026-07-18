import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar, BookOpen, Clock, Search, ArrowUpDown, Filter, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookIssue {
  id: string;
  book_id: string;
  user_id: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: string;
  accession_number?: string | null;
  books?: { title: string; author: string };
  user?: { first_name: string; last_name: string; admission_number: string };
}

const BookIssueRegister = () => {
  const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualBookTitle, setManualBookTitle] = useState("");
  const [manualBookAuthor, setManualBookAuthor] = useState("");
  const [libraryBookCode, setLibraryBookCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [accessionNumberInput, setAccessionNumberInput] = useState("");
  const [quickReturnBarcode, setQuickReturnBarcode] = useState("");
  const [isQuickReturning, setIsQuickReturning] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: issuesData, error: issuesError } = await supabase
        .from('book_issues').select('*, books (title, author)')
        .order('issue_date', { ascending: false });
      if (issuesError) throw issuesError;

      const issuesWithProfiles = await Promise.all(
        (issuesData || []).map(async (issue) => {
          const { data: profileData } = await supabase
            .from('profiles').select('first_name, last_name, admission_number')
            .eq('id', issue.user_id).maybeSingle();
          return { ...issue, user: profileData ? { first_name: profileData.first_name || '', last_name: profileData.last_name || '', admission_number: profileData.admission_number || '' } : undefined };
        })
      );

      const { data: booksData } = await supabase.from('books').select('*').gt('available_copies', 0).order('title');
      const { data: usersData } = await supabase.from('profiles').select('id, first_name, last_name, admission_number, student_class').eq('is_approved', true).eq('role', 'student').order('first_name');

      setBookIssues(issuesWithProfiles || []);
      setBooks(booksData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: "Error", description: "Failed to load book issue data", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleIssueBook = async () => {
    if (isManualEntry) {
      if (!manualBookTitle || !manualBookAuthor || !selectedUser || !dueDate) {
        toast({ title: "Missing Information", description: "Please fill in all required fields", variant: "destructive" });
        return;
      }
    } else {
      if (!selectedBook || !selectedUser || !dueDate) {
        toast({ title: "Missing Information", description: "Please fill in all required fields", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isManualEntry) {
        const { data: newBook, error: bookError } = await supabase.from('books')
          .insert({ title: manualBookTitle, author: manualBookAuthor, accession_number: accessionNumberInput.trim() || null, description: 'Manual entry - Physical library book', total_copies: 1, available_copies: 0 })
          .select().single();
        if (bookError) throw bookError;
        const { error: issueError } = await supabase.from('book_issues').insert({
          book_id: newBook.id,
          user_id: selectedUser,
          issue_date: issueDate,
          due_date: dueDate,
          status: 'issued',
          accession_number: accessionNumberInput.trim() || null
        });
        if (issueError) throw issueError;
        toast({ title: "Success", description: "Manual book entry created and issued successfully" });
        setManualBookTitle(""); setManualBookAuthor("");
      } else {
        const { error: issueError } = await supabase.from('book_issues').insert({ 
          book_id: selectedBook, 
          user_id: selectedUser, 
          issue_date: issueDate, 
          due_date: dueDate, 
          status: 'issued',
          accession_number: accessionNumberInput.trim() || null
        });
        if (issueError) throw issueError;
        const { error: updateError } = await supabase.from('books').update({ available_copies: books.find(b => b.id === selectedBook)?.available_copies - 1 }).eq('id', selectedBook);
        if (updateError) throw updateError;
        toast({ title: "Success", description: "Book issued successfully" });
        setSelectedBook("");
      }
      setSelectedUser(""); setIssueDate(today); setDueDate(defaultDue); setAccessionNumberInput("");
      loadData();
    } catch (error) {
      console.error('Error issuing book:', error);
      toast({ title: "Error", description: "Failed to issue book", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleQuickReturn = async () => {
    if (!quickReturnBarcode.trim()) {
      toast({ title: "Error", description: "Please enter or scan an accession number.", variant: "destructive" });
      return;
    }
    setIsQuickReturning(true);
    try {
      const { data: issue, error: fetchError } = await supabase
        .from('book_issues')
        .select('*, books(*)')
        .eq('accession_number', quickReturnBarcode.trim())
        .eq('status', 'issued')
        .maybeSingle();

      if (fetchError || !issue) {
        toast({ title: "Not Found", description: "No active checkout found with this accession number.", variant: "destructive" });
        setIsQuickReturning(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('book_issues')
        .update({ status: 'returned', return_date: new Date().toISOString().split('T')[0] })
        .eq('id', issue.id);

      if (updateError) throw updateError;

      const { data: freshBook } = await supabase
        .from('books')
        .select('available_copies, total_copies')
        .eq('id', issue.book_id)
        .maybeSingle();
      if (freshBook) {
        const next = Math.min((freshBook.available_copies || 0) + 1, freshBook.total_copies || (freshBook.available_copies || 0) + 1);
        const { error: stockError } = await supabase
          .from('books')
          .update({ available_copies: next })
          .eq('id', issue.book_id);
        if (stockError) throw stockError;
      }

      toast({ title: "Success", description: `Book "${issue.books?.title || "book"}" returned successfully!` });
      setQuickReturnBarcode("");
      loadData();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Return Failed", description: "An error occurred during quick return.", variant: "destructive" });
    } finally {
      setIsQuickReturning(false);
    }
  };

  const handleReturnBook = async (issueId: string, bookId: string) => {
    try {
      const { error: updateError } = await supabase.from('book_issues').update({ status: 'returned', return_date: new Date().toISOString().split('T')[0] }).eq('id', issueId);
      if (updateError) throw updateError;
      // Always fetch fresh available_copies from DB — local `books` state filters out zero-copy books.
      const { data: freshBook } = await supabase.from('books').select('available_copies, total_copies').eq('id', bookId).maybeSingle();
      if (freshBook) {
        const next = Math.min((freshBook.available_copies || 0) + 1, freshBook.total_copies || (freshBook.available_copies || 0) + 1);
        const { error: stockErr } = await supabase.from('books').update({ available_copies: next }).eq('id', bookId);
        if (stockErr) throw stockErr;
      }
      toast({ title: "Success", description: "Book returned and stock updated." });
      loadData();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to return book", variant: "destructive" });
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status !== 'issued') return false;
    return new Date(dueDate) < new Date();
  };

  const filteredIssues = bookIssues.filter(issue => {
    const matchesSearch = searchTerm === "" ||
      issue.books?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.user?.admission_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter || (statusFilter === "overdue" && isOverdue(issue.due_date, issue.status));
    return matchesSearch && matchesStatus;
  });

  const overdueCount = bookIssues.filter(i => isOverdue(i.due_date, i.status)).length;
  const issuedCount = bookIssues.filter(i => i.status === 'issued').length;
  const returnedCount = bookIssues.filter(i => i.status === 'returned').length;

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Issues", value: bookIssues.length, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
          { label: "Currently Issued", value: issuedCount, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Returned", value: returnedCount, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
          { label: "Overdue", value: overdueCount, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Issue New Book */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Issue New Book
          </CardTitle>
          <CardDescription>Issue a book to a student</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Switch id="manual-entry" checked={isManualEntry} onCheckedChange={setIsManualEntry} />
              <Label htmlFor="manual-entry" className="text-sm cursor-pointer">Manual book entry (for books not in database)</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {isManualEntry ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Book Title *</Label>
                    <Input value={manualBookTitle} onChange={(e) => setManualBookTitle(e.target.value)} placeholder="Enter book title" className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Author *</Label>
                    <Input value={manualBookAuthor} onChange={(e) => setManualBookAuthor(e.target.value)} placeholder="Enter author name" className="h-10 rounded-lg" />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Select Book *</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Choose a book" /></SelectTrigger>
                    <SelectContent>{books.map(book => <SelectItem key={book.id} value={book.id}>{book.title} ({book.available_copies} avail.)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Select Student *</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Choose a student" /></SelectTrigger>
                  <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.admission_number})</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Accession / Barcode</Label>
                <Input value={accessionNumberInput} onChange={(e) => setAccessionNumberInput(e.target.value)} placeholder="e.g. KV-ACC-1002" className="h-10 rounded-lg" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Issue Date *</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-10 rounded-lg" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Due Date *</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={issueDate} className="h-10 rounded-lg" />
              </div>

              <div className="flex items-end">
                <Button onClick={handleIssueBook} disabled={isSubmitting} className="w-full h-10 gradient-primary border-0 font-semibold shadow-md">
                  {isSubmitting ? "Issuing..." : "Issue Book"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barcode / Accession Quick Return */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary animate-spin-slow" /> Barcode / Accession Quick Return
          </CardTitle>
          <CardDescription>Scan barcode or enter accession number to check in a book instantly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Scan barcode or enter accession number (e.g. KV-ACC-1002)..."
                value={quickReturnBarcode}
                onChange={(e) => setQuickReturnBarcode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickReturn(); }}
                className="h-10 rounded-lg"
              />
            </div>
            <Button onClick={handleQuickReturn} disabled={isQuickReturning} className="h-10 px-6 font-semibold bg-success hover:bg-success/90 border-0 text-white">
              {isQuickReturning ? "Returning..." : "Return Book"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Book Issues Register */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Book Issues Register</CardTitle>
              <CardDescription>All book issues and returns</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, book..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 rounded-lg text-sm" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9 rounded-lg text-sm">
                  <Filter className="h-3 w-3 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredIssues.map((issue) => {
              const overdue = isOverdue(issue.due_date, issue.status);
              return (
                <div key={issue.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all hover:shadow-sm ${overdue ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-card hover:bg-muted/30'}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${issue.status === 'returned' ? 'bg-success/10' : overdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                      <BookOpen className={`h-5 w-5 ${issue.status === 'returned' ? 'text-success' : overdue ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{issue.books?.title || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{issue.books?.author}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{issue.user?.first_name} {issue.user?.last_name}</span>
                        {issue.user?.admission_number && <Badge variant="outline" className="text-[10px] h-5">{issue.user.admission_number}</Badge>}
                        {issue.accession_number && <Badge variant="secondary" className="text-[9px] h-5 font-mono px-1.5 border border-primary/10">Acc: #{issue.accession_number}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 sm:mt-0">
                    <div className="text-right text-xs space-y-0.5">
                      <p className="text-muted-foreground">Issued: {new Date(issue.issue_date).toLocaleDateString()}</p>
                      <p className={overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>Due: {new Date(issue.due_date).toLocaleDateString()}</p>
                      {issue.return_date && <p className="text-success">Returned: {new Date(issue.return_date).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={issue.status === 'returned' ? 'secondary' : overdue ? 'destructive' : 'default'} className="text-[10px]">
                        {overdue ? 'Overdue' : issue.status}
                      </Badge>
                      {issue.status === 'issued' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => handleReturnBook(issue.id, issue.book_id)}>
                          Return
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredIssues.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No book issues found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookIssueRegister;
