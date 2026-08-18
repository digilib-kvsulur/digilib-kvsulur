import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookCheck, BookPlus, Star, ListOrdered, AlertTriangle, IndianRupee, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CurrentBooks from "@/components/dashboard/CurrentBooks";
import MyRequests from "@/components/dashboard/MyRequests";
import Wishlist from "@/components/dashboard/Wishlist";
import BookReservations from "@/components/dashboard/BookReservations";
import LostBookReport from "@/components/dashboard/LostBookReport";
import MyFines from "@/components/dashboard/MyFines";
import BookRequestForm from "@/components/BookRequestForm";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  currentBooks: any[];
}

type Section = "issued" | "requests" | "wishlist" | "waitlist" | "lost" | "fines";

export default function IssuedBooksHub({ userId, currentBooks }: Props) {
  const navigate = useNavigate();
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [counts, setCounts] = useState({ requests: 0, wishlist: 0, waitlist: 0, lost: 0, fines: 0 });
  const [section, setSection] = useState<Section>("issued");
  const [showRequest, setShowRequest] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const [
      { data: issues },
      { count: reqCount },
      { count: wishCount },
      { count: waitCount },
      { count: lostCount },
      { count: fineCount },
    ] = await Promise.all([
      supabase
        .from("book_issues")
        .select("id, status, issue_date, due_date, return_date, accession_number, books(title, author)")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false }),
      supabase.from("book_requests").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("book_wishlist").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("book_reservations").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("lost_book_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("library_fines").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    setAllIssues(issues || []);
    setCounts({
      requests: reqCount || 0,
      wishlist: wishCount || 0,
      waitlist: waitCount || 0,
      lost: lostCount || 0,
      fines: fineCount || 0,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId, currentBooks]);

  const nav = useMemo(() => {
    const items: { id: Section; label: string; icon: any; count?: number; always?: boolean }[] = [
      { id: "issued", label: "Issued", icon: BookCheck, always: true },
      { id: "requests", label: "Requests", icon: BookPlus, count: counts.requests },
      { id: "wishlist", label: "Wishlist", icon: Star, count: counts.wishlist },
      { id: "waitlist", label: "Waitlist", icon: ListOrdered, count: counts.waitlist },
      { id: "lost", label: "Lost", icon: AlertTriangle, count: counts.lost },
      { id: "fines", label: "Fines", icon: IndianRupee, count: counts.fines },
    ];
    return items.filter((i) => i.always || (i.count && i.count > 0));
  }, [counts]);

  useEffect(() => {
    if (!nav.some((n) => n.id === section)) setSection("issued");
  }, [nav, section]);

  const activeCount = currentBooks?.length || 0;
  const overdueCount = (currentBooks || []).filter(
    (b) => b.due_date && new Date(b.due_date) < new Date()
  ).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BookCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            Book Issued
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Borrowed books and related library activity
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="flex-1 sm:flex-none h-9" onClick={() => navigate("/catalog")}>
            <Search className="h-3.5 w-3.5 mr-1.5" /> Catalog
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none h-9" onClick={() => setShowRequest(true)}>
            <BookPlus className="h-3.5 w-3.5 mr-1.5" /> Request book
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Out now", value: activeCount },
          { label: "Overdue", value: overdueCount, danger: overdueCount > 0 },
          { label: "All issues", value: allIssues.length },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className={cn("text-lg sm:text-xl font-extrabold", s.danger && "text-destructive")}>{s.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 bg-muted/20">
        <CardContent className="p-3 text-[11px] sm:text-xs text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">Wishlist</span> — saved to read later.</p>
          <p><span className="font-semibold text-foreground">Waitlist</span> — queue when a book has 0 copies.</p>
        </CardContent>
      </Card>

      {/* Mobile-friendly section chips */}
      <div className="-mx-1 px-1 overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 min-w-max">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border transition-colors shrink-0",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {typeof item.count === "number" && item.count > 0 && (
                  <span className={cn(
                    "rounded-full text-[10px] px-1.5 py-0 min-w-[1.15rem] text-center",
                    active ? "bg-primary-foreground/20" : "bg-muted-foreground/15"
                  )}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {section === "issued" && (
            <>
              <Card className="border-border/50 overflow-hidden">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-base">Currently borrowed</CardTitle>
                  <CardDescription className="text-xs">Books checked out right now</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-4">
                  <CurrentBooks books={currentBooks} />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-base">Issue history</CardTitle>
                  <CardDescription className="text-xs">All books issued to you</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-4 space-y-2">
                  {allIssues.length === 0 && (
                    <p className="text-sm text-muted-foreground py-8 text-center">No issue records yet.</p>
                  )}
                  {allIssues.map((i) => {
                    const overdue = i.status === "issued" && i.due_date && new Date(i.due_date) < new Date();
                    return (
                      <div
                        key={i.id}
                        className="flex flex-col xs:flex-row sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border text-sm bg-card"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{i.books?.title || "Book"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {i.books?.author || "—"}
                            {i.accession_number ? ` · Acc ${i.accession_number}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Issued {i.issue_date ? new Date(i.issue_date).toLocaleDateString() : "—"}
                            {i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                            {i.return_date ? ` · Returned ${new Date(i.return_date).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={overdue ? "destructive" : i.status === "returned" ? "secondary" : "default"}
                          className="self-start sm:self-center shrink-0"
                        >
                          {overdue ? "Overdue" : i.status}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}

          {section === "requests" && <MyRequests userId={userId} hideWaitlist />}
          {section === "wishlist" && <Wishlist userId={userId} compact />}
          {section === "waitlist" && <BookReservations userId={userId} compact />}
          {section === "lost" && <LostBookReport userId={userId} />}
          {section === "fines" && <MyFines userId={userId} />}
        </div>
      )}

      <BookRequestForm
        open={showRequest}
        onOpenChange={setShowRequest}
        onSuccess={() => {
          setShowRequest(false);
          load();
          setSection("requests");
        }}
      />
    </div>
  );
}
