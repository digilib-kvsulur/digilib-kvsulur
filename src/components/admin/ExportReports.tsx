import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Download, 
  FileSpreadsheet, 
  FileDown, 
  AlertTriangle, 
  Users, 
  BookOpen, 
  Brain, 
  Trophy, 
  Library, 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  Layers, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  FolderArchive,
  BookCheck,
  Sparkles,
  GraduationCap
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  AreaChart, 
  Area 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CHART_COLORS = [
  "#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", 
  "#8b5cf6", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
];

export default function ExportReports() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all-reports");
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [booksData, setBooksData] = useState<any[]>([]);
  const [issuesData, setIssuesData] = useState<any[]>([]);
  const [profilesData, setProfilesData] = useState<Record<string, any>>({});
  const [selectedStudentClass, setSelectedStudentClass] = useState("all");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const { toast } = useToast();

  // Load distinct student classes from DB on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("student_class")
          .eq("role", "student")
          .not("student_class", "is", null);
        if (!error && data) {
          const raw = Array.from(
            new Set(data.map((s: any) => (s.student_class || "").trim().toUpperCase()).filter(Boolean))
          );
          // Natural sort: Grade 1..12 then sections A..E
          raw.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b);
          });
          setAvailableClasses(raw);
        }
      } catch (err) {
        console.warn("Failed to load distinct student classes:", err);
      }
    })();
  }, []);

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
    link.setAttribute("download", `${fileName}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = (
    title: string, 
    headers: string[], 
    rows: any[], 
    fileName: string, 
    orientation: "portrait" | "landscape" = "portrait"
  ) => {
    const doc = new jsPDF(orientation === "landscape" ? "landscape" : "portrait");
    
    // Header branding
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229); // Brand Indigo color
    doc.text("PM SHRI Kendriya Vidyalaya AFS Sulur", 14, 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Digital Library Management System (DLMS) - Official Administrative Report", 14, 21);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${rows.length}`, 14, 27);
    
    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 27, 61);
    doc.text(title, 14, 36);

    // Render Table using direct autoTable function call
    autoTable(doc, {
      startY: 41,
      head: [headers],
      body: rows,
      theme: "striped",
      headStyles: { 
        fillColor: [79, 70, 229], 
        fontSize: orientation === "landscape" ? 8 : 8.5,
        fontStyle: "bold"
      },
      bodyStyles: { 
        fontSize: orientation === "landscape" ? 7.5 : 8,
        cellPadding: 2
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save(`${fileName}_${new Date().toISOString().substring(0, 10)}.pdf`);
  };

  // Helper to fetch all records with automatic pagination
  const fetchAllFromSupabase = async (tableName: string, selectFields = "*", orderBy = "created_at") => {
    const PAGE_SIZE = 1000;
    let allRecords: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from(tableName as any)
        .select(selectFields)
        .order(orderBy, { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allRecords = [...allRecords, ...data];
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return allRecords;
  };

  // Helper to fetch borrower profiles for an array of user IDs
  const fetchBorrowerProfiles = async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const profileMap: Record<string, any> = {};
    for (let i = 0; i < uniqueIds.length; i += 200) {
      const batch = uniqueIds.slice(i, i + 200);
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, admission_number, student_class, role, email")
        .in("id", batch);
      (data || []).forEach(p => {
        profileMap[p.id] = p;
      });
    }
    return profileMap;
  };

  // Load datasets for analytics
  const loadAnalyticsData = async (force = false) => {
    if (!force && booksData.length > 0 && issuesData.length > 0) return;
    setLoadingAnalytics(true);
    try {
      const [books, issues] = await Promise.all([
        fetchAllFromSupabase("books", "*", "title"),
        fetchAllFromSupabase("book_issues", "*, books(title, author, category, accession_number)", "issue_date")
      ]);

      const userIds = issues.map((i: any) => i.user_id).filter(Boolean);
      const profMap = await fetchBorrowerProfiles(userIds);

      setBooksData(books);
      setIssuesData(issues);
      setProfilesData(profMap);
    } catch (e: any) {
      console.error("Failed to load analytics datasets:", e);
      toast({
        title: "Analytics Load Error",
        description: e.message || "Failed to load complete library records.",
        variant: "destructive"
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === "accession-analytics" || activeTab === "issue-analytics") {
      loadAnalyticsData();
    }
  }, [activeTab]);

  // Compute Accession Registry Analytics
  const accessionAnalytics = useMemo(() => {
    const totalTitles = booksData.length;
    let totalPhysicalCopies = 0;
    let totalAvailableCopies = 0;
    let totalCondemnedCopies = 0;
    let totalAccessionEntries = 0;

    const categoryMap: Record<string, { count: number; copies: number }> = {};
    const languageMap: Record<string, number> = {};
    const subjectMap: Record<string, number> = {};
    const classLevelMap: Record<string, number> = {};
    const locationMap: Record<string, number> = {};

    booksData.forEach((b: any) => {
      const copies = Number(b.total_copies) || 1;
      const avail = Number(b.available_copies) ?? copies;
      const condemned = Number(b.condemned_copies) || 0;

      totalPhysicalCopies += copies;
      totalAvailableCopies += avail;
      totalCondemnedCopies += condemned;

      const accs = Array.isArray(b.accession_numbers) && b.accession_numbers.length > 0
        ? b.accession_numbers
        : b.accession_number ? [b.accession_number] : [];
      totalAccessionEntries += accs.length;

      // Category
      const cat = (b.category || "General").trim();
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, copies: 0 };
      categoryMap[cat].count += 1;
      categoryMap[cat].copies += copies;

      // Language
      const lang = (b.language || "English").trim();
      languageMap[lang] = (languageMap[lang] || 0) + copies;

      // Subject
      if (b.subject) {
        const sub = b.subject.trim();
        subjectMap[sub] = (subjectMap[sub] || 0) + 1;
      }

      // Class Level
      if (b.class_level) {
        const cl = b.class_level.trim();
        classLevelMap[cl] = (classLevelMap[cl] || 0) + 1;
      }

      // Location
      if (b.cupboard_number || b.shelf_number) {
        const loc = `Cupboard ${b.cupboard_number || "—"}, Shelf ${b.shelf_number || "—"}`;
        locationMap[loc] = (locationMap[loc] || 0) + copies;
      }
    });

    const activeIssuedCount = Math.max(0, totalPhysicalCopies - totalAvailableCopies - totalCondemnedCopies);

    const categoryChartData = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, titles: data.count, copies: data.copies }))
      .sort((a, b) => b.copies - a.copies)
      .slice(0, 8);

    const languageChartData = Object.entries(languageMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const classLevelChartData = Object.entries(classLevelMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const topStockedBooks = [...booksData]
      .sort((a, b) => (b.total_copies || 0) - (a.total_copies || 0))
      .slice(0, 8);

    const topCirculatedBooks = [...booksData]
      .sort((a, b) => (b.issue_count || 0) - (a.issue_count || 0))
      .slice(0, 8);

    return {
      totalTitles,
      totalPhysicalCopies,
      totalAvailableCopies,
      totalCondemnedCopies,
      activeIssuedCount,
      totalAccessionEntries,
      accessionCoverage: totalPhysicalCopies > 0 ? Math.round((totalAccessionEntries / totalPhysicalCopies) * 100) : 0,
      categoryChartData,
      languageChartData,
      classLevelChartData,
      topStockedBooks,
      topCirculatedBooks
    };
  }, [booksData]);

  // Compute Issue Registry Analytics
  const issueAnalytics = useMemo(() => {
    const totalTransactions = issuesData.length;
    let activeCount = 0;
    let returnedCount = 0;
    let overdueCount = 0;
    let lostCount = 0;
    let totalBorrowDays = 0;
    let returnedDaysCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const roleMap: Record<string, number> = {};
    const classMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};
    const bookBorrowMap: Record<string, { title: string; author: string; count: number }> = {};
    const borrowerMap: Record<string, { name: string; role: string; className: string; count: number }> = {};

    issuesData.forEach((issue: any) => {
      const status = (issue.status || "issued").toLowerCase();
      const isOverdue = status === "issued" && issue.due_date && issue.due_date < todayStr;

      if (status === "returned") {
        returnedCount++;
        if (issue.issue_date && issue.return_date) {
          const diffMs = new Date(issue.return_date).getTime() - new Date(issue.issue_date).getTime();
          const days = Math.round(diffMs / (1000 * 3600 * 24));
          if (days >= 0 && days < 365) {
            totalBorrowDays += days;
            returnedDaysCount++;
          }
        }
      } else if (status === "lost") {
        lostCount++;
      } else if (isOverdue) {
        overdueCount++;
        activeCount++;
      } else {
        activeCount++;
      }

      // Borrower profile details
      const profile = profilesData[issue.user_id];
      const role = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "Student";
      roleMap[role] = (roleMap[role] || 0) + 1;

      if (profile?.student_class) {
        const cls = profile.student_class.trim();
        classMap[cls] = (classMap[cls] || 0) + 1;
      }

      // Monthly Circulation Trends (YYYY-MM)
      if (issue.issue_date) {
        const monthKey = issue.issue_date.substring(0, 7); // YYYY-MM
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
      }

      // Top Borrowed Titles
      const title = (issue.books as any)?.title || issue.book_title || "Unknown Book";
      const author = (issue.books as any)?.author || issue.book_author || "Unknown";
      const bookKey = `${title}_${author}`;
      if (!bookBorrowMap[bookKey]) {
        bookBorrowMap[bookKey] = { title, author, count: 0 };
      }
      bookBorrowMap[bookKey].count += 1;

      // Top Borrowers
      if (issue.user_id) {
        const borrowerName = profile 
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Member" 
          : "Member";
        if (!borrowerMap[issue.user_id]) {
          borrowerMap[issue.user_id] = {
            name: borrowerName,
            role,
            className: profile?.student_class || "—",
            count: 0
          };
        }
        borrowerMap[issue.user_id].count += 1;
      }
    });

    const statusChartData = [
      { name: "Returned", value: returnedCount, color: "#10b981" },
      { name: "Active", value: activeCount - overdueCount, color: "#4f46e5" },
      { name: "Overdue", value: overdueCount, color: "#ef4444" },
      { name: "Lost", value: lostCount, color: "#f59e0b" },
    ].filter(item => item.value > 0);

    const monthlyTrendData = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => {
        const [year, m] = month.split("-");
        const dateObj = new Date(Number(year), Number(m) - 1, 1);
        const label = dateObj.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
        return { month: label, issues: count };
      });

    const classChartData = Object.entries(classMap)
      .map(([name, count]) => ({ name: `Class ${name}`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const roleChartData = Object.entries(roleMap).map(([name, count]) => ({ name, count }));

    const topBorrowedBooks = Object.values(bookBorrowMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topBorrowers = Object.values(borrowerMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const avgDuration = returnedDaysCount > 0 ? (totalBorrowDays / returnedDaysCount).toFixed(1) : "—";
    const returnRate = totalTransactions > 0 ? Math.round((returnedCount / totalTransactions) * 100) : 0;

    return {
      totalTransactions,
      activeCount,
      returnedCount,
      overdueCount,
      lostCount,
      avgDuration,
      returnRate,
      statusChartData,
      monthlyTrendData,
      classChartData,
      roleChartData,
      topBorrowedBooks,
      topBorrowers
    };
  }, [issuesData, profilesData]);

  // Main Export Dispatcher
  const handleExport = async (type: string, format: "csv" | "pdf") => {
    const actionKey = `${type}_${format}`;
    setDownloading(actionKey);
    try {
      // 1. FULL BOOK ACCESSION REGISTRY
      if (type === "full_accession") {
        toast({ title: "Compiling Accession Registry", description: "Fetching complete accession catalog records..." });
        const books = await fetchAllFromSupabase("books", "*", "title");
        
        // Active issues to mark physical copies currently issued
        const { data: activeIssues } = await supabase
          .from("book_issues")
          .select("book_id, accession_number, status")
          .eq("status", "issued");
        
        const issuedAccSet = new Set<string>();
        (activeIssues || []).forEach(ai => {
          if (ai.accession_number) issuedAccSet.add(ai.accession_number.trim().toLowerCase());
        });

        const headers = [
          "Accession No.", 
          "Book Title", 
          "Author", 
          "Category", 
          "Subject", 
          "Class Level", 
          "Language", 
          "Location (Cupboard/Shelf)", 
          "Copy Status", 
          "Total Copies", 
          "Available", 
          "Times Issued", 
          "Registered Date"
        ];

        const rows: any[] = [];
        books.forEach((book: any) => {
          const accs = Array.isArray(book.accession_numbers) && book.accession_numbers.length > 0
            ? book.accession_numbers
            : book.accession_number ? [book.accession_number] : [];
          
          const location = `Cupboard ${book.cupboard_number || "—"}, Shelf ${book.shelf_number || "—"}`;
          const dateAdded = book.first_added_at ? book.first_added_at.substring(0, 10) : book.created_at ? book.created_at.substring(0, 10) : "—";

          if (accs.length > 0) {
            accs.forEach((accNum: string) => {
              const isIssued = issuedAccSet.has(accNum.trim().toLowerCase());
              const copyStatus = isIssued ? "Issued" : "Available";
              rows.push([
                accNum,
                book.title,
                book.author || "—",
                book.category || "General",
                book.subject || "—",
                book.class_level || "—",
                book.language || "English",
                location,
                copyStatus,
                book.total_copies ?? 1,
                book.available_copies ?? 1,
                book.issue_count ?? 0,
                dateAdded
              ]);
            });
          } else {
            // Book without individual accession numbers listed
            rows.push([
              book.accession_number || "Unassigned",
              book.title,
              book.author || "—",
              book.category || "General",
              book.subject || "—",
              book.class_level || "—",
              book.language || "English",
              location,
              (book.available_copies ?? 1) > 0 ? "Available" : "Checked Out",
              book.total_copies ?? 1,
              book.available_copies ?? 1,
              book.issue_count ?? 0,
              dateAdded
            ]);
          }
        });

        // Natural alphanumeric sort by Accession Number
        rows.sort((a, b) => {
          const numA = parseInt(String(a[0]).replace(/\D/g, ""), 10);
          const numB = parseInt(String(b[0]).replace(/\D/g, ""), 10);
          if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
          return String(a[0]).localeCompare(String(b[0]));
        });

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "full_book_accession_registry");
        } else {
          generatePDF("Full Book Accession Register & Inventory", headers, rows, "full_book_accession_registry", "landscape");
        }
      }

      // 2. FULL BOOK ISSUE REGISTRY (All Circulation History)
      else if (type === "full_issues") {
        toast({ title: "Compiling Issue Ledger", description: "Fetching full lifetime circulation transactions..." });
        const issues = await fetchAllFromSupabase("book_issues", "*, books(title, author, accession_number)", "issue_date");
        const userIds = issues.map((i: any) => i.user_id).filter(Boolean);
        const profMap = await fetchBorrowerProfiles(userIds);

        const headers = [
          "Issue ID", 
          "Accession No.", 
          "Book Title", 
          "Author", 
          "Borrower Name", 
          "Admission No.", 
          "Role", 
          "Class", 
          "Issue Date", 
          "Due Date", 
          "Return Date", 
          "Status", 
          "Renewals"
        ];

        const rows = issues.map((i: any) => {
          const prof = profMap[i.user_id];
          const borrowerName = prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : "Member";
          return [
            i.id.substring(0, 8),
            i.accession_number || (i.books as any)?.accession_number || "—",
            (i.books as any)?.title || i.book_title || "—",
            (i.books as any)?.author || i.book_author || "—",
            borrowerName,
            prof?.admission_number || "—",
            prof?.role || "student",
            prof?.student_class || "—",
            i.issue_date ? i.issue_date.substring(0, 10) : "—",
            i.due_date ? i.due_date.substring(0, 10) : "—",
            i.return_date ? i.return_date.substring(0, 10) : (i.status === "returned" ? "Returned" : "Outstanding"),
            (i.status || "issued").toUpperCase(),
            i.renewal_count ?? 0
          ];
        });

        // Newest issues first
        rows.reverse();

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "full_book_issue_registry");
        } else {
          generatePDF("Full Book Issue & Circulation Ledger", headers, rows, "full_book_issue_registry", "landscape");
        }
      }

      // 3. STUDENT DATA REGISTRY (Full School or Class-wise)
      else if (type === "student_data") {
        toast({ title: "Compiling Student Directory", description: "Fetching student members and circulation records..." });
        
        // 1. Fetch student profiles with pagination
        const PAGE_SIZE = 1000;
        let allStudents: any[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .range(from, from + PAGE_SIZE - 1);
            
          if (error) throw error;
          if (!data || data.length === 0) break;
          allStudents = [...allStudents, ...data];
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        // Apply class filter cleanly in memory to avoid syntax/casing mismatch
        let filteredStudents = allStudents;
        if (selectedStudentClass !== "all") {
          if (selectedStudentClass.startsWith("grade_")) {
            const gradeNum = selectedStudentClass.replace("grade_", "");
            filteredStudents = allStudents.filter(s => {
              const sc = (s.student_class || "").trim();
              const num = sc.replace(/\D/g, "");
              return num === gradeNum;
            });
          } else {
            const target = selectedStudentClass.trim().toUpperCase();
            filteredStudents = allStudents.filter(
              s => (s.student_class || "").trim().toUpperCase() === target
            );
          }
        }

        // 2. Fetch active loans count per student
        const { data: activeIssues } = await supabase
          .from("book_issues")
          .select("user_id")
          .eq("status", "issued");
        const activeIssuesCountMap: Record<string, number> = {};
        (activeIssues || []).forEach(ai => {
          if (ai.user_id) {
            activeIssuesCountMap[ai.user_id] = (activeIssuesCountMap[ai.user_id] || 0) + 1;
          }
        });

        // 3. Fetch completed reading count per student
        const { data: readingHistory } = await supabase
          .from("reading_history")
          .select("user_id");
        const historyCountMap: Record<string, number> = {};
        (readingHistory || []).forEach(rh => {
          if (rh.user_id) {
            historyCountMap[rh.user_id] = (historyCountMap[rh.user_id] || 0) + 1;
          }
        });

        // Build records
        const rows = filteredStudents.map(s => {
          const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student";
          const rawAdm = (s.admission_number || "").trim();
          const admNum = rawAdm || "—";
          const roll = (s.roll_number || "").trim() || "—";
          const cls = (s.student_class || "").trim() || "—";
          // Barcode is purely numeric admission number in KV Sulur standard
          const barcode = (s.library_card_barcode || "").trim() || rawAdm || "—";
          const email = (s.email || "").trim() || "—";
          const phone = (s.phone || "").trim() || "—";
          const points = Number(s.points) || 0;
          const activeLoans = activeIssuesCountMap[s.id] || 0;
          const booksRead = historyCountMap[s.id] || 0;
          const status = s.is_approved ? "Approved" : "Pending";
          const regDate = s.created_at ? s.created_at.substring(0, 10) : "—";

          return [
            admNum,
            roll,
            fullName,
            cls,
            barcode,
            email,
            phone,
            points,
            activeLoans,
            booksRead,
            status,
            regDate
          ];
        });

        // Natural sort by Grade -> Section -> Numeric Admission Number
        rows.sort((a, b) => {
          const gradeA = parseInt(String(a[3]).replace(/\D/g, ""), 10) || 0;
          const gradeB = parseInt(String(b[3]).replace(/\D/g, ""), 10) || 0;
          if (gradeA !== gradeB) return gradeA - gradeB;

          const secComp = String(a[3]).localeCompare(String(b[3]));
          if (secComp !== 0) return secComp;

          const numA = parseInt(String(a[0]).replace(/\D/g, ""), 10);
          const numB = parseInt(String(b[0]).replace(/\D/g, ""), 10);
          if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;

          return String(a[2]).localeCompare(String(b[2]));
        });

        let reportTitle = "Official Student Library Membership Registry";
        let fileName = "student_data_registry_all";

        if (selectedStudentClass.startsWith("grade_")) {
          const g = selectedStudentClass.replace("grade_", "");
          reportTitle = `Official Student Library Registry - Class ${g} (All Sections)`;
          fileName = `student_data_class_${g}_all_sections`;
        } else if (selectedStudentClass !== "all") {
          reportTitle = `Official Student Library Registry - Class ${selectedStudentClass}`;
          fileName = `student_data_class_${selectedStudentClass.replace(/\s+/g, "_")}`;
        }

        if (format === "csv") {
          const csvHeaders = [
            "Admission No.", 
            "Roll No.", 
            "Student Name", 
            "Class", 
            "Library Barcode", 
            "Email", 
            "Phone", 
            "Reading Points", 
            "Active Books Issued", 
            "Total Books Read", 
            "Approval Status", 
            "Registration Date"
          ];
          triggerDownload(convertToCSV(csvHeaders, rows), fileName);
        } else {
          // Printable PDF with 10 focused columns in Landscape
          const pdfHeaders = [
            "Adm No.", 
            "Roll No.", 
            "Student Name", 
            "Class", 
            "Barcode", 
            "Email", 
            "Points", 
            "Active Loans", 
            "Books Read", 
            "Status"
          ];
          const pdfRows = rows.map(r => [
            r[0], // Adm No
            r[1], // Roll No
            r[2], // Name
            r[3], // Class
            r[4], // Barcode
            r[5], // Email
            r[7], // Points
            r[8], // Active Loans
            r[9], // Books Read
            r[10] // Status
          ]);
          generatePDF(reportTitle, pdfHeaders, pdfRows, fileName, "landscape");
        }
      }

      // 4. ACCESSION REGISTRY ANALYTICS REPORT
      else if (type === "accession_analytics") {
        await loadAnalyticsData();
        const stats = accessionAnalytics;
        
        const headers = ["Metric / Dimension", "Value / Count", "Percentage / Notes"];
        const rows = [
          ["Total Book Titles Cataloged", stats.totalTitles, "Unique bibliographic titles"],
          ["Total Physical Copies in Stock", stats.totalPhysicalCopies, "Sum of total copies"],
          ["Available Copies on Shelves", stats.totalAvailableCopies, `${stats.totalPhysicalCopies > 0 ? Math.round((stats.totalAvailableCopies / stats.totalPhysicalCopies) * 100) : 0}% of stock`],
          ["Currently Issued Copies", stats.activeIssuedCount, "Outstanding borrower loans"],
          ["Condemned / Weeded Copies", stats.totalCondemnedCopies, "Permanently retired"],
          ["Accession Numbers Assigned", stats.totalAccessionEntries, `${stats.accessionCoverage}% coverage rate`],
          ["--- CATEGORY BREAKDOWN ---", "---", "---"],
          ...stats.categoryChartData.map(c => [c.name, `${c.copies} copies`, `${c.titles} titles`]),
          ["--- LANGUAGE BREAKDOWN ---", "---", "---"],
          ...stats.languageChartData.map(l => [l.name, `${l.value} copies`, "Copies in collection"]),
          ["--- TOP STOCKED TITLES ---", "---", "---"],
          ...stats.topStockedBooks.map(b => [b.title, `${b.total_copies} copies`, b.author || "—"])
        ];

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "accession_registry_analytics_report");
        } else {
          generatePDF("Official Book Accession & Stock Analytics Report", headers, rows, "accession_registry_analytics_report", "portrait");
        }
      }

      // 5. ISSUE REGISTRY ANALYTICS REPORT
      else if (type === "issues_analytics") {
        await loadAnalyticsData();
        const stats = issueAnalytics;

        const headers = ["Circulation Metric / Dimension", "Value / Count", "Details / Ratio"];
        const rows = [
          ["Total Lifetime Issue Transactions", stats.totalTransactions, "Circulation records to date"],
          ["Currently Active Loans", stats.activeCount, "Books currently with borrowers"],
          ["Completed Returns", stats.returnedCount, `${stats.returnRate}% total return rate`],
          ["Overdue Loans", stats.overdueCount, "Loans past due date"],
          ["Lost Books Reported", stats.lostCount, "Reported lost"],
          ["Average Borrow Duration", `${stats.avgDuration} days`, "Average loan duration for returned books"],
          ["--- ISSUES BY BORROWER ROLE ---", "---", "---"],
          ...stats.roleChartData.map(r => [r.name, `${r.count} checkouts`, "Total transactions"]),
          ["--- TOP CIRCULATED CLASSES ---", "---", "---"],
          ...stats.classChartData.map(c => [c.name, `${c.count} checkouts`, "Transactions in class"]),
          ["--- TOP 10 MOST BORROWED BOOKS ---", "---", "---"],
          ...stats.topBorrowedBooks.map(b => [b.title, `${b.count} checkouts`, b.author]),
          ["--- TOP ACTIVE READERS / BORROWERS ---", "---", "---"],
          ...stats.topBorrowers.map(u => [u.name, `${u.count} books borrowed`, `${u.role} (${u.className})`])
        ];

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "book_issue_analytics_report");
        } else {
          generatePDF("Comprehensive Book Circulation & Issue Analytics Report", headers, rows, "book_issue_analytics_report", "portrait");
        }
      }

      // 6. EXISTING CATEGORY REPORTS
      else if (type === "users") {
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
          i.issue_date ? i.issue_date.substring(0, 10) : "—",
          i.due_date ? i.due_date.substring(0, 10) : "—"
        ]);

        if (format === "csv") {
          triggerDownload(convertToCSV(headers, rows), "active_issued_books_report");
        } else {
          generatePDF("Active Outstanding Book Issues Registry", headers, rows, "active_issued_books_report");
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
            i.due_date ? i.due_date.substring(0, 10) : "—",
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
          h.completed_date ? h.completed_date.substring(0, 10) : "—",
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
          q.completed_at ? q.completed_at.substring(0, 10) : "—"
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

      toast({ 
        title: "Report Exported Successfully", 
        description: `Downloaded report file in ${format.toUpperCase()} format.` 
      });
    } catch (e: any) {
      console.error("Export failure:", e);
      toast({ 
        title: "Export Failed", 
        description: e.message || "Failed to generate report file.", 
        variant: "destructive" 
      });
    } finally {
      setDownloading(null);
    }
  };

  const standardReports = [
    { type: "student_data", title: "Student Data Registry", desc: "All enrolled students with admission numbers & class levels", icon: GraduationCap, color: "bg-purple-500/10 text-purple-600" },
    { type: "users", title: "All Users / Staff Report", desc: "All registered student and staff profiles", icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { type: "issued", title: "Active Loans Registry", desc: "Currently borrowed books outstanding", icon: BookOpen, color: "bg-emerald-500/10 text-emerald-600" },
    { type: "overdue", title: "Overdue Loans Report", desc: "Issued books past their return due date", icon: AlertTriangle, color: "bg-rose-500/10 text-rose-600" },
    { type: "history", title: "Reading History Records", desc: "Logs of completed book returns & reviews", icon: FileSpreadsheet, color: "bg-amber-500/10 text-amber-600" },
    { type: "quizzes", title: "Quiz Results Logs", desc: "Scores and XP awarded for test completions", icon: Brain, color: "bg-indigo-500/10 text-indigo-600" },
    { type: "leaderboard", title: "Leaderboard Standings", desc: "School-wide student points and reading rankings", icon: Trophy, color: "bg-yellow-500/10 text-yellow-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0f1b3d] flex items-center gap-2">
            <Library className="h-6 w-6 text-indigo-600" />
            Official Library Registries & Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download master accession ledgers, complete issue transaction logs, student enrollment registries, and statistical analytics reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadAnalyticsData(true)} 
            disabled={loadingAnalytics}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingAnalytics ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-3 max-w-xl bg-slate-100 p-1">
          <TabsTrigger value="all-reports" className="text-xs sm:text-sm flex items-center gap-1.5">
            <FolderArchive className="h-4 w-4" />
            <span>Reports & Registries</span>
          </TabsTrigger>
          <TabsTrigger value="accession-analytics" className="text-xs sm:text-sm flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span>Accession Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="issue-analytics" className="text-xs sm:text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span>Issue Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REPORTS & REGISTRIES */}
        <TabsContent value="all-reports" className="space-y-6 mt-0">
          {/* Highlighted Master Registries Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Master Registries & Complete Ledgers
              </h3>
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                Official KV Sulur DLMS Records
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Full Book Accession Registry Card */}
              <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-white shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-bl-full -z-0 opacity-40 pointer-events-none" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Library className="h-5 w-5" />
                    </div>
                    <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]">
                      Book Stock
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2.5">
                    Full Accession Registry
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-600">
                    Master physical inventory with itemized accession numbers, locations (cupboard & shelf), categories, and copy status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10 pt-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <BookCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">Individual copy barcodes, subjects & circulation.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs"
                      disabled={!!downloading} 
                      onClick={() => handleExport("full_accession", "csv")}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-indigo-600" /> 
                      {downloading === "full_accession_csv" ? "..." : "CSV"}
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-xs"
                      disabled={!!downloading} 
                      onClick={() => handleExport("full_accession", "pdf")}
                    >
                      <FileDown className="h-3.5 w-3.5 mr-1" /> 
                      {downloading === "full_accession_pdf" ? "..." : "PDF"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Full Book Issue Registry Card */}
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 rounded-bl-full -z-0 opacity-40 pointer-events-none" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">
                      Circulation
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2.5">
                    Full Issue Registry
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-600">
                    Complete circulation history recording all active loans, completed returns, overdue books, and member borrow details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10 pt-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Borrower admission no., class, dates & renewals.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs"
                      disabled={!!downloading} 
                      onClick={() => handleExport("full_issues", "csv")}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600" /> 
                      {downloading === "full_issues_csv" ? "..." : "CSV"}
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs"
                      disabled={!!downloading} 
                      onClick={() => handleExport("full_issues", "pdf")}
                    >
                      <FileDown className="h-3.5 w-3.5 mr-1" /> 
                      {downloading === "full_issues_pdf" ? "..." : "PDF"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Full Student Data Registry Card */}
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-white shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-bl-full -z-0 opacity-40 pointer-events-none" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[11px]">
                      Student Members
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2.5">
                    Student Data Registry
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-600">
                    Complete student membership records with admission numbers, roll numbers, barcodes, reading points, and active loans.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 relative z-10 pt-0">
                  {/* Dynamic Class Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-600 shrink-0">Filter Class:</span>
                    <Select value={selectedStudentClass} onValueChange={setSelectedStudentClass}>
                      <SelectTrigger className="h-7 text-xs bg-white border-purple-200">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all" className="text-xs font-semibold">
                          All Classes (Full School)
                        </SelectItem>
                        {/* Whole Grade Groups (e.g. All Class 6, All Class 7...) */}
                        {Array.from(new Set(availableClasses.map(c => parseInt(c.replace(/\D/g, ""), 10)).filter(Boolean)))
                          .sort((a, b) => a - b)
                          .map(grade => (
                            <SelectItem key={`grade_${grade}`} value={`grade_${grade}`} className="text-xs font-medium text-purple-700">
                              All Class {grade} (Sections A-E)
                            </SelectItem>
                          ))}
                        {/* Specific Sections */}
                        {availableClasses.map(cls => (
                          <SelectItem key={cls} value={cls} className="text-xs">
                            Class {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-purple-200 hover:bg-purple-50 text-purple-700 text-xs"
                      disabled={!!downloading} 
                      onClick={() => handleExport("student_data", "csv")}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-purple-600" /> 
                      {downloading === "student_data_csv" ? "..." : "CSV"}
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm text-xs"
                      disabled={!!downloading} 
                      onClick={() => handleExport("student_data", "pdf")}
                    >
                      <FileDown className="h-3.5 w-3.5 mr-1" /> 
                      {downloading === "student_data_pdf" ? "..." : "PDF"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Analytics Reports Export Banner */}
          <Card className="border-border/60 bg-slate-50/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    Summary Analytics Reports
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Download concise administrative summary reports with aggregated key performance indicators and distributions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200/80">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Accession Analytics Summary</h4>
                  <p className="text-xs text-slate-500">Stock totals, category & language breakdowns</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!!downloading}
                    onClick={() => handleExport("accession_analytics", "csv")}
                  >
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!!downloading}
                    onClick={() => handleExport("accession_analytics", "pdf")}
                  >
                    PDF
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200/80">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Issue & Circulation Analytics</h4>
                  <p className="text-xs text-slate-500">Return rates, monthly trends & top borrowers</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!!downloading}
                    onClick={() => handleExport("issues_analytics", "csv")}
                  >
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!!downloading}
                    onClick={() => handleExport("issues_analytics", "pdf")}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standard Reports Grid */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-800">Standard Category Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {standardReports.map((rpt) => (
                <Card key={rpt.type} className="border-border/50 bg-white hover:border-slate-300 transition-colors">
                  <CardHeader className="pb-3 flex flex-row items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${rpt.color} flex items-center justify-center shrink-0`}>
                      <rpt.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">{rpt.title}</CardTitle>
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
        </TabsContent>

        {/* TAB 2: ACCESSION REGISTRY ANALYTICS */}
        <TabsContent value="accession-analytics" className="space-y-6 mt-0">
          {/* Top Actions & KPI Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                Accession Registry & Inventory Analytics
              </h3>
              <p className="text-xs text-slate-600">
                Detailed quantitative analysis of physical book stock, accession coverage, and location distribution.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                disabled={!!downloading}
                onClick={() => handleExport("accession_analytics", "csv")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-indigo-600" />
                Export Analytics CSV
              </Button>
              <Button 
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!!downloading}
                onClick={() => handleExport("accession_analytics", "pdf")}
              >
                <FileDown className="h-4 w-4 mr-1.5" />
                Export Analytics PDF
              </Button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Unique Titles</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">{accessionAnalytics.totalTitles.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Catalog entries</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Physical Copies</p>
                <h4 className="text-2xl font-bold text-indigo-600 mt-1">{accessionAnalytics.totalPhysicalCopies.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Total library volume</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Available Copies</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-1">{accessionAnalytics.totalAvailableCopies.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Ready on shelves</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Currently Issued</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-1">{accessionAnalytics.activeIssuedCount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">With borrowers</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Condemned</p>
                <h4 className="text-2xl font-bold text-rose-600 mt-1">{accessionAnalytics.totalCondemnedCopies.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Weeded / Retired</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Accession Coverage</p>
                <h4 className="text-2xl font-bold text-blue-600 mt-1">{accessionAnalytics.accessionCoverage}%</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{accessionAnalytics.totalAccessionEntries} numbered copies</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">Stock by Category</CardTitle>
                <CardDescription className="text-xs">Physical copies breakdown across major genres</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {accessionAnalytics.categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accessionAnalytics.categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: any, name: any) => [value, name === "copies" ? "Total Copies" : "Unique Titles"]}
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        />
                        <Bar dataKey="copies" fill="#4f46e5" radius={[4, 4, 0, 0]} name="copies" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No category data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Language Breakdown */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">Collection by Language</CardTitle>
                <CardDescription className="text-xs">Proportion of physical collection by language</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {accessionAnalytics.languageChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={accessionAnalytics.languageChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {accessionAnalytics.languageChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [value, "Copies"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No language data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tables Row: Top Stocked & Most Circulated */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Stocked Titles */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900">Highest Quantity Stocked Titles</CardTitle>
                <CardDescription className="text-xs">Books with largest number of accession copies</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="text-xs">Book Title</TableHead>
                      <TableHead className="text-xs">Author</TableHead>
                      <TableHead className="text-xs text-right">Copies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessionAnalytics.topStockedBooks.map((b: any) => (
                      <TableRow key={b.id} className="text-xs">
                        <TableCell className="font-medium text-slate-900 max-w-[200px] truncate">{b.title}</TableCell>
                        <TableCell className="text-slate-500 max-w-[140px] truncate">{b.author || "—"}</TableCell>
                        <TableCell className="text-right font-bold text-indigo-600">{b.total_copies || 1}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Most Circulated Books from Stock */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900">Most Circulated Titles</CardTitle>
                <CardDescription className="text-xs">Books with highest cumulative lifetime loans</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="text-xs">Book Title</TableHead>
                      <TableHead className="text-xs">Author</TableHead>
                      <TableHead className="text-xs text-right">Total Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessionAnalytics.topCirculatedBooks.map((b: any) => (
                      <TableRow key={b.id} className="text-xs">
                        <TableCell className="font-medium text-slate-900 max-w-[200px] truncate">{b.title}</TableCell>
                        <TableCell className="text-slate-500 max-w-[140px] truncate">{b.author || "—"}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">{b.issue_count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: BOOK ISSUE REGISTRY ANALYTICS */}
        <TabsContent value="issue-analytics" className="space-y-6 mt-0">
          {/* Top Actions & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Book Issue & Circulation Analytics
              </h3>
              <p className="text-xs text-slate-600">
                Lifetime loan metrics, member borrower trends, overdue rates, and monthly circulation patterns.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                disabled={!!downloading}
                onClick={() => handleExport("issues_analytics", "csv")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
                Export Analytics CSV
              </Button>
              <Button 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!!downloading}
                onClick={() => handleExport("issues_analytics", "pdf")}
              >
                <FileDown className="h-4 w-4 mr-1.5" />
                Export Analytics PDF
              </Button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Lifetime Issues</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">{issueAnalytics.totalTransactions.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Total transactions</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Active Loans</p>
                <h4 className="text-2xl font-bold text-indigo-600 mt-1">{issueAnalytics.activeCount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Currently out</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Completed Returns</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-1">{issueAnalytics.returnedCount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{issueAnalytics.returnRate}% return rate</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Overdue Books</p>
                <h4 className="text-2xl font-bold text-rose-600 mt-1">{issueAnalytics.overdueCount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Past due date</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Reported Lost</p>
                <h4 className="text-2xl font-bold text-amber-600 mt-1">{issueAnalytics.lostCount.toLocaleString()}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Books lost</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Avg Loan Duration</p>
                <h4 className="text-2xl font-bold text-blue-600 mt-1">{issueAnalytics.avgDuration}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Days per borrow</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Area Chart */}
            <Card className="border-slate-200 bg-white lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">Circulation Timeline & Trends</CardTitle>
                <CardDescription className="text-xs">Monthly volume of book checkouts</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {issueAnalytics.monthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={issueAnalytics.monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="issueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: any) => [value, "Issues"]}
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="issues" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#issueGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No monthly trend records available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loan Status Pie Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">Loan Status Breakdown</CardTitle>
                <CardDescription className="text-xs">Distribution of all transactions</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {issueAnalytics.statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={issueAnalytics.statusChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={35}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {issueAnalytics.statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [value, "Loans"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No transaction status data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tables Row: Top Borrowed Titles & Top Borrowers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Borrowed Titles */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900">Most Frequently Checked Out Books</CardTitle>
                <CardDescription className="text-xs">Titles with highest loan frequency</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="text-xs">Book Title</TableHead>
                      <TableHead className="text-xs">Author</TableHead>
                      <TableHead className="text-xs text-right">Times Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issueAnalytics.topBorrowedBooks.map((b, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-medium text-slate-900 max-w-[200px] truncate">{b.title}</TableCell>
                        <TableCell className="text-slate-500 max-w-[140px] truncate">{b.author}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">{b.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Top Active Borrowers */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900">Top Active Borrowers</CardTitle>
                <CardDescription className="text-xs">Students & teachers with highest circulation activity</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70">
                      <TableHead className="text-xs">Member Name</TableHead>
                      <TableHead className="text-xs">Class / Role</TableHead>
                      <TableHead className="text-xs text-right">Borrows</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issueAnalytics.topBorrowers.map((u, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                        <TableCell className="text-slate-500">
                          <Badge variant="outline" className="text-[10px] py-0">
                            {u.role === "Teacher" ? "Teacher" : `Class ${u.className}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-indigo-600">{u.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
