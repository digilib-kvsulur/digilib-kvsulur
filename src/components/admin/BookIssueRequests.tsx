import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";

interface BookRequest {
  id: string;
  book_id?: string;
  user_id: string;
  created_at: string;
  status: string;
  admin_notes?: string;
  requested_title?: string;
  requested_author?: string;
  requested_isbn?: string;
  requested_description?: string;
  books?: {
    title: string;
    author: string;
    available_copies: number;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    student_class?: string;
  } | null;
}

const BookIssueRequests = () => {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('book_requests')
        .select(`
          *,
          books:book_id (
            title,
            author,
            available_copies
          ),
          profiles:user_id (
            first_name,
            last_name,
            student_class
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading requests:', error);
        toast({
          title: "Error",
          description: "Failed to load book requests.",
          variant: "destructive",
        });
        return;
      }

      setRequests((data as any) || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, bookId: string, userId: string) => {
    try {
      const { data: book } = await supabase
        .from('books')
        .select('available_copies')
        .eq('id', bookId)
        .single();

      if (!book || book.available_copies <= 0) {
        toast({
          title: "Error",
          description: "Book is not available for issue.",
          variant: "destructive",
        });
        return;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { error: issueError } = await supabase
        .from('book_issues')
        .insert({
          user_id: userId,
          book_id: bookId,
          due_date: dueDate.toISOString().split('T')[0],
        });

      if (issueError) throw issueError;

      const { error: updateError } = await supabase
        .from('books')
        .update({ available_copies: book.available_copies - 1 })
        .eq('id', bookId);

      if (updateError) throw updateError;

      const { error: requestError } = await supabase
        .from('book_requests')
        .update({ 
          status: 'approved',
          admin_notes: 'Book issued successfully'
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      toast({
        title: "Success",
        description: "Book request approved and book issued.",
      });

      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('book_requests')
        .update({ 
          status: 'rejected',
          admin_notes: reason || 'Request rejected by admin'
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book request rejected.",
      });

      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      setDeletingIds(prev => new Set(prev).add(requestId));
      
      const { error } = await supabase
        .from('book_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request deleted successfully.",
      });

      loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request.",
        variant: "destructive",
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status !== 'pending');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Book Requests</CardTitle>
          <CardDescription>Review and process pending book requests from students</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending requests</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Requested On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.profiles?.first_name} {request.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      {request.books ? (
                        <div>
                          <div className="font-medium">{request.books.title}</div>
                          <div className="text-sm text-muted-foreground">by {request.books.author}</div>
                          <div className="text-xs text-muted-foreground">
                            Available: {request.books.available_copies}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{request.requested_title}</div>
                          <div className="text-sm text-muted-foreground">by {request.requested_author}</div>
                          <div className="text-xs text-muted-foreground">Custom Request</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{request.profiles?.student_class || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.book_id && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.id, request.book_id!, request.user_id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Issue Book
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Requests</CardTitle>
          <CardDescription>Previously approved or rejected book requests</CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No processed requests</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.profiles?.first_name} {request.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      {request.books ? (
                        <div>
                          <div className="font-medium">{request.books.title}</div>
                          <div className="text-sm text-muted-foreground">by {request.books.author}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{request.requested_title}</div>
                          <div className="text-sm text-muted-foreground">by {request.requested_author}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {request.admin_notes || 'No notes'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRequest(request.id)}
                        disabled={deletingIds.has(request.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookIssueRequests;
