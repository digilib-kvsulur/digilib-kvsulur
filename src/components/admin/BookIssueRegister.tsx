
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar, BookOpen, User, Clock } from "lucide-react";
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
  book?: {
    title: string;
    author: string;
  };
  user?: {
    first_name: string;
    last_name: string;
    admission_number: string;
  };
}

const BookIssueRegister = () => {
  const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualBookTitle, setManualBookTitle] = useState("");
  const [manualBookAuthor, setManualBookAuthor] = useState("");
  const [libraryBookCode, setLibraryBookCode] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load book issues with book and user details
      const { data: issuesData, error: issuesError } = await supabase
        .from('book_issues')
        .select(`
          *,
          books (title, author)
        `)
        .order('issue_date', { ascending: false });

      if (issuesError) throw issuesError;

      // Manually fetch profile data for each issue
      const issuesWithProfiles = await Promise.all(
        (issuesData || []).map(async (issue) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, admission_number')
            .eq('id', issue.user_id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }

          return {
            ...issue,
            user: profileData ? {
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              admission_number: profileData.admission_number || ''
            } : undefined
          };
        })
      );


      // Load available books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .gt('available_copies', 0)
        .order('title');

      if (booksError) throw booksError;

      // Load approved users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, admission_number')
        .eq('is_approved', true)
        .eq('role', 'student')
        .order('first_name');

      if (usersError) throw usersError;

      setBookIssues(issuesWithProfiles || []);
      setBooks(booksData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load book issue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueBook = async () => {
    // Validation for manual entry
    if (isManualEntry) {
      if (!manualBookTitle || !manualBookAuthor || !libraryBookCode || !selectedUser || !dueDate) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!selectedBook || !selectedUser || !dueDate) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isManualEntry) {
        // Create a temporary book entry for manual books
        const { data: newBook, error: bookError } = await supabase
          .from('books')
          .insert({
            title: manualBookTitle,
            author: manualBookAuthor,
            isbn: libraryBookCode,
            description: 'Manual entry - Physical library book',
            total_copies: 1,
            available_copies: 0 // Set to 0 since it's being issued
          })
          .select()
          .single();

        if (bookError) throw bookError;

        // Create book issue record with the new book
        const { error: issueError } = await supabase
          .from('book_issues')
          .insert({
            book_id: newBook.id,
            user_id: selectedUser,
            due_date: dueDate,
            status: 'issued'
          });

        if (issueError) throw issueError;

        toast({
          title: "Success",
          description: "Manual book entry created and issued successfully",
        });

        // Reset manual form
        setManualBookTitle("");
        setManualBookAuthor("");
        setLibraryBookCode("");
      } else {
        // Regular book issue process
        // Create book issue record
        const { error: issueError } = await supabase
          .from('book_issues')
          .insert({
            book_id: selectedBook,
            user_id: selectedUser,
            due_date: dueDate,
            status: 'issued'
          });

        if (issueError) throw issueError;

        // Update book available copies
        const { error: updateError } = await supabase
          .from('books')
          .update({ 
            available_copies: books.find(b => b.id === selectedBook)?.available_copies - 1 
          })
          .eq('id', selectedBook);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Book issued successfully",
        });

        // Reset form
        setSelectedBook("");
      }

      // Reset common fields and reload data
      setSelectedUser("");
      setDueDate("");
      loadData();
    } catch (error) {
      console.error('Error issuing book:', error);
      toast({
        title: "Error",
        description: "Failed to issue book",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnBook = async (issueId: string, bookId: string) => {
    try {
      // Update book issue status
      const { error: updateError } = await supabase
        .from('book_issues')
        .update({ 
          status: 'returned',
          return_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', issueId);

      if (updateError) throw updateError;

      // Update book available copies
      const { error: bookUpdateError } = await supabase
        .from('books')
        .update({ 
          available_copies: books.find(b => b.id === bookId)?.available_copies + 1 
        })
        .eq('id', bookId);

      if (bookUpdateError) throw bookUpdateError;

      toast({
        title: "Success",
        description: "Book returned successfully",
      });

      loadData();
    } catch (error) {
      console.error('Error returning book:', error);
      toast({
        title: "Error",
        description: "Failed to return book",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Issue New Book */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Issue New Book
          </CardTitle>
          <CardDescription>Issue a book to a student</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Manual Entry Toggle */}
            <div className="flex items-center space-x-2">
              <Switch 
                id="manual-entry" 
                checked={isManualEntry} 
                onCheckedChange={setIsManualEntry}
              />
              <Label htmlFor="manual-entry">Manual book entry (for books not in database)</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Book Selection or Manual Entry */}
              {isManualEntry ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="manual-title">Book Title</Label>
                    <Input
                      id="manual-title"
                      value={manualBookTitle}
                      onChange={(e) => setManualBookTitle(e.target.value)}
                      placeholder="Enter book title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-author">Author</Label>
                    <Input
                      id="manual-author"
                      value={manualBookAuthor}
                      onChange={(e) => setManualBookAuthor(e.target.value)}
                      placeholder="Enter author name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="library-code">Library Book Code</Label>
                    <Input
                      id="library-code"
                      value={libraryBookCode}
                      onChange={(e) => setLibraryBookCode(e.target.value)}
                      placeholder="Enter library code"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="book-select">Select Book</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a book" />
                    </SelectTrigger>
                    <SelectContent>
                      {books.map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} by {book.author} ({book.available_copies} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Student Selection */}
              <div className="space-y-2">
                <Label htmlFor="user-select">Select Student</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.admission_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Issue Button */}
              <div className="flex items-end">
                <Button 
                  onClick={handleIssueBook} 
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Issuing..." : "Issue Book"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Book Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Issues Register
          </CardTitle>
          <CardDescription>All book issues and returns</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookIssues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{issue.book?.title}</p>
                      <p className="text-sm text-gray-600">{issue.book?.author}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {issue.user?.first_name} {issue.user?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{issue.user?.admission_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(issue.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(issue.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {issue.return_date 
                      ? new Date(issue.return_date).toLocaleDateString() 
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={issue.status === 'issued' ? 'default' : 'secondary'}
                      className={
                        issue.status === 'issued' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'
                      }
                    >
                      {issue.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {issue.status === 'issued' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReturnBook(issue.id, issue.book_id)}
                      >
                        Mark Returned
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {bookIssues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No book issues found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookIssueRegister;
