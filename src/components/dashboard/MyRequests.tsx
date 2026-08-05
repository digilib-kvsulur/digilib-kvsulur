import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle2, XCircle, RefreshCw, BookmarkPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type RequestItem = {
  id: string;
  type: "book" | "renewal" | "waitlist";
  title: string;
  subtitle: string;
  status: string;
  created_at: string;
  note?: string | null;
};

type FilterKey = "all" | "pending" | "approved" | "rejected";

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge className="bg-warning/10 text-warning border-warning/20 shrink-0">Pending</Badge>;
    case "approved":
      return <Badge className="bg-success/10 text-success border-success/20 shrink-0">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="shrink-0">Rejected</Badge>;
    case "fulfilled":
      return <Badge className="bg-success/10 text-success border-success/20 shrink-0">Fulfilled</Badge>;
    case "cancelled":
      return <Badge variant="secondary" className="shrink-0">Cancelled</Badge>;
    default:
      return <Badge variant="outline" className="shrink-0">{status}</Badge>;
  }
};

const typeLabel = (type: RequestItem["type"]) => {
  if (type === "renewal") return "Renewal";
  if (type === "waitlist") return "Waitlist";
  return "Borrow";
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
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [bookRequests, renewals, reservations] = await Promise.all([
        supabase
          .from("book_requests")
          .select("id, status, created_at, admin_notes, requested_title, requested_author, books(title, author)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("book_renewals")
          .select("*, book_issues(due_date, books(title, author))")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        hideWaitlist
          ? Promise.resolve({ data: [] as any[] })
          : supabase
              .from("book_reservations")
              .select("*, books(title, author)")
              .eq("user_id", userId)
              .order("created_at", { ascending: false }),
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

      setItems(
        [...bookItems, ...renewalItems, ...waitlistItems].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [userId, hideWaitlist]);

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      approved: items.filter((i) => i.status === "approved" || i.status === "fulfilled").length,
      rejected: items.filter((i) => i.status === "rejected" || i.status === "cancelled").length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    if (filter === "pending") return items.filter((i) => i.status === "pending");
    if (filter === "approved") return items.filter((i) => i.status === "approved" || i.status === "fulfilled");
    if (filter === "rejected") return items.filter((i) => i.status === "rejected" || i.status === "cancelled");
    return items;
  }, [items, filter]);

  const filters: { id: FilterKey; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          My Requests
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {hideWaitlist ? "Borrow and renewal requests" : "Book requests, renewals, and waitlist status"}
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex gap-1.5 min-w-max">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border transition-colors shrink-0",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-full text-[10px] px-1.5 min-w-[1.15rem] text-center",
                    active ? "bg-primary-foreground/20" : "bg-muted-foreground/15"
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 px-4 text-center">
          <p className="text-sm text-muted-foreground">No requests here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const Icon = iconFor(item.type, item.status);
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/50 bg-card p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground leading-snug break-words">
                        {item.title}
                      </p>
                      {statusBadge(item.status)}
                    </div>
                    <p className="text-xs text-muted-foreground break-words">{item.subtitle}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                        {typeLabel(item.type)}
                      </span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {item.note && (
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs leading-relaxed",
                      item.status === "rejected"
                        ? "bg-destructive/10 border border-destructive/20 text-destructive"
                        : item.status === "approved" || item.status === "fulfilled"
                          ? "bg-success/10 border border-success/20 text-success"
                          : "bg-primary/10 border border-primary/20 text-primary"
                    )}
                  >
                    <span className="font-semibold">Admin: </span>
                    <span className="break-words whitespace-pre-wrap">{item.note}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
