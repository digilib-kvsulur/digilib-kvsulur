import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCheck, BookPlus, Star, ListOrdered, AlertTriangle, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CurrentBooks from "@/components/dashboard/CurrentBooks";
import MyRequests from "@/components/dashboard/MyRequests";
import Wishlist from "@/components/dashboard/Wishlist";
import BookReservations from "@/components/dashboard/BookReservations";
import LostBookReport from "@/components/dashboard/LostBookReport";
import MyFines from "@/components/dashboard/MyFines";

interface Props {
  userId: string;
  currentBooks: any[];
  defaultTab?: string;
}

/** Student hub: issues, requests, wishlist, waitlist, lost reports, fines */
export default function IssuedBooksHub({ userId, currentBooks, defaultTab = "issued" }: Props) {
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [fineCount, setFineCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("book_issues")
          .select("id, status, issue_date, due_date, return_date, accession_number, books(title, author)")
          .eq("user_id", userId)
          .order("issue_date", { ascending: false }),
        supabase
          .from("library_fines")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);
      setAllIssues(data || []);
      setFineCount(count || 0);
    })();
  }, [userId, currentBooks]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookCheck className="h-5 w-5 text-primary" /> Book Issued
        </h2>
        <p className="text-sm text-muted-foreground">
          Your borrowed books, requests, wishlist, waitlist, lost reports, and fines.
        </p>
      </div>

      <Card className="border-border/40 bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Wishlist</strong> — books you saved to read later (still available or not).
          </p>
          <p>
            <strong className="text-foreground">Waitlist</strong> — queue for a book that is currently unavailable (0 copies). You get notified when it returns.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="issued" className="gap-1.5 text-xs sm:text-sm">
            <BookCheck className="h-3.5 w-3.5" /> Issued
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm">
            <BookPlus className="h-3.5 w-3.5" /> Requests
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-1.5 text-xs sm:text-sm">
            <Star className="h-3.5 w-3.5" /> Wishlist
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="gap-1.5 text-xs sm:text-sm">
            <ListOrdered className="h-3.5 w-3.5" /> Waitlist
          </TabsTrigger>
          <TabsTrigger value="lost" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5" /> Lost
          </TabsTrigger>
          <TabsTrigger value="fines" className="gap-1.5 text-xs sm:text-sm">
            <IndianRupee className="h-3.5 w-3.5" /> Fines
            {fineCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{fineCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issued" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Currently borrowed</CardTitle>
              <CardDescription>Books checked out right now</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrentBooks books={currentBooks} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Full issue history</CardTitle>
              <CardDescription>All books issued to you (current and past)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {allIssues.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No issue records yet.</p>
              )}
              {allIssues.map((i) => {
                const overdue =
                  i.status === "issued" && i.due_date && new Date(i.due_date) < new Date();
                return (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{i.books?.title || "Book"}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.books?.author || "—"}
                        {i.accession_number ? ` · Acc ${i.accession_number}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Issued {i.issue_date ? new Date(i.issue_date).toLocaleDateString() : "—"}
                        {i.due_date ? ` · Due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                        {i.return_date
                          ? ` · Returned ${new Date(i.return_date).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <Badge variant={overdue ? "destructive" : i.status === "returned" ? "secondary" : "default"}>
                      {overdue ? "Overdue" : i.status}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <MyRequests userId={userId} hideWaitlist />
        </TabsContent>

        <TabsContent value="wishlist" className="mt-4">
          <Wishlist userId={userId} compact />
        </TabsContent>

        <TabsContent value="waitlist" className="mt-4">
          <BookReservations userId={userId} compact />
        </TabsContent>

        <TabsContent value="lost" className="mt-4">
          <LostBookReport userId={userId} />
        </TabsContent>

        <TabsContent value="fines" className="mt-4">
          <MyFines userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
