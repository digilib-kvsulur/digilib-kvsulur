import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileDown, AlertTriangle, Users, BookOpen, Brain, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

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

  const generatePDF = (title: string, headers: string[], rows: any[], fileName: string) => {
    const doc = new jsPDF();
    
    // Add header branding
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229); // Brand Indigo color
    doc.text("PM SHRI Kendriya Vidyalaya AFS Sulur", 14, 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("Digital Library Management System (DLMS) - Official Report", 14, 21);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);
    
    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 27, 61);
    doc.text(title, 14, 37);

    // Render Table
    (doc as any).autoTable({
      startY: 42,
      head: [headers],
      body: rows,
      theme: "striped",
      headStyles: { fillContext: "#4f46e5", fillColor: [79, 70, 229], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`${fileName}_${new Date().toISOString().substring(0,10)}.pdf`);
  };

  const handleExport = async (type: string, format: "csv" | "pdf") => {
    const actionKey = `${type}_${format}`;
    setDownloading(actionKey);
    try {
      if (type === "users") {
        const { data, error } = await supabase.from("profiles").select("*").order("first_name");
        if (error) throw error;
        
        const headers = ["ID", "First Name", "Last Name", "Email", "Role", "Class", "Admission Number", "Points"];
        const rows = (data || []).map(p => [
          p.id, p.first_name, p.last_name, p.email, p.role, p.student_class, p.admission_number, p.points
        ]);
        
        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "users_report");
        } else {
          generatePDF("Student & Staff Member Registry", headers, rows, "users_report");
        }
      } 
      else if (type === "issued") {
        const { data, error } = await supabase
          .from("book_issues")
          .select("*, books(title, author), profiles:user_id(first_name, last_name)")
          .eq("status", "issued");
        if (error) throw error;

        const headers = ["Issue ID", "Book Title", "Author", "Accession Number", "Borrower Name", "Issue Date", "Due Date"];
        const rows = (data || []).map(i => [
          i.id.substring(0, 8), 
          (i.books as any)?.title, 
          (i.books as any)?.author, 
          i.accession_number || "—", 
          `${(i.profiles as any)?.first_name} ${(i.profiles as any)?.last_name}`,
          i.issue_date ? i.issue_date.substring(0,10) : "—",
          i.due_date ? i.due_date.substring(0,10) : "—"
        ]);

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "issued_books_report");
        } else {
          generatePDF("Active Book Issues & Circulation Registry", headers, rows, "issued_books_report");
        }
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
            i.id.substring(0, 8), 
            (i.books as any)?.title, 
            (i.books as any)?.author, 
            i.accession_number || "—", 
            `${(i.profiles as any)?.first_name} ${(i.profiles as any)?.last_name}`,
            i.due_date ? i.due_date.substring(0,10) : "—",
            daysOverdue
          ];
        });

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "overdue_books_report");
        } else {
          generatePDF("Overdue Loans & Fine Warning Report", headers, rows, "overdue_books_report");
        }
      }
      else if (type === "history") {
        const { data, error } = await supabase
          .from("reading_history")
          .select("*, profiles:user_id(first_name, last_name, student_class)")
          .order("completed_date", { ascending: false });
        if (error) throw error;

        const headers = ["ID", "Student Name", "Class", "Book Title", "Author", "Completed Date", "Rating", "Points"];
        const rows = (data || []).map(h => [
          h.id.substring(0, 8),
          `${(h.profiles as any)?.first_name} ${(h.profiles as any)?.last_name}`,
          (h.profiles as any)?.student_class,
          h.book_title,
          h.book_author,
          h.completed_date ? h.completed_date.substring(0,10) : "—",
          h.rating,
          h.points_earned
        ]);

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "reading_history_report");
        } else {
          generatePDF("Completed Reading History Records", headers, rows, "reading_history_report");
        }
      }
      else if (type === "quizzes") {
        const { data, error } = await supabase
          .from("quiz_results")
          .select("*, quizzes(title, subject), profiles:user_id(first_name, last_name, student_class)")
          .order("completed_at", { ascending: false });
        if (error) throw error;

        const headers = ["Result ID", "Student Name", "Class", "Quiz Title", "Subject", "Score %", "Points Earned", "Completed Date"];
        const rows = (data || []).map(q => [
          q.id.substring(0, 8),
          `${(q.profiles as any)?.first_name} ${(q.profiles as any)?.last_name}`,
          (q.profiles as any)?.student_class,
          (q.quizzes as any)?.title,
          (q.quizzes as any)?.subject,
          q.score,
          q.points_earned,
          q.completed_at ? q.completed_at.substring(0,10) : "—"
        ]);

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "quiz_results_report");
        } else {
          generatePDF("Comprehension Quiz Results & Logs", headers, rows, "quiz_results_report");
        }
      }
      else if (type === "leaderboard") {
        const { data, error } = await supabase.rpc('get_leaderboard_data');
        if (error) throw error;

        const headers = ["Rank", "Student Name", "Class", "Total Points"];
        const rows = (data || []).map((l: any, idx: number) => [
          idx + 1,
          `${l.first_name || ""} ${l.last_name || ""}`.trim(),
          l.student_class,
          l.points
        ]);

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "leaderboard_report");
        } else {
          generatePDF("School Reading Standings & Leaderboard", headers, rows, "leaderboard_report");
        }
      }

      toast({ title: "Report Exported", description: `Report generated as ${format.toUpperCase()} successfully.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Export Failed", description: e.message || "Failed to generate report file.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const reportTypes = [
    { type: "users", title: "Users Profile Report", desc: "All registered student and staff profiles", icon: Users, color: "bg-primary/10 text-primary" },
    { type: "issued", title: "Issued Books Registry", desc: "Current active loans outstanding", icon: BookOpen, color: "bg-success/10 text-success" },
    { type: "overdue", title: "Overdue Loans Report", desc: "Issued books past their return due date", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { type: "history", title: "Reading History Records", desc: "Logs of completed book transactions", icon: FileSpreadsheet, color: "bg-accent/10 text-accent" },
    { type: "quizzes", title: "Quiz Results Logs", desc: "Scores and XP awarded for test completions", icon: Brain, color: "bg-indigo-500/10 text-indigo-500" },
    { type: "leaderboard", title: "Leaderboard Standings", desc: "Total school rankings data", icon: Trophy, color: "bg-yellow-500/10 text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0f1b3d]">Official Library Reports</h2>
        <p className="text-sm text-muted-foreground">Download standard spreadsheets or branded print-ready PDFs of library statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((rpt) => (
          <Card key={rpt.type} className="border-border/50 bg-white">
            <CardHeader className="pb-3 flex flex-row items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${rpt.color} flex items-center justify-center`}><rpt.icon className="h-5 w-5" /></div>
              <div>
                <CardTitle className="text-base font-bold">{rpt.title}</CardTitle>
                <CardDescription className="text-xs">{rpt.desc}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pt-2">
              <Button 
                variant="outline"
                size="sm"
                disabled={!!downloading} 
                onClick={() => handleExport(rpt.type, "csv")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> 
                {downloading === `${rpt.type}_csv` ? "..." : "CSV"}
              </Button>
              <Button 
                size="sm"
                disabled={!!downloading} 
                onClick={() => handleExport(rpt.type, "pdf")}
              >
                <FileDown className="h-4 w-4 mr-2" /> 
                {downloading === `${rpt.type}_pdf` ? "..." : "PDF"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
