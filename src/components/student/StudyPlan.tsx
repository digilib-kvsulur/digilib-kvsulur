import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, CheckCircle, Clock, BookOpen, Brain } from "lucide-react";

export default function StudyPlan() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Read 20 pages of current book", type: "reading", duration: 30, completed: false },
    { id: 2, title: "Take a Science Quiz", type: "quiz", duration: 15, completed: false },
    { id: 3, title: "Review NCert Math Chapter 4", type: "study", duration: 45, completed: false }
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const getIcon = (type: string) => {
    if (type === 'reading') return <BookOpen className="h-4 w-4 text-indigo-500" />;
    if (type === 'quiz') return <Brain className="h-4 w-4 text-purple-500" />;
    return <Timer className="h-4 w-4 text-emerald-500" />;
  };

  const progress = (tasks.filter(t => t.completed).length / tasks.length) * 100;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
           <div>
             <CardTitle className="text-xl flex items-center gap-2">
                <Timer className="h-5 w-5 text-indigo-600" /> Daily Study Plan
             </CardTitle>
             <CardDescription>Your personalized goals for today</CardDescription>
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
      </CardContent>
    </Card>
  );
}
