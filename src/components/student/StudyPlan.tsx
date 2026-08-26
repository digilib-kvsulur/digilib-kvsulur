import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, CheckCircle, Clock, BookOpen, Brain, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Task {
  id: number;
  title: string;
  type: string;
  duration: number;
  completed: boolean;
}

export default function StudyPlan({ userId, studentClass }: { userId?: string; studentClass?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const getBaseClass = (cls?: string) => {
    if (!cls) return "";
    return cls.replace(/[^0-9]/g, "");
  };

  const loadDailyPlan = async (forceRefresh = false) => {
    if (!userId) return;
    setLoading(true);
    
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `study_plan_${userId}_${today}`;
    const savedPlan = localStorage.getItem(storageKey);

    if (savedPlan && !forceRefresh) {
      setTasks(JSON.parse(savedPlan));
      setLoading(false);
      return;
    }

    try {
      const baseClass = getBaseClass(studentClass);
      const generatedTasks: Task[] = [];

      // Task 1: Reading Task
      // Find user's active library book borrows
      let bookTitle = "";
      const { data: activeIssues } = await supabase
        .from('book_issues')
        .select('book_id, books(title)')
        .eq('user_id', userId)
        .eq('status', 'issued')
        .limit(1);

      if (activeIssues && activeIssues.length > 0) {
        const title = (activeIssues[0] as any).books?.title || "";
        bookTitle = `"${title}"`;
      }

      generatedTasks.push({
        id: 1,
        title: bookTitle ? `Read 15 pages of ${bookTitle}` : "Read 20 pages of any Library Book",
        type: "reading",
        duration: 25,
        completed: false
      });

      // Task 2: Subject/Syllabus specific study task
      let ncertTopic = "";
      if (baseClass) {
        const { data: chapters } = await supabase
          .from("ncert_books")
          .select("chapter_title, chapter_number, subject")
          .eq("class_number", baseClass)
          .limit(20);

        if (chapters && chapters.length > 0) {
          // Select a random chapter
          const randomIdx = Math.floor(Math.random() * chapters.length);
          const ch = chapters[randomIdx];
          ncertTopic = `${ch.subject} Ch ${ch.chapter_number}: ${ch.chapter_title}`;
        }
      }

      generatedTasks.push({
        id: 2,
        title: ncertTopic ? `Review ${ncertTopic}` : `Study standard topics for Class ${baseClass || 'General'}`,
        type: "study",
        duration: 45,
        completed: false
      });

      // Task 3: Quiz/Revision Challenge
      generatedTasks.push({
        id: 3,
        title: baseClass ? `Attempt a Class ${baseClass} Practice Quiz` : "Attempt a Library General Quiz",
        type: "quiz",
        duration: 15,
        completed: false
      });

      setTasks(generatedTasks);
      localStorage.setItem(storageKey, JSON.stringify(generatedTasks));
    } catch (e) {
      console.error("Failed to generate study plan", e);
      // Fallbacks
      setTasks([
        { id: 1, title: "Read 20 pages of current book", type: "reading", duration: 30, completed: false },
        { id: 2, title: "Take a Science Quiz", type: "quiz", duration: 15, completed: false },
        { id: 3, title: "Review NCert Math Chapters", type: "study", duration: 45, completed: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyPlan();
  }, [userId, studentClass]);

  const toggleTask = (id: number) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    if (userId) {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `study_plan_${userId}_${today}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const getIcon = (type: string) => {
    if (type === 'reading') return <BookOpen className="h-4 w-4 text-indigo-500" />;
    if (type === 'quiz') return <Brain className="h-4 w-4 text-purple-500" />;
    return <Timer className="h-4 w-4 text-emerald-500" />;
  };

  const progress = tasks.length ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
           <div>
             <CardTitle className="text-xl flex items-center gap-2">
                <Timer className="h-5 w-5 text-indigo-600" /> Daily Study Plan
             </CardTitle>
             <CardDescription>Syllabus-aligned goals for today</CardDescription>
           </div>
           <div className="text-right">
             <p className="text-2xl font-black text-indigo-600">{Math.round(progress)}%</p>
             <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
           </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-6 text-sm text-slate-400">Generating daily plan...</div>
        ) : (
          <>
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${task.completed ? 'bg-slate-50 border-slate-200' : 'bg-white hover:border-indigo-200'}`}
                onClick={() => toggleTask(task.id)}
              >
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {task.completed && <CheckCircle className="h-4 w-4 text-white" />}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className={`text-sm font-bold truncate transition-colors ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                     {task.title}
                   </p>
                   <div className="flex items-center gap-2 mt-0.5">
                      {getIcon(task.type)}
                      <span className="text-[10px] text-slate-500 font-medium">{task.duration} mins</span>
                   </div>
                 </div>
              </div>
            ))}
            <Button 
              onClick={() => loadDailyPlan(true)} 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Syllabus Plan
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
