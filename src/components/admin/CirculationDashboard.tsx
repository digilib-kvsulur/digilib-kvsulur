import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Calendar, Clock, RotateCcw, AlertTriangle, TrendingUp, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CirculationDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    issuedCount: 0,
    overdueCount: 0,
    returnedTodayCount: 0,
    pendingRequestsCount: 0,
    lowStockCount: 0,
  });

  const [returnedToday, setReturnedToday] = useState<any[]>([]);
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [mostBorrowedList, setMostBorrowedList] = useState<any[]>([]);

  const loadCirculationData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split("T")[0];

      // 1. Fetch current active issues & returned today
      const { data: issuesData } = await supabase
        .from("book_issues")
        .select("*, books(title, author), profiles:user_id(first_name, last_name, student_class)");

      const activeIssues = (issuesData || []).filter(i => i.status === "issued");
      const returnedTodayData = (issuesData || []).filter(
        i => i.status === "returned" && i.return_date && i.return_date >= todayStr
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueData = activeIssues.filter(i => {
        if (!i.due_date) return false;
        const due = new Date(i.due_date);
        due.setHours(0, 0, 0, 0);
        return due < today;
      });

      // 2. Fetch pending book requests
      const { count: pendingReqs } = await supabase
        .from("book_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      // 3. Fetch books to count low stock
      const { data: booksData } = await supabase
        .from("books")
        .select("*")
        .order("title");

      // Low stock: copies available is 0 or less than 20% of total copies (where total > 1) and available <= 2
      const lowStockData = (booksData || []).filter(
        b => b.available_copies <= 2 && b.available_copies < b.total_copies
      );

      // 4. Calculate most borrowed books (analytics)
      const bookBorrowedCounts: Record<string, { title: string; author: string; count: number }> = {};
      issuesData?.forEach(issue => {
        const bookId = issue.book_id;
        const bMeta = issue.books as any;
        if (!bookId || !bMeta) return;
        if (!bookBorrowedCounts[bookId]) {
          bookBorrowedCounts[bookId] = { title: bMeta.title, author: bMeta.author, count: 0 };
        }
        bookBorrowedCounts[bookId].count += 1;
      });

      const sortedMostBorrowed = Object.values(bookBorrowedCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        issuedCount: activeIssues.length,
        overdueCount: overdueData.length,
        returnedTodayCount: returnedTodayData.length,
        pendingRequestsCount: pendingReqs || 0,
        lowStockCount: lowStockData.length,
      });

      setReturnedToday(returnedTodayData.slice(0, 10));
      setOverdueList(overdueData.slice(0, 10));
      setLowStockList(lowStockData.slice(0, 10));
      setMostBorrowedList(sortedMostBorrowed);
    } catch (e) {
      console.error("Error loading circulation data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCirculationData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0f1b3d]">Circulation Dashboard</h2>
        <p className="text-sm text-muted-foreground">Real-time overview of checkouts, overdue books, and inventory status.</p>
      </div>

      {/* Circulation Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Active Loans", value: stats.issuedCount, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
          { label: "Overdue", value: stats.overdueCount, icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Returned Today", value: stats.returnedTodayCount, icon: RotateCcw, color: "text-success", bg: "bg-success/10" },
          { label: "Pending Requests", value: stats.pendingRequestsCount, icon: HelpCircle, color: "text-warning", bg: "bg-warning/10" },
          { label: "Low Stock Books", value: stats.lowStockCount, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex flex-col justify-between h-24">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold text-[#0f1b3d]">{stat.value}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 leading-tight">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Loans */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-destructive" /> Overdue Books List</CardTitle>
              <CardDescription className="text-xs">Top overdue items currently issued</CardDescription>
            </div>
            <Badge variant="destructive" className="text-xs">Overdue</Badge>
          </CardHeader>
          <CardContent>
            {overdueList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No overdue books at the moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Book Title</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueList.map(item => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-semibold truncate max-w-[150px]">
                          {item.books?.title}
                          {item.accession_number && <span className="font-mono text-[9px] block text-muted-foreground">Acc: #{item.accession_number}</span>}
                        </TableCell>
                        <TableCell>
                          {item.profiles?.first_name} {item.profiles?.last_name}
                          <span className="text-[9px] block text-muted-foreground">Class {item.profiles?.student_class}</span>
                        </TableCell>
                        <TableCell className="text-destructive font-semibold">
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Books */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" /> Low Stock Alerts</CardTitle>
              <CardDescription className="text-xs">Books requiring purchase or copy additions</CardDescription>
            </div>
            <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-xs">Reorder Needed</Badge>
          </CardHeader>
          <CardContent>
            {lowStockList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">All catalog items have healthy stock levels.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Book Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead className="text-center">Available / Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockList.map(book => (
                      <TableRow key={book.id} className="text-xs">
                        <TableCell className="font-semibold truncate max-w-[180px]">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={book.available_copies === 0 ? "destructive" : "outline"} className="text-xs">
                            {book.available_copies} / {book.total_copies}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Returned Today */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><RotateCcw className="h-4 w-4 text-success" /> Returned Today</CardTitle>
              <CardDescription className="text-xs">Books checked back in today</CardDescription>
            </div>
            <Badge className="bg-success text-white hover:bg-success/80 text-xs">Returned</Badge>
          </CardHeader>
          <CardContent>
            {returnedToday.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No books returned today yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Book Title</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Returned At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnedToday.map(item => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-semibold truncate max-w-[150px]">
                          {item.books?.title}
                          {item.accession_number && <span className="font-mono text-[9px] block text-muted-foreground">Acc: #{item.accession_number}</span>}
                        </TableCell>
                        <TableCell>
                          {item.profiles?.first_name} {item.profiles?.last_name}
                        </TableCell>
                        <TableCell className="text-success font-semibold">
                          {item.return_date ? new Date(item.return_date).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Borrowed Analytics */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Most Borrowed Books</CardTitle>
              <CardDescription className="text-xs">Top reading trends in the school</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">Popularity</Badge>
          </CardHeader>
          <CardContent>
            {mostBorrowedList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Not enough checkout history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Book Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead className="text-center">Times Borrowed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostBorrowedList.map((item, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-semibold truncate max-w-[180px]">{item.title}</TableCell>
                        <TableCell>{item.author}</TableCell>
                        <TableCell className="text-center font-bold text-primary">
                          {item.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
