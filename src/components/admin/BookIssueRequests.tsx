import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Trash2, BookOpen, User, Clock, MessageSquare, Send, BookMarked } from "lucide-react";

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
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingIds, setReplyingIds] = useState<Set<string>>(new Set());
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

      const enriched = await Promise.all(
        (data || []).map(async (req: any) => {
          let book = null;
          if (req.book_id) {
            const { data: b } = await supabase.from('books').select('title, author, available_copies').eq('id', req.book_id).maybeSingle();
            book = b;
          }
          const { data: p } = await supabase.from('profiles').select('first_name, last_name, student_class').eq('id', req.user_id).maybeSingle();
          return { ...req, book, profile: p };
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
      
      const customReply = replyText[requestId]?.trim();
      const reply = customReply || 'Book issued successfully';
      
      await supabase.from('book_requests').update({ status: 'approved', admin_notes: reply }).eq('id', requestId);
      // Send notification
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('notifications').insert({ 
        target_user_id: userId, 
        sent_by: user!.id, 
        title: 'Borrow request approved', 
        message: customReply || 'Your book request has been approved and the book has been issued to you.', 
        type: 'success' 
      });
      toast({ title: "Success", description: "Book request approved and issued." });
      setReplyText(prev => { const c = { ...prev }; delete c[requestId]; return c; });
      loadRequests();
    } catch (error) { console.error('Error approving request:', error); toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" }); }
  };

  const handleRejectRequest = async (requestId: string, userId: string) => {
    try {
      const reply = replyText[requestId]?.trim() || 'Request rejected by admin';
      const { error } = await supabase.from('book_requests').update({ status: 'rejected', admin_notes: reply }).eq('id', requestId);
      if (error) throw error;
      // Send notification
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('notifications').insert({ target_user_id: userId, sent_by: user!.id, title: 'Request rejected', message: reply, type: 'info' });
      toast({ title: "Success", description: "Book request rejected." });
      loadRequests();
    } catch (error) { console.error('Error rejecting request:', error); toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" }); }
  };

  const handleReplyCustomRequest = async (requestId: string, userId: string) => {
    const reply = replyText[requestId]?.trim();
    if (!reply) { toast({ title: "Enter a reply message first", variant: "destructive" }); return; }
    setReplyingIds(prev => new Set(prev).add(requestId));
    try {
      await supabase.from('book_requests').update({ admin_notes: reply }).eq('id', requestId);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('notifications').insert({ target_user_id: userId, sent_by: user!.id, title: 'Reply to your book suggestion', message: reply, type: 'info' });
      toast({ title: "Reply sent to student." });
      setReplyText(prev => { const c = { ...prev }; delete c[requestId]; return c; });
      loadRequests();
    } catch (error) { toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" }); }
    finally { setReplyingIds(prev => { const s = new Set(prev); s.delete(requestId); return s; }); }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    try {
      setDeletingIds(prev => new Set(prev).add(requestId));
      const { error } = await supabase.from('book_requests').delete().eq('id', requestId);
      if (error) throw error;
      toast({ title: "Success", description: "Request deleted." });
      loadRequests();
    } catch (error) { toast({ title: "Error", description: "Failed to delete request.", variant: "destructive" }); }
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

  const borrowRequests = requests.filter(r => r.book_id);
  const customRequests = requests.filter(r => !r.book_id);

  const BorrowRequestCard = ({ request }: { request: BookRequest }) => (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{request.profile?.first_name || 'Unknown'} {request.profile?.last_name || ''}</p>
            <p className="text-xs text-muted-foreground">{request.profile?.student_class ? `Class ${request.profile.student_class}` : 'N/A'}</p>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>
      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{request.book?.title || 'No title'}</p>
          <p className="text-xs text-muted-foreground truncate">by {request.book?.author || 'Unknown'}</p>
          {request.book && <p className="text-xs text-muted-foreground">Available: {request.book.available_copies}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(request.created_at).toLocaleDateString()}
      </div>
      {request.admin_notes && request.status !== 'pending' && (
        <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">{request.admin_notes}</p>
      )}
      {request.status === 'pending' && (
        <div className="space-y-2 pt-1">
          <Textarea
            placeholder="Optional reply message to student..."
            value={replyText[request.id] || ''}
            onChange={e => setReplyText(prev => ({ ...prev, [request.id]: e.target.value }))}
            rows={2}
            className="text-xs resize-none"
          />
          <div className="flex gap-2">
            {request.book_id && (
              <Button size="sm" className="flex-1" onClick={() => handleApproveRequest(request.id, request.book_id!, request.user_id)}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Issue Book
              </Button>
            )}
            <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleRejectRequest(request.id, request.user_id)}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          </div>
        </div>
      )}
      {request.status !== 'pending' && (
        <Button size="sm" variant="outline" onClick={() => handleDeleteRequest(request.id)} disabled={deletingIds.has(request.id)} className="w-full">
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
        </Button>
      )}
    </div>
  );

  const CustomRequestCard = ({ request }: { request: BookRequest }) => (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <BookMarked className="h-4 w-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{request.profile?.first_name || 'Unknown'} {request.profile?.last_name || ''}</p>
            <p className="text-xs text-muted-foreground">{request.profile?.student_class ? `Class ${request.profile.student_class}` : 'N/A'}</p>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{request.requested_title || 'No title given'}</p>
        {request.requested_author && <p className="text-xs text-muted-foreground">Author: {request.requested_author}</p>}
        {request.requested_isbn && <p className="text-xs text-muted-foreground">ISBN: {request.requested_isbn}</p>}
        {request.requested_description && <p className="text-xs text-muted-foreground line-clamp-2">{request.requested_description}</p>}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(request.created_at).toLocaleDateString()}
      </div>
      {request.admin_notes && (
        <div className="text-xs bg-muted/50 rounded-lg p-2 border border-border/30">
          <span className="font-semibold text-foreground">Admin reply: </span>
          <span className="text-muted-foreground">{request.admin_notes}</span>
        </div>
      )}
      <div className="space-y-2 border-t border-border/30 pt-2">
        <Textarea
          placeholder="Type a reply to the student..."
          value={replyText[request.id] || ''}
          onChange={e => setReplyText(prev => ({ ...prev, [request.id]: e.target.value }))}
          rows={2}
          className="text-xs resize-none"
        />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => handleReplyCustomRequest(request.id, request.user_id)} disabled={replyingIds.has(request.id)}>
            <Send className="h-3.5 w-3.5 mr-1" /> {replyingIds.has(request.id) ? 'Sending…' : 'Send Reply'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDeleteRequest(request.id)} disabled={deletingIds.has(request.id)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );

  const pendingBorrow = borrowRequests.filter(r => r.status === 'pending');
  const processedBorrow = borrowRequests.filter(r => r.status !== 'pending');
  const pendingCustom = customRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Book Requests</h2>
        <p className="text-sm text-muted-foreground">Manage borrow requests and student book purchase suggestions.</p>
      </div>

      <Tabs defaultValue="borrow">
        <TabsList className="mb-4">
          <TabsTrigger value="borrow" className="gap-2">
            <BookOpen className="h-4 w-4" /> Borrow Requests
            {pendingBorrow.length > 0 && <Badge className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{pendingBorrow.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Purchase Suggestions
            {pendingCustom.length > 0 && <Badge className="ml-1 bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCustom.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="borrow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Borrow Requests ({pendingBorrow.length})</CardTitle>
              <CardDescription>Approve or reject student book borrowing requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingBorrow.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending borrow requests</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingBorrow.map(r => <BorrowRequestCard key={r.id} request={r} />)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Processed Requests ({processedBorrow.length})</CardTitle>
              <CardDescription>Previously approved or rejected borrow requests</CardDescription>
            </CardHeader>
            <CardContent>
              {processedBorrow.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No processed requests</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processedBorrow.map(r => <BorrowRequestCard key={r.id} request={r} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Suggestions ({customRequests.length})</CardTitle>
              <CardDescription>Books students want the library to buy. Reply to notify the student.</CardDescription>
            </CardHeader>
            <CardContent>
              {customRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No book purchase suggestions yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customRequests.map(r => <CustomRequestCard key={r.id} request={r} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BookIssueRequests;
