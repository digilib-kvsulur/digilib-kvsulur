import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, CheckCircle2, XCircle, RefreshCw, BookmarkPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RequestItem = {
  id: string;
  type: "book" | "renewal" | "waitlist";
  title: string;
  subtitle: string;
  status: string;
  created_at: string;
  note?: string | null;
};

const statusBadge = (status: string) => {
  switch (status) {
    case "pending": return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
    case "approved": return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
    case "rejected": return <Badge variant="destructive">Rejected</Badge>;
    case "fulfilled": return <Badge className="bg-success/10 text-success border-success/20">Fulfilled</Badge>;
    case "cancelled": return <Badge variant="secondary">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const iconFor = (type: RequestItem["type"], status: string) => {
  if (status === "approved" || status === "fulfilled") return CheckCircle2;
  if (status === "rejected" || status === "cancelled") return XCircle;
  if (type === "renewal") return RefreshCw;
  if (type === "waitlist") return BookmarkPlus;
  return Clock;
};

export default function MyRequests({ userId, hideWaitlist = false }: { userId: string; hideWaitlist?: boolean }) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [bookRequests, renewals, reservations] = await Promise.all([
        supabase.from("book_requests").select("id, status, created_at, admin_notes, requested_title, requested_author, books(title, author)").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("book_renewals").select("*, book_issues(due_date, books(title, author))").eq("user_id", userId).order("created_at", { ascending: false }),
        hideWaitlist
          ? Promise.resolve({ data: [] as any[] })
          : supabase.from("book_reservations").select("*, books(title, author)").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const bookItems: RequestItem[] = (bookRequests.data || []).map((r: any) => ({
        id: `book-${r.id}`,
        type: "book",
        title: r.books?.title || r.requested_title || "Book request",
        subtitle: r.books?.author || r.requested_author || "Requested title",
        status: r.status || "pending",
        created_at: r.created_at,
        note: r.admin_notes,
      }));

      const renewalItems: RequestItem[] = (renewals.data || []).map((r: any) => ({
        id: `renewal-${r.id}`,
        type: "renewal",
        title: r.book_issues?.books?.title || "Renewal request",
        subtitle: `+${r.requested_days || 0} days${r.book_issues?.due_date ? ` · due ${new Date(r.book_issues.due_date).toLocaleDateString()}` : ""}`,
        status: r.status || "pending",
        created_at: r.created_at,
        note: r.admin_note || r.student_note,
      }));

      const waitlistItems: RequestItem[] = hideWaitlist
        ? []
        : (reservations.data || []).map((r: any) => ({
            id: `waitlist-${r.id}`,
            type: "waitlist" as const,
            title: r.books?.title || "Waitlist request",
            subtitle: r.books?.author || "Reserved book",
            status: r.status || "pending",
            created_at: r.created_at,
            note: r.note,
          }));

      setItems([...bookItems, ...renewalItems, ...waitlistItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [userId, hideWaitlist]);

  const renderList = (list: RequestItem[]) => {
    if (loading) return <div className="py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>;
    if (list.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">No requests here yet.</p>;
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((item) => {
          const Icon = iconFor(item.type, item.status);
          return (
            <div key={item.id} className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {statusBadge(item.status)}
              </div>
              {item.note && (
                <div className={`mt-3 rounded-lg px-3 py-2 text-xs flex items-start gap-2 ${
                  item.status === "rejected" ? "bg-destructive/10 border border-destructive/20 text-destructive" :
                  item.status === "approved" || item.status === "fulfilled" ? "bg-success/10 border border-success/20 text-success" :
                  "bg-primary/10 border border-primary/20 text-primary"
                }`}>
                  <span className="shrink-0 font-bold">📩 Admin:</span>
                  <span className="break-words">{item.note}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> My Requests</CardTitle>
        <CardDescription>
          {hideWaitlist
            ? "Borrow and renewal requests"
            : "Book requests, renewals, and waitlist status"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderList(items)}</TabsContent>
          <TabsContent value="pending">{renderList(items.filter((i) => i.status === "pending"))}</TabsContent>
          <TabsContent value="approved">{renderList(items.filter((i) => i.status === "approved" || i.status === "fulfilled"))}</TabsContent>
          <TabsContent value="rejected">{renderList(items.filter((i) => i.status === "rejected" || i.status === "cancelled"))}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}