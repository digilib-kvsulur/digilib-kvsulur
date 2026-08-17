import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Swords, Trophy, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Competition {
  id: string;
  title: string;
  class_a: string;
  class_b: string;
  metric: string;
  end_date: string;
}

export default function ClassCompetitions({ userClass }: { userClass: string }) {
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  // Mock live scores (in a real app, this would be computed on backend based on metric type)
  const [scores, setScores] = useState<Record<string, { a: number, b: number }>>({});

  useEffect(() => {
    if (!userClass) { setLoading(false); return; }
    
    const fetchCompetitions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("class_competitions")
          .select("*")
          .eq("status", "active")
          .or(`class_a.eq.${userClass},class_b.eq.${userClass}`);
          
        if (!error && data) {
          setCompetitions(data);
          
          // Generate mock live scores
          const sc: Record<string, { a: number, b: number }> = {};
          data.forEach(c => {
             // Fake varying scores for UI demonstration
             sc[c.id] = {
               a: Math.floor(Math.random() * 200) + 50,
               b: Math.floor(Math.random() * 200) + 50,
             };
          });
          setScores(sc);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompetitions();
  }, [userClass]);

  if (loading) return <Skeleton className="h-[200px] w-full rounded-2xl" />;
  if (competitions.length === 0) return null;

  return (
    <div className="space-y-4">
      {competitions.map((comp) => {
        const isClassA = comp.class_a === userClass;
        const myScore = isClassA ? scores[comp.id]?.a : scores[comp.id]?.b;
        const enemyScore = isClassA ? scores[comp.id]?.b : scores[comp.id]?.a;
        const enemyClass = isClassA ? comp.class_b : comp.class_a;
        const isWinning = (myScore || 0) >= (enemyScore || 0);

        const progressA = ((scores[comp.id]?.a || 0) / ((scores[comp.id]?.a || 1) + (scores[comp.id]?.b || 1))) * 100;
        const progressB = 100 - progressA;

        return (
          <Card key={comp.id} className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative">
            {/* Decorative background vectors */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            
            <CardHeader className="relative z-10 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                    <Swords className="h-5 w-5 text-rose-400" />
                    {comp.title}
                  </CardTitle>
                  <CardDescription className="text-indigo-200 mt-1">
                    Ending {new Date(comp.end_date).toLocaleDateString()}
                  </CardDescription>
                </div>
                {isWinning ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
                    <Trophy className="h-3.5 w-3.5" /> Winning!
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs">
                    Trailing...
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-2">
              <div className="flex items-center justify-between gap-4 mb-3">
                 <div className="text-left flex-1">
                    <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Class {comp.class_a}</p>
                    <p className="text-2xl font-black text-white">{scores[comp.id]?.a || 0}</p>
                 </div>
                 <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-400">
                    VS
                 </div>
                 <div className="text-right flex-1">
                    <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Class {comp.class_b}</p>
                    <p className="text-2xl font-black text-white">{scores[comp.id]?.b || 0}</p>
                 </div>
              </div>
              
              {/* Tug of war bar */}
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex relative">
                <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out" style={{ width: `${progressA}%` }} />
                <div className="h-full bg-rose-500 transition-all duration-1000 ease-out" style={{ width: `${progressB}%` }} />
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
              </div>
              <p className="text-center text-[10px] text-indigo-300/70 font-semibold mt-2 uppercase tracking-widest">
                Metric: {comp.metric.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
