import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, AlertTriangle, Users, BookOpen, Brain, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ExportReports() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  const convertToCSV = (headers: string[], rows: any[]) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map((val: any) => {
          if (val === null || val === undefined) return '""';
          const cleanStr = String(val).replace(/"/g, '""');
          return `"${cleanStr}"`;
        }).join(",")
      )
    ].join("\n");
    return csvContent;
  };

  const triggerDownload = (csv: string, fileName: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (type: string) => {
    setDownloading(type);
    try {
      if (type === "users") {
        const { data, error } = await supabase.from("profiles").select("*").order("first_name");
        if (error) throw error;
        
        const headers = ["ID", "First Name", "Last Name", "Email", "Role", "Class", "Roll Number", "Admission Number", "Points", "Approved", "Created At"];
        const rows = (data || []).map(p => [
          p.id, p.first_name, p.last_name, p.email, p.role, p.student_class, p.roll_number, p.admission_number, p.points, p.is_approved, p.created_at
        ]);
        
        const csv = convertToCSV(headers, rows);
        triggerDownload(csv, "users_report");
      } 
      else if (type === "issued") {
        const { data, error } = await supabase
          .from("book_issues")
          .select("*, books(title, author), profiles:user_id(first_name, last_name)")
          .eq("status", "issued");
        if (error) throw error;

        const headers = ["Issue ID", "Book Title", "Author", "Accession Number", "Borrower Name", "Issue Date", "Due Date"];
        const rows = (data || []).map(i => [
          i.id, 
          (i.books as any)?.title, 
          (i.books as any)?.author, 
          i.accession_number, 
          `${(i.profiles as any)?.first_name} ${(i.profiles as any)?.last_name}`,
          i.issue_date,
          i.due_date
        ]);

        const csv = convertToCSV(headers, rows);
        triggerDownload(csv, "issued_books_report");
      }
      else if (type === "overdue") {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("book_issues")
          .select("*, books(title, author), profiles:user_id(first_name, last_name)")
          .eq("status", "issued")
          .lt("due_date", today);
        if (error) throw error;

        const headers = ["Issue ID", "Book Title", "Author", "Accession Number", "Borrower Name", "Due Date", "Days Overdue"];
        const rows = (data || []).map(i => {
          const daysOverdue = Math.ceil((Date.now() - new Date(i.due_date).getTime()) / (1000 * 3600 * 24));
          return [
            i.id, 
            (i.books as any)?.title, 
            (i.books as any)?.author, 
            i.accession_number, 
            `${(i.profiles as any)?.first_name} ${(i.profiles as any)?.last_name}`,
            i.due_date,
            daysOverdue
          ];
        });

        const csv = convertToCSV(headers, rows);
        triggerDownload(csv, "overdue_books_report");
      }
      else if (type === "history") {
        const { data, error } = await supabase
          .from("reading_history")
          .select("*, profiles:user_id(first_name, last_name, student_class)")
          .order("completed_date", { ascending: false });
        if (error) throw error;

        const headers = ["ID", "Student Name", "Class", "Book Title", "Author", "Completed Date", "Rating", "Points Earned"];
        const rows = (data || []).map(h => [
          h.id,
          `${(h.profiles as any)?.first_name} ${(h.profiles as any)?.last_name}`,
          (h.profiles as any)?.student_class,
          h.book_title,
          h.book_author,
          h.completed_date,
          h.rating,
          h.points_earned
        ]);

        const csv = convertToCSV(headers, rows);
        triggerDownload(csv, "reading_history_report");
      }
      else if (type === "quizzes") {
        const { data, error } = await supabase
          .from("quiz_results")
          .select("*, quizzes(title, subject), profiles:user_id(first_name, last_name, student_class)")
          .order("completed_at", { ascending: false });
        if (error) throw error;

        const headers = ["Result ID", "Student Name", "Class", "Quiz Title", "Subject", "Score %", "Points Earned", "Completed Date"];
        const rows = (data || []).map(q => [
          q.id,
          `${(q.profiles as any)?.first_name} ${(q.profiles as any)?.last_name}`,
          (q.profiles as any)?.student_class,
          (q.quizzes as any)?.title,
          (q.quizzes as any)?.subject,
          q.score,
          q.points_earned,
          q.completed_at
        ]);

        const csv = convertToCSV(headers, rows);
        triggerDownload(csv, "quiz_results_report");
      }
      else if (type === "leaderboard") {
        const { data, error } = await supabase.rpc('get_leaderboard_data');
        if (error) throw error;

        const headers = ["Rank", "Student Name", "Class", "Total Points"];
        const rows = (data || []).map((l: any, idx: number) => [
          idx + 1,
          l.first_name,
          l.student_class,
          l.points
        ]);

        const csv = convertToCSV(headers, rows);
        triggerDownload(csv, "leaderboard_report");
      }

      toast({ title: "Report Exported", description: "CSV file download initiated successfully." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Export Failed", description: e.message || "Failed to query database records.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0f1b3d]">CSV Reports Export</h2>
        <p className="text-sm text-muted-foreground">Download spreadsheets of library, user, and analytics statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users Card */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Users className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base font-bold">Users Profile Report</CardTitle>
              <CardDescription className="text-xs">All registered student and staff profiles</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button className="w-full" disabled={!!downloading} onClick={() => handleExport("users")}>
              <Download className="h-4 w-4 mr-2" /> {downloading === "users" ? "Exporting..." : "Download CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* Issued Books Card */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success"><BookOpen className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base font-bold">Issued Books Registry</CardTitle>
              <CardDescription className="text-xs">Current active loans outstanding</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button className="w-full" disabled={!!downloading} onClick={() => handleExport("issued")}>
              <Download className="h-4 w-4 mr-2" /> {downloading === "issued" ? "Exporting..." : "Download CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* Overdue Loans Card */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base font-bold">Overdue Loans Report</CardTitle>
              <CardDescription className="text-xs">Issued books past their return due date</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button className="w-full" disabled={!!downloading} onClick={() => handleExport("overdue")}>
              <Download className="h-4 w-4 mr-2" /> {downloading === "overdue" ? "Exporting..." : "Download CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* Reading History Card */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent"><FileSpreadsheet className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base font-bold">Reading History Records</CardTitle>
              <CardDescription className="text-xs">Logs of completed book transactions</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button className="w-full" disabled={!!downloading} onClick={() => handleExport("history")}>
              <Download className="h-4 w-4 mr-2" /> {downloading === "history" ? "Exporting..." : "Download CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* Quiz Results Card */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Brain className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base font-bold">Quiz Results Logs</CardTitle>
              <CardDescription className="text-xs">Scores and XP awarded for test completions</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button className="w-full" disabled={!!downloading} onClick={() => handleExport("quizzes")}>
              <Download className="h-4 w-4 mr-2" /> {downloading === "quizzes" ? "Exporting..." : "Download CSV"}
            </Button>
          </CardContent>
        </Card>

        {/* Leaderboard Card */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500"><Trophy className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base font-bold">Leaderboard Standings</CardTitle>
              <CardDescription className="text-xs">Total school rankings data</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button className="w-full" disabled={!!downloading} onClick={() => handleExport("leaderboard")}>
              <Download className="h-4 w-4 mr-2" /> {downloading === "leaderboard" ? "Exporting..." : "Download CSV"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
