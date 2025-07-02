import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookRequest {
  id: string;
  book_id: string;
  user_id: string;
  requested_at: string;
  status: string;
  admin_notes?: string;
  books?: {
    title: string;
    author: string;
    available_copies: number;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    admission_number: string;
  };
}

const BookIssueRequests = () => {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('book_requests')
        .select(`
          *,
          books (title, author, available_copies),
          profiles!book_requests_user_id_fkey (first_name, last_name, admission_number)
        `)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        // If the foreign key relationship fails, try a manual approach
        const { data: requestsData, error: requestsError } = await supabase
          .from('book_requests')
          .select(`
            *,
            books (title, author, available_copies)
          `)
          .order('requested_at', { ascending: false });

        if (requestsError) throw requestsError;

        // Manually fetch profile data for each request
        const requestsWithProfiles = await Promise.all(
          (requestsData || []).map(async (request) => {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('first_name, last_name, admission_number')
              .eq('id', request.user_id)
              .maybeSingle();

            if (profileError) {
              console.error('Error fetching profile:', profileError);
            }

            return {
              ...request,
              profiles: profileData ? {
                first_name: profileData.first_name || '',
                last_name: profileData.last_name || '',
                admission_number: profileData.admission_number || ''
              } : undefined
            };
          })
        );

        setRequests(requestsWithProfiles);
      } else {
        console.log('Book requests loaded:', data);
        setRequests(data || []);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "Error",
        description: "Failed to load book requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, bookId: string, userId: string) => {
    try {
      // Check if book is still available
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('available_copies')
        .eq('id', bookId)
        .single();

      if (bookError) throw bookError;

      if (bookData.available_copies <= 0) {
        toast({
          title: "Book Not Available",
          description: "This book is no longer available for issue",
          variant: "destructive",
        });
        return;
      }

      // Create book issue
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks from now

      const { error: issueError } = await supabase
        .from('book_issues')
        .insert({
          book_id: bookId,
          user_id: userId,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'issued'
        });

      if (issueError) throw issueError;

      // Update book available copies
      const { error: updateBookError } = await supabase
        .from('books')
        .update({ available_copies: bookData.available_copies - 1 })
        .eq('id', bookId);

      if (updateBookError) throw updateBookError;

      // Update request status
      const { error: updateRequestError } = await supabase
        .from('book_requests')
        .update({ 
          status: 'approved',
          admin_notes: 'Request approved and book issued'
        })
        .eq('id', requestId);

      if (updateRequestError) throw updateRequestError;

      toast({
        title: "Success",
        description: "Request approved and book issued successfully",
      });

      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
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
        description: "Request rejected successfully",
      });

      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
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

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Book Requests
          </CardTitle>
          <CardDescription>Book issue requests awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Available Copies</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.books?.title || 'Unknown Book'}</p>
                      <p className="text-sm text-gray-600">{request.books?.author || 'Unknown Author'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {request.profiles?.first_name || 'Unknown'} {request.profiles?.last_name || 'User'}
                      </p>
                      <p className="text-sm text-gray-600">{request.profiles?.admission_number || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={request.books?.available_copies && request.books.available_copies > 0 ? 'default' : 'destructive'}
                    >
                      {request.books?.available_copies || 0} available
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request.id, request.book_id, request.user_id)}
                        disabled={!request.books?.available_copies || request.books.available_copies <= 0}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
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
              {pendingRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No pending requests
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Processed Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processed Requests
          </CardTitle>
          <CardDescription>Previously approved or rejected requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admin Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.books?.title || 'Unknown Book'}</p>
                      <p className="text-sm text-gray-600">{request.books?.author || 'Unknown Author'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {request.profiles?.first_name || 'Unknown'} {request.profiles?.last_name || 'User'}
                      </p>
                      <p className="text-sm text-gray-600">{request.profiles?.admission_number || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={request.status === 'approved' ? 'default' : 'destructive'}
                      className={
                        request.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        'bg-red-100 text-red-800'
                      }
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600">{request.admin_notes || "-"}</p>
                  </TableCell>
                </TableRow>
              ))}
              {processedRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No processed requests
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

export default BookIssueRequests;
