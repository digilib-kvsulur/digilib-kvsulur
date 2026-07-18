import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Trash2, BookOpen, User, Clock } from "lucide-react";

interface BookRequest {
  id: string;
  book_id?: string | null;
  user_id: string;
  created_at: string;
  status: string;
  admin_notes?: string | null;
  requested_title?: string | null;
  requested_author?: string | null;
  requested_isbn?: string | null;
  requested_description?: string | null;
  book?: { title: string; author: string; available_copies: number } | null;
  profile?: { first_name: string; last_name: string; student_class?: string } | null;
}

const BookIssueRequests = () => {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('book_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) { console.error('Error loading requests:', error); toast({ title: "Error", description: "Failed to load book requests.", variant: "destructive" }); return; }

      // Manually fetch related book and profile data
      const enriched = await Promise.all(
        (data || []).map(async (req: any) => {
          let book = null;
          let profile = null;
          if (req.book_id) {
            const { data: b } = await supabase.from('books').select('title, author, available_copies').eq('id', req.book_id).maybeSingle();
            book = b;
          }
          const { data: p } = await supabase.from('profiles').select('first_name, last_name, student_class').eq('id', req.user_id).maybeSingle();
          profile = p;
          return { ...req, book, profile };
        })
      );
      setRequests(enriched);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleApproveRequest = async (requestId: string, bookId: string, userId: string) => {
    try {
      const { data: book } = await supabase.from('books').select('available_copies').eq('id', bookId).single();
      if (!book || book.available_copies <= 0) { toast({ title: "Error", description: "Book is not available.", variant: "destructive" }); return; }
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      const { error: issueError } = await supabase.from('book_issues').insert({ user_id: userId, book_id: bookId, due_date: dueDate.toISOString().split('T')[0] });
      if (issueError) throw issueError;
      await supabase.from('books').update({ available_copies: book.available_copies - 1 }).eq('id', bookId);
      await supabase.from('book_requests').update({ status: 'approved', admin_notes: 'Book issued successfully' }).eq('id', requestId);
      toast({ title: "Success", description: "Book request approved and issued." });
      loadRequests();
    } catch (error) { console.error('Error approving request:', error); toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" }); }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from('book_requests').update({ status: 'rejected', admin_notes: 'Request rejected by admin' }).eq('id', requestId);
      if (error) throw error;
      toast({ title: "Success", description: "Book request rejected." });
      loadRequests();
    } catch (error) { console.error('Error rejecting request:', error); toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" }); }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    try {
      setDeletingIds(prev => new Set(prev).add(requestId));
      const { error } = await supabase.from('book_requests').delete().eq('id', requestId);
      if (error) throw error;
      toast({ title: "Success", description: "Request deleted." });
      loadRequests();
    } catch (error) { console.error('Error deleting request:', error); toast({ title: "Error", description: "Failed to delete request.", variant: "destructive" }); }
    finally { setDeletingIds(prev => { const s = new Set(prev); s.delete(requestId); return s; }); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case 'approved': return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const RequestCard = ({ request, showActions }: { request: BookRequest; showActions: boolean }) => (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {request.profile?.first_name || 'Unknown'} {request.profile?.last_name || ''}
            </p>
            <p className="text-xs text-muted-foreground">{request.profile?.student_class ? `Class ${request.profile.student_class}` : 'N/A'}</p>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>

      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{request.book?.title || request.requested_title || 'No title'}</p>
          <p className="text-xs text-muted-foreground truncate">by {request.book?.author || request.requested_author || 'Unknown'}</p>
          {request.book && <p className="text-xs text-muted-foreground">Available: {request.book.available_copies}</p>}
          {!request.book_id && <Badge variant="outline" className="text-[10px] mt-1">Custom Request</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(request.created_at).toLocaleDateString()}
      </div>

      {request.admin_notes && request.status !== 'pending' && (
        <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">{request.admin_notes}</p>
      )}

      {showActions && (
        <div className="flex gap-2 pt-1">
          {request.book_id && (
            <Button size="sm" className="flex-1" onClick={() => handleApproveRequest(request.id, request.book_id!, request.user_id)}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Issue
            </Button>
          )}
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleRejectRequest(request.id)}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
        </div>
      )}

      {!showActions && (
        <Button size="sm" variant="outline" onClick={() => handleDeleteRequest(request.id)} disabled={deletingIds.has(request.id)} className="w-full">
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
          <CardDescription>Review and process book requests from students</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending requests</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map(r => <RequestCard key={r.id} request={r} showActions />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
          <CardDescription>Previously approved or rejected requests</CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No processed requests</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedRequests.map(r => <RequestCard key={r.id} request={r} showActions={false} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookIssueRequests;
