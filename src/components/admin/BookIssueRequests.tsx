import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, XCircle, Trash2, BookOpen, User, Clock, MessageSquare,
  Send, BookMarked, Lightbulb, Check, X, Search, Filter, ShieldOff, ShieldAlert
} from "lucide-react";

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
  book?: { title: string; author: string; available_copies: number; accession_number?: string | null } | null;
  profile?: { first_name: string; last_name: string; student_class?: string; role?: string; admission_number?: string | null; employee_code?: string | null } | null;
  fromWaitlist?: boolean;
}

interface BookSuggestion {
  id: string;
  user_id: string;
  title: string;
  author?: string | null;
  reason?: string | null;
  status: string;
  admin_note?: string | null;
  created_at: string;
  profile?: { first_name: string; last_name: string; student_class?: string } | null;
}

const BookIssueRequests = () => {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingIds, setReplyingIds] = useState<Set<string>>(new Set());
  const [suggestionNotes, setSuggestionNotes] = useState<Record<string, string>>({});
  const [blockClass67, setBlockClass67] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const { toast } = useToast();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadRequests(), loadSuggestions()]);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('book_requests')
        .select(`
          *,
          books (title, author, available_copies, accession_number, accession_numbers)
        `)
        .order('created_at', { ascending: false });

      if (error) { console.error('Error loading requests:', error); toast({ title: "Error", description: "Failed to load book requests.", variant: "destructive" }); return; }

      const userIds = Array.from(new Set((data || []).map((req: any) => req.user_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, student_class, admission_number, role')
          .in('id', userIds);
        profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      const enriched = (data || []).map((req: any) => {
        const fromWaitlist = typeof req.admin_notes === 'string' && req.admin_notes.toLowerCase().includes('waitlist');
        return { 
          ...req, 
          book: req.books, 
          profile: profilesMap[req.user_id], 
          fromWaitlist 
        };
      });
      setRequests(enriched);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const loadSuggestions = async () => {
    const { data, error } = await supabase.from("book_suggestions").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    const list = data || [];
    const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
    let map: Record<string, any> = {};
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, first_name, last_name, student_class").in("id", ids);
      (p || []).forEach((x) => { map[x.id] = x; });
    }
    setSuggestions(list.map((r: any) => ({ ...r, profile: map[r.user_id] })));
  };

  const isClass67 = (cls?: string) => {
    if (!cls) return false;
    const trimmed = cls.trim().toUpperCase();
    return trimmed.startsWith("6") || trimmed.startsWith("7");
  };

  /** Get all unique classes for the filter dropdown */
  const availableClasses = useMemo(() => {
    const classes = new Set<string>();
    [...requests, ...suggestions].forEach(r => {
      const cls = (r as any).profile?.student_class;
      if (cls) classes.add(cls.trim());
    });
    return Array.from(classes).sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [requests, suggestions]);

  /** Apply search + status + class filters and sort to a list of BookRequest */
  const filterAndSortRequests = (list: BookRequest[]): BookRequest[] => {
    const q = searchQuery.toLowerCase().trim();
    let result = list.filter(r => {
      if (q) {
        const studentName = `${r.profile?.first_name ?? ""} ${r.profile?.last_name ?? ""}`.toLowerCase();
        const bookTitle = (r.book?.title ?? r.requested_title ?? "").toLowerCase();
        const bookAuthor = (r.book?.author ?? r.requested_author ?? "").toLowerCase();
        const admn = (r.profile?.admission_number ?? "").toLowerCase();
        if (!studentName.includes(q) && !bookTitle.includes(q) && !bookAuthor.includes(q) && !admn.includes(q)) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (classFilter !== "all" && (r.profile?.student_class ?? "").trim() !== classFilter) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
  };

  /** Apply search + class filters and sort to suggestions */
  const filterAndSortSuggestions = (list: BookSuggestion[]): BookSuggestion[] => {
    const q = searchQuery.toLowerCase().trim();
    let result = list.filter(r => {
      if (q) {
        const studentName = `${r.profile?.first_name ?? ""} ${r.profile?.last_name ?? ""}`.toLowerCase();
        const title = (r.title ?? "").toLowerCase();
        const author = (r.author ?? "").toLowerCase();
        if (!studentName.includes(q) && !title.includes(q) && !author.includes(q)) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (classFilter !== "all" && (r.profile?.student_class ?? "").trim() !== classFilter) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
  };

  const handleApproveRequest = async (requestId: string, _bookId: string, userId: string, studentClass?: string) => {
    if (blockClass67 && isClass67(studentClass)) {
      toast({
        title: "Blocked",
        description: "Book issue requests from Class 6 & 7 students are currently blocked by admin.",
        variant: "destructive",
      });
      return;
    }
    try {
      const customReply = replyText[requestId]?.trim();
      const reply = customReply || 'Book issued successfully';
      const { error: approvalError } = await supabase.rpc('approve_book_request', {
        p_request_id: requestId,
        p_admin_notes: reply,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
      if (approvalError) throw approvalError;
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

  /** Bulk-delete ALL requests from Class 6 & 7 students */
  const handleBulkDeleteClass67 = async () => {
    const class67Requests = requests.filter(r => isClass67(r.profile?.student_class));
    if (class67Requests.length === 0) {
      toast({ title: "No requests found", description: "There are no book requests from Class 6 or 7 students." });
      return;
    }
    const confirmed = confirm(
      `This will permanently delete ${class67Requests.length} book request(s) from Class 6 & 7 students. Are you sure?`
    );
    if (!confirmed) return;
    setBulkDeleting(true);
    try {
      const ids = class67Requests.map(r => r.id);
      // Ensure we delete in batches or let supabase handle multiple ids (using .in())
      const { error } = await supabase.from('book_requests').delete().in('id', ids);
      if (error) throw error;
      toast({ title: "Success", description: `Deleted ${ids.length} request(s) from Class 6 & 7 students.` });
      loadRequests();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to delete requests.", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };


  const decideSuggestion = async (r: BookSuggestion, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const admin_note = suggestionNotes[r.id] || null;
    const { error } = await supabase.from("book_suggestions").update({ status, admin_note }).eq("id", r.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("notifications").insert({
      target_user_id: r.user_id,
      sent_by: user!.id,
      title: status === "approved" ? "Book suggestion approved" : "Book suggestion rejected",
      message: status === "approved"
        ? `Your suggestion "${r.title}" was approved.${admin_note ? ` Note: ${admin_note}` : ""}`
        : `Your suggestion "${r.title}" was not accepted.${admin_note ? ` Note: ${admin_note}` : ""}`,
      type: status === "approved" ? "success" : "info",
    });
    toast({ title: status === "approved" ? "Approved" : "Rejected" });
    loadSuggestions();
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

  const hasPurchaseText = (r: BookRequest) =>
    !!(r.requested_title?.trim() || r.requested_author?.trim() || r.requested_description?.trim() || r.requested_isbn?.trim());

  // Catalog borrows (or orphaned when book was deleted). Purchase = custom title fields present.
  const borrowRequests = requests.filter(r => r.book_id || (!r.book_id && !hasPurchaseText(r)));
  const customRequests = requests.filter(r => !r.book_id && hasPurchaseText(r));
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  const purchaseTitle = (r: BookRequest) =>
    r.requested_title?.trim()
    || r.requested_author?.trim()
    || r.requested_description?.trim()
    || "Untitled suggestion";

  const borrowTitle = (r: BookRequest) =>
    r.book?.title?.trim()
    || (r.fromWaitlist ? "Waitlist book (catalog title unavailable)" : null)
    || "Catalog book (removed from library)";

  const pendingBorrow = filterAndSortRequests(borrowRequests.filter(r => r.status === 'pending'));
  const processedBorrow = filterAndSortRequests(borrowRequests.filter(r => r.status !== 'pending'));
  const filteredCustom = filterAndSortRequests(customRequests);
  const filteredSuggestions = filterAndSortSuggestions(suggestions);
  const purchaseItemsCount = filteredCustom.length + filteredSuggestions.length;
  const class67RequestCount = requests.filter(r => isClass67(r.profile?.student_class)).length;

  const renderBorrowRequestCard = (request: BookRequest) => {
    const isBlocked = blockClass67 && isClass67(request.profile?.student_class);
    return (
      <div key={request.id} className={`p-4 rounded-xl border bg-card hover:shadow-sm transition-all space-y-3 ${isBlocked ? "border-red-300 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/10" : "border-border/50"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{request.profile?.first_name || 'Unknown'} {request.profile?.last_name || ''}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">{request.profile?.student_class ? `Class ${request.profile.student_class}` : 'N/A'}</p>
                {isBlocked && <Badge variant="destructive" className="text-[9px] px-1 py-0">Blocked</Badge>}
              </div>
              {(request.profile?.admission_number || request.profile?.employee_code) && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  {request.profile.role === 'teacher' ? 'Emp Code' : 'Admn'}: {request.profile.admission_number || request.profile.employee_code}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(request.status)}
            {request.fromWaitlist && request.status === 'pending' && (
              <Badge variant="outline" className="text-[10px]">From waitlist</Badge>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{borrowTitle(request)}</p>
            <p className="text-xs text-muted-foreground truncate">by {request.book?.author || 'Unknown'}</p>
            {!request.book_id && (
              <p className="text-[10px] text-amber-700">Original catalog book was deleted — review or delete this request.</p>
            )}
            {request.book && <p className="text-xs text-muted-foreground">Available: {request.book.available_copies}</p>}
            {request.book?.accession_number && (
              <p className="text-[10px] text-muted-foreground font-mono">Acc: {request.book.accession_number}</p>
            )}
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
            {isBlocked && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                <ShieldOff className="h-3.5 w-3.5" /> Issue blocked for Class 6 & 7
              </p>
            )}
            <Textarea
              placeholder="Optional reply message to student..."
              value={replyText[request.id] || ''}
              onChange={e => setReplyText(prev => ({ ...prev, [request.id]: e.target.value }))}
              rows={2}
              className="text-xs resize-none"
            />
            <div className="flex gap-2">
              {request.book_id ? (
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isBlocked}
                  onClick={() => handleApproveRequest(request.id, request.book_id!, request.user_id, request.profile?.student_class)}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Issue Book
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDeleteRequest(request.id)} disabled={deletingIds.has(request.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
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
  };

  const renderCustomRequestCard = (request: BookRequest) => (
    <div key={request.id} className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all space-y-3">
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
        <p className="text-sm font-semibold text-foreground">{purchaseTitle(request)}</p>
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

  const renderSuggestionCard = (r: BookSuggestion) => (
    <div key={`sug-${r.id}`} className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{r.profile?.first_name || 'Unknown'} {r.profile?.last_name || ''}</p>
            <p className="text-xs text-muted-foreground">{r.profile?.student_class ? `Class ${r.profile.student_class}` : 'N/A'}</p>
          </div>
        </div>
        {getStatusBadge(r.status)}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{r.title?.trim() || "Untitled suggestion"}</p>
        {r.author && <p className="text-xs text-muted-foreground">Author: {r.author}</p>}
        {r.reason && <p className="text-xs text-muted-foreground line-clamp-2">{r.reason}</p>}
      </div>
      {r.admin_note && (
        <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">{r.admin_note}</p>
      )}
      {r.status === 'pending' && (
        <div className="space-y-2 pt-1">
          <Textarea
            placeholder="Admin note (optional)..."
            value={suggestionNotes[r.id] || ''}
            onChange={e => setSuggestionNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
            rows={2}
            className="text-xs resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => decideSuggestion(r, 'approved')}>
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => decideSuggestion(r, 'rejected')}>
              <X className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Book Requests</h2>
        <p className="text-sm text-muted-foreground">
          Borrow requests (including waitlist when a book returns), and purchase suggestions.
        </p>
      </div>

      {/* ── Class 6 & 7 Admin Controls ─────────────────────────────────── */}
      <Card className="border-orange-200 dark:border-orange-800/40 bg-orange-50/40 dark:bg-orange-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            Class 6 &amp; 7 Controls
          </CardTitle>
          <CardDescription>Manage book issue permissions for Class 6 and Class 7 students.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Block toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background flex-1">
              <div className="flex-1">
                <Label htmlFor="block-class67" className="font-medium text-sm">Block Book Issue for Class 6 &amp; 7</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, the &quot;Issue Book&quot; action is disabled for all Class 6 &amp; 7 requests.
                </p>
              </div>
              <Switch
                id="block-class67"
                checked={blockClass67}
                onCheckedChange={setBlockClass67}
              />
            </div>

            {/* Bulk delete button */}
            {class67RequestCount > 0 && (
              <div className="flex flex-col gap-1">
                <Button
                  variant="destructive"
                  className="gap-2 whitespace-nowrap"
                  disabled={bulkDeleting}
                  onClick={handleBulkDeleteClass67}
                >
                  <Trash2 className="h-4 w-4" />
                  {bulkDeleting ? "Deleting…" : `Delete All Class 6 & 7 Requests (${class67RequestCount})`}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Permanently removes all borrow &amp; purchase requests from Class 6 &amp; 7 students.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Search & Filter Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by student name, book title, author, or admission no…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {availableClasses.map(cls => (
                <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={v => setSortOrder(v as "newest" | "oldest")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="borrow">
        <TabsList className="mb-4">
          <TabsTrigger value="borrow" className="gap-2">
            <BookOpen className="h-4 w-4" /> Borrow Requests
            {pendingBorrow.length > 0 && <Badge className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{pendingBorrow.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Purchase Suggestions
            {(pendingSuggestions.length + customRequests.filter(r => r.status === 'pending').length) > 0 && (
              <Badge className="ml-1 bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingSuggestions.length + customRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="borrow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Borrow Requests ({pendingBorrow.length})</CardTitle>
              <CardDescription>
                Approve or reject borrow requests. Waitlist items appear here automatically when the book is returned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingBorrow.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending borrow requests</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingBorrow.map(r => renderBorrowRequestCard(r))}
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
                  {processedBorrow.map(r => renderBorrowRequestCard(r))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Suggestions ({purchaseItemsCount})</CardTitle>
              <CardDescription>Books students want the library to buy. Reply or approve/reject.</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseItemsCount === 0 ? (
                <p className="text-center text-muted-foreground py-8">No book purchase suggestions yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSuggestions.map(r => renderSuggestionCard(r))}
                  {filteredCustom.map(r => renderCustomRequestCard(r))}
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
