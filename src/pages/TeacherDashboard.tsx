import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, LogOut, Users, Trophy, GraduationCap, TrendingUp, Calendar, Target, Plus, Trash2, ListChecks, Star, BookMarked, Brain, FileText, User } from "lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";
import StudyMaterialsManager from "@/components/admin/StudyMaterialsManager";
import StudentProfile from "@/components/dashboard/StudentProfile";
import Community from "@/components/community/Community";
import MyRequests from "@/components/dashboard/MyRequests";
import NetworkTab from "@/components/dashboard/NetworkTab";
import TeacherProfileCompletionDialog from "@/components/dashboard/TeacherProfileCompletionDialog";

type TeacherTab = "progress" | "badges" | "reading-lists" | "recommendations" | "materials" | "community" | "network" | "book-requests" | "profile";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TeacherTab>("progress");
  
  // Class selection
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<string[]>([]);
  
  // Data lists
  const [students, setStudents] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [readingLists, setReadingLists] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [classChallenges, setClassChallenges] = useState<any[]>([]);
  
  // Student Drilldown Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [studentQuizzes, setStudentQuizzes] = useState<any[]>([]);
  const [studentIssues, setStudentIssues] = useState<any[]>([]);
  const [studentStreaks, setStudentStreaks] = useState<any>(null);

  // Forms dialog states
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [showRecDialog, setShowRecDialog] = useState(false);

  // Form inputs
  const [challengeForm, setChallengeForm] = useState({ title: "", description: "", targetValue: 3, type: "books_read", rewardPoints: 50, deadline: "" });
  const [listForm, setListForm] = useState({ title: "", description: "", selectedBookIds: [] as string[] });
  const [recForm, setRecForm] = useState({ bookId: "", notes: "" });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
        toast({ title: "Access denied", variant: "destructive" });
        navigate("/"); return;
      }
      setTeacher(profile);
      const teacherClass = profile.student_class || "";
      const { data: cls } = await supabase.from("profiles").select("student_class").eq("role", "student").eq("is_approved", true);
      const uniqSet = new Set((cls || []).map((c: any) => c.student_class).filter(Boolean));
      if (teacherClass) {
        uniqSet.add(teacherClass);
      }
      const uniq = Array.from(uniqSet).sort((a: any, b: any) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA === numB ? a.localeCompare(b) : numA - numB;
      }) as string[];
      setClasses(uniq);
      setSelectedClass(teacherClass || uniq[0] || "");
      
      // Load all books for catalog dropdown selections
      const { data: books } = await supabase.from("books").select("id, title, author").order("title");
      setAllBooks(books || []);
      
      setLoading(false);
    })();
  }, []);

  const fetchTeacherProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profile) setTeacher(profile);
    }
  };

  // Fetch all class details for the given class name
  const fetchClassDetails = async (classToFetch: string) => {
    if (!classToFetch) return;

    // Load students in class
    const { data: st } = await supabase.from("profiles")
      .select("id, first_name, last_name, roll_number, points, student_class")
      .eq("role", "student").eq("is_approved", true).eq("student_class", classToFetch)
      .order("points", { ascending: false });
    
    const studentList = st || [];
    setStudents(studentList);
    const ids = studentList.map((s: any) => s.id);

    // Load book issues for students
    if (ids.length) {
      const { data: bi } = await supabase.from("book_issues")
        .select("id, user_id, status, due_date, issue_date, accession_number, books(title, author)")
        .in("user_id", ids);
      setIssues(bi || []);
    } else {
      setIssues([]);
    }

    // Load class reading lists
    const { data: rl } = await supabase.from("class_reading_lists")
      .select("*")
      .eq("class_level", classToFetch)
      .order("created_at", { ascending: false });
    setReadingLists(rl || []);

    // Load class recommendations
    const { data: recs } = await supabase.from("class_book_recommendations")
      .select("*, books(title, author)")
      .eq("class_level", classToFetch);
    setRecommendations(recs || []);

    // Load class challenges
    const { data: ch } = await supabase.from("challenges")
      .select("*")
      .eq("class_level", classToFetch)
      .order("created_at", { ascending: false });
    setClassChallenges(ch || []);
  };

  useEffect(() => {
    if (selectedClass) fetchClassDetails(selectedClass);
  }, [selectedClass]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  // Handle student detail drill-down
  const drillDownStudent = async (student: any) => {
    setSelectedStudent(student);

    const [
      { data: history },
      { data: quizzes },
      { data: activeIssues },
      { data: streaks }
    ] = await Promise.all([
      supabase.from("reading_history").select("*").eq("user_id", student.id).order("completed_date", { ascending: false }),
      supabase.from("quiz_results").select("*, quizzes(title)").eq("user_id", student.id).order("completed_at", { ascending: false }),
      supabase.from("book_issues").select("*, books(title, author)").eq("user_id", student.id).eq("status", "issued"),
      supabase.from("login_streaks").select("*").eq("user_id", student.id).maybeSingle()
    ]);

    setStudentHistory(history || []);
    setStudentQuizzes(quizzes || []);
    setStudentIssues(activeIssues || []);
    setStudentStreaks(streaks || null);
  };

  // CRUD for Challenges
  const handleCreateChallenge = async () => {
    if (!challengeForm.title || !challengeForm.description || !challengeForm.deadline) {
      toast({ title: "Validation Error", description: "Please enter all fields.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("challenges").insert({
        title: challengeForm.title,
        description: challengeForm.description,
        target_value: challengeForm.targetValue,
        type: challengeForm.type,
        reward_points: challengeForm.rewardPoints,
        deadline: new Date(challengeForm.deadline).toISOString(),
        class_level: selectedClass,
        created_by: teacher.id
      });
      if (error) throw error;
      toast({ title: "Success", description: "Class challenge created successfully!" });
      setShowChallengeDialog(false);
      setChallengeForm({ title: "", description: "", targetValue: 3, type: "books_read", rewardPoints: 50, deadline: "" });
      fetchClassDetails(selectedClass);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm("Delete this challenge? Progress for this challenge will be removed.")) return;
    await supabase.from("challenges").delete().eq("id", id);
    toast({ title: "Challenge deleted" });
    fetchClassDetails(selectedClass);
  };

  // CRUD for Reading Lists
  const handleCreateReadingList = async () => {
    if (!listForm.title || listForm.selectedBookIds.length === 0) {
      toast({ title: "Validation Error", description: "Enter list title and select at least one book.", variant: "destructive" });
      return;
    }
    try {
      const selectedBooksMeta = allBooks
        .filter(b => listForm.selectedBookIds.includes(b.id))
        .map(b => ({ id: b.id, title: b.title, author: b.author }));

      const { error } = await supabase.from("class_reading_lists").insert({
        class_level: selectedClass,
        title: listForm.title,
        description: listForm.description || null,
        books: selectedBooksMeta,
        created_by: teacher.id
      });
      if (error) throw error;
      toast({ title: "Success", description: "Reading list created!" });
      setShowListDialog(false);
      setListForm({ title: "", description: "", selectedBookIds: [] });
      fetchClassDetails(selectedClass);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteReadingList = async (id: string) => {
    if (!confirm("Delete this reading list?")) return;
    await supabase.from("class_reading_lists").delete().eq("id", id);
    toast({ title: "Reading list deleted" });
    fetchClassDetails(selectedClass);
  };

  // CRUD for recommendations
  const handleCreateRecommendation = async () => {
    if (!selectedClass) return;
    if (!recForm.bookId) {
      toast({ title: "Please select a book", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("class_book_recommendations").insert({
        class_level: selectedClass,
        book_id: recForm.bookId,
        teacher_id: teacher.id,
        notes: recForm.notes || null
      });
      if (error) throw error;
      toast({ title: "Success", description: "Book recommended to class!" });
      setShowRecDialog(false);
      setRecForm({ bookId: "", notes: "" });
      fetchClassDetails(selectedClass);
    } catch (e: any) {
      toast({ title: "Error", description: "Already recommended or database error.", variant: "destructive" });
    }
  };

  const handleDeleteRecommendation = async (id: string) => {
    await supabase.from("class_book_recommendations").delete().eq("id", id);
    toast({ title: "Recommendation removed" });
    fetchClassDetails(selectedClass);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full" /></div>;

  const totalPoints = students.reduce((s, x) => s + (x.points || 0), 0);
  const avgPoints = students.length ? Math.round(totalPoints / students.length) : 0;
  const activeIssues = issues.filter(i => i.status === "issued");
  const overdueIssues = activeIssues.filter(i => i.due_date && new Date(i.due_date) < new Date());

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      {/* Top Header */}
      <header className="bg-card border-b sticky top-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0f1b3d] rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#0f1b3d]">Teacher Panel</h1>
              <p className="text-xs text-muted-foreground">Welcome, {teacher?.first_name} {teacher?.last_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate("/catalog")}>Library Catalog</Button>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <TeacherProfileCompletionDialog
  open={teacher?.needs_profile_update ?? false}
  user={teacher}
  onComplete={() => {
    // Refresh profile after dialog completion
    fetchTeacherProfile();
  }}
/>
<main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Class Selection Strip */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm border border-border/40">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Select Class League:</span>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {classes.length === 0 && <SelectItem value="none" disabled>No classes found</SelectItem>}
                {classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="px-3 py-1 font-semibold">
            Active League: Class {selectedClass}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0"><Users className="h-5 w-5" /></div>
              <div><p className="text-2xl font-extrabold text-[#0f1b3d]">{students.length}</p><p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Students</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center text-warning shrink-0"><Trophy className="h-5 w-5" /></div>
              <div><p className="text-2xl font-extrabold text-[#0f1b3d]">{avgPoints}</p><p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Avg points</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center text-success shrink-0"><BookOpen className="h-5 w-5" /></div>
              <div><p className="text-2xl font-extrabold text-[#0f1b3d]">{activeIssues.length}</p><p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Books Borrowed</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center text-destructive shrink-0"><Calendar className="h-5 w-5" /></div>
              <div><p className="text-2xl font-extrabold text-[#0f1b3d]">{overdueIssues.length}</p><p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Overdue Books</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="progress" value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
          <TabsList className="flex flex-wrap items-center justify-start w-full bg-white border h-auto gap-1 p-1 rounded-lg">
            
            <TabsTrigger value="progress" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Class Progress</TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2"><Target className="h-4 w-4" /> Badges</TabsTrigger>
            <TabsTrigger value="reading-lists" className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Reading Lists</TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2"><Star className="h-4 w-4" /> Recommendations</TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2"><Users className="h-4 w-4" /> Community</TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-2"><Star className="h-4 w-4" /> Network</TabsTrigger>
            <TabsTrigger value="book-requests" className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Requests</TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2"><BookMarked className="h-4 w-4" /> Study Materials</TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2"><User className="h-4 w-4" /> My Profile</TabsTrigger>
          </TabsList>

          {/* TAB 0: Overview */}
          {/* TAB 1: Class Progress & Leaderboard */}
          <TabsContent value="progress">
            <Card className="border-border/50 bg-white">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Class Leaderboard & Stats</CardTitle>
                <CardDescription>Click a student to drill down into their active streaks, books, and quiz performance.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {students.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No students registered in this class.</p>}
                  {students.map((s, i) => {
                    const studentActiveIssues = activeIssues.filter(x => x.user_id === s.id);
                    const studentOverdue = overdueIssues.filter(x => x.user_id === s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => drillDownStudent(s)}
                        className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</div>
                          <div>
                            <p className="font-semibold text-sm">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-muted-foreground">Roll: {s.roll_number || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={studentOverdue.length ? "border-destructive text-destructive" : ""}>
                            {studentActiveIssues.length} out {studentOverdue.length ? `(${studentOverdue.length} overdue)` : ""}
                          </Badge>
                          <Badge className="gradient-primary text-white font-bold">{s.points || 0} pts</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Class Badges */}
          <TabsContent value="badges">
            <Card className="border-border/50 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Class Badges</CardTitle>
                  <CardDescription>Create unlockable badges for students in Class {selectedClass}</CardDescription>
                </div>
                <Button size="sm" className="gradient-primary border-0" onClick={() => setShowChallengeDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Badge
                </Button>
              </CardHeader>
              <CardContent>
                {classChallenges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No custom badges created for this class. Create one to motivate your readers!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classChallenges.map(c => (
                      <Card key={c.id} className="border-border/40 hover:shadow-sm transition-all flex flex-col justify-between">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center border border-yellow-300">🏅</div>
                              {c.title}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs font-semibold">+{c.reward_points} XP</Badge>
                          </div>
                          <CardDescription className="text-xs">{c.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4 space-y-3">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Target: {c.target_value} {c.type === "books_read" ? "Books" : c.type === "quiz_completed" ? "Quizzes" : "Points"}</span>
                            <span>Ends: {new Date(c.deadline).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-end">
                            <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteChallenge(c.id)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Reading Lists */}
          <TabsContent value="reading-lists">
            <Card className="border-border/50 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Curated Reading Lists</CardTitle>
                  <CardDescription>Upload books checklists that students in Class {selectedClass} can refer to.</CardDescription>
                </div>
                <Button size="sm" className="gradient-primary border-0" onClick={() => setShowListDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create List
                </Button>
              </CardHeader>
              <CardContent>
                {readingLists.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No custom reading lists uploaded for this class.</p>
                ) : (
                  <div className="space-y-4">
                    {readingLists.map(list => (
                      <Card key={list.id} className="border-border/40">
                        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                          <div>
                            <CardTitle className="text-base font-bold">{list.title}</CardTitle>
                            <CardDescription className="text-xs">{list.description || "No description provided."}</CardDescription>
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 px-2" onClick={() => handleDeleteReadingList(list.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(list.books) && list.books.map((b: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="px-2 py-0.5 font-medium text-xs">
                                <BookOpen className="h-3 w-3 mr-1 inline" />
                                {b.title} ({b.author})
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Book Recommendations */}
          <TabsContent value="recommendations">
            <Card className="border-border/50 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Book Recommendations</CardTitle>
                  <CardDescription>Recommend specific books from the library catalog to your class with personal notes.</CardDescription>
                </div>
                <Button size="sm" className="gradient-primary border-0" onClick={() => setShowRecDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Recommend Book
                </Button>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No class recommendations recorded yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map(r => (
                      <Card key={r.id} className="border-border/40 hover:shadow-sm transition-all flex flex-col justify-between">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <BookMarked className="h-4 w-4 text-primary shrink-0" />
                            {r.books?.title}
                          </CardTitle>
                          <CardDescription className="text-xs">by {r.books?.author}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4 space-y-3">
                          {r.notes && (
                            <p className="text-xs italic bg-muted/30 p-2.5 rounded-lg text-muted-foreground border-l-2 border-primary/50">
                              "{r.notes}"
                            </p>
                          )}
                          <div className="flex justify-end">
                            <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRecommendation(r.id)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Study Materials */}
          <TabsContent value="materials">
            <Card className="border-border/50 bg-white">
              <CardContent className="pt-6">
                <StudyMaterialsManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: Teacher Profile */}
          <TabsContent value="profile">
            {teacher && (
              <StudentProfile user={teacher} onProfileUpdate={fetchTeacherProfile} />
            )}
          </TabsContent>

          <TabsContent value="community">
            {teacher?.id && <Community currentUserId={teacher.id} isAdmin={false} />}
          </TabsContent>

          <TabsContent value="network">
            {teacher?.id && <NetworkTab user={teacher} />}
          </TabsContent>

          <TabsContent value="book-requests">
            {teacher?.id && <MyRequests userId={teacher.id} />}
          </TabsContent>
        </Tabs>
      </main>

      {/* STUDENT DRILLDOWN DIALOG */}
      <Dialog open={!!selectedStudent} onOpenChange={o => !o && setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.first_name} {selectedStudent?.last_name}</DialogTitle>
            <DialogDescription>Student Progress Report · Class {selectedStudent?.student_class} · Roll #{selectedStudent?.roll_number || "N/A"}</DialogDescription>
          </DialogHeader>

          {/* Drilldown stats */}
          <div className="grid grid-cols-3 gap-3 text-center my-2">
            <div className="p-3 bg-muted/40 rounded-xl">
              <p className="text-xl font-extrabold text-[#0f1b3d]">{selectedStudent?.points || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Points</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl">
              <p className="text-xl font-extrabold text-[#0f1b3d]">{studentHistory.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Books Completed</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl">
              <p className="text-xl font-extrabold text-[#0f1b3d]">{studentStreaks?.current_streak || 0}d</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Current Streak</p>
            </div>
          </div>

          <div className="space-y-4 mt-2">
            {/* Active books */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Currently Borrowed ({studentIssues.length})</h4>
              {studentIssues.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No books checked out currently.</p>
              ) : (
                <div className="space-y-1.5">
                  {studentIssues.map(i => (
                    <div key={i.id} className="p-2.5 rounded-lg border text-xs flex justify-between items-center bg-card">
                      <div>
                        <span className="font-semibold">{i.books?.title}</span>
                        <span className="text-muted-foreground ml-2">by {i.books?.author}</span>
                      </div>
                      <Badge variant={new Date(i.due_date) < new Date() ? "destructive" : "outline"}>
                        Due {new Date(i.due_date).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reading history */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><ListChecks className="h-4 w-4" /> Reading History ({studentHistory.length})</h4>
              {studentHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No books read yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {studentHistory.map(h => (
                    <div key={h.id} className="p-2.5 rounded-lg border text-xs flex justify-between items-center bg-card">
                      <div>
                        <span className="font-semibold">{h.book_title}</span>
                        <span className="text-muted-foreground ml-2">by {h.book_author}</span>
                      </div>
                      <div className="flex gap-2">
                        {h.rating && <Badge variant="secondary">⭐ {h.rating}/5</Badge>}
                        <span className="text-[10px] text-muted-foreground self-center">{new Date(h.completed_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quiz results */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Brain className="h-4 w-4" /> Quiz Results ({studentQuizzes.length})</h4>
              {studentQuizzes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No quizzes completed yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {studentQuizzes.map(q => (
                    <div key={q.id} className="p-2.5 rounded-lg border text-xs flex justify-between items-center bg-card">
                      <div>
                        <span className="font-semibold">{(q.quizzes as any)?.title || "Quiz"}</span>
                        <span className="text-muted-foreground ml-2">XP earned: +{q.points_earned}</span>
                      </div>
                      <Badge className={q.score >= 75 ? "bg-success text-white" : "bg-warning text-white"}>
                        {q.score}% Score
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Create Badge */}
      <Dialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class Badge</DialogTitle>
            <DialogDescription>Assign a badge requirement specifically for students in Class {selectedClass}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-1">
              <Label>Badge Title</Label>
              <Input placeholder="e.g. Reading Champion" value={challengeForm.title} onChange={e => setChallengeForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea placeholder="Explain how to earn this badge..." value={challengeForm.description} onChange={e => setChallengeForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Target Type</Label>
                <Select value={challengeForm.type} onValueChange={v => setChallengeForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="books_read">Books Read</SelectItem>
                    <SelectItem value="quiz_completed">Quizzes Passed</SelectItem>
                    <SelectItem value="points">Total Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Target Amount</Label>
                <Input type="number" value={challengeForm.targetValue} onChange={e => setChallengeForm(prev => ({ ...prev, targetValue: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>XP Reward (Optional)</Label>
                <Input type="number" value={challengeForm.rewardPoints} onChange={e => setChallengeForm(prev => ({ ...prev, rewardPoints: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label>Deadline (Optional)</Label>
                <Input type="date" value={challengeForm.deadline} onChange={e => setChallengeForm(prev => ({ ...prev, deadline: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChallengeDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateChallenge}>Create Badge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Create Reading List */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Class Reading List</DialogTitle>
            <DialogDescription>Select books to include in a class reading list for Class {selectedClass}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-1">
              <Label>List Title</Label>
              <Input placeholder="e.g. Science Reference Material" value={listForm.title} onChange={e => setListForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea placeholder="Describe the purpose of this reading list..." value={listForm.description} onChange={e => setListForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Select Books (check multiple)</Label>
              <div className="border rounded-lg max-h-40 overflow-y-auto p-2 divide-y divide-border/40">
                {allBooks.map(b => {
                  const checked = listForm.selectedBookIds.includes(b.id);
                  return (
                    <label key={b.id} className="flex items-center gap-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted/50 px-1.5 rounded">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const n = checked 
                            ? listForm.selectedBookIds.filter(x => x !== b.id)
                            : [...listForm.selectedBookIds, b.id];
                          setListForm(prev => ({ ...prev, selectedBookIds: n }));
                        }}
                      />
                      <span className="font-semibold text-foreground truncate">{b.title}</span>
                      <span className="text-muted-foreground truncate">by {b.author}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateReadingList}>Create Reading List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Recommend Book */}
      <Dialog open={showRecDialog} onOpenChange={setShowRecDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recommend Book to Class {selectedClass}</DialogTitle>
            <DialogDescription>This book will appear in the "Teacher's Picks" widget of student portals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-1">
              <Label>Select Book</Label>
              <Select value={recForm.bookId} onValueChange={v => setRecForm(prev => ({ ...prev, bookId: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a book from catalog" /></SelectTrigger>
                <SelectContent>
                  {allBooks.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.title} (by {b.author})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Teacher Notes / Guidance</Label>
              <Textarea placeholder="Explain why you recommend this book or add homework guidance..." value={recForm.notes} onChange={e => setRecForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRecommendation}>Recommend Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {teacher?.needs_profile_update && (
        <TeacherProfileCompletionDialog
          open={true}
          user={teacher}
          onComplete={fetchTeacherProfile}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
