import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Rocket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReadingVelocityProps {
  userId: string;
}

export default function ReadingVelocity({ userId }: ReadingVelocityProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchVelocity = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('get_student_reading_velocity', { p_user_id: userId });
        if (!error && result?.[0]) {
          setData(result[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchVelocity();
  }, [userId]);

  if (loading) {
    return <Skeleton className="w-full h-[70px] rounded-xl" />;
  }

  if (!data) return null;

  const getIcon = () => {
    const label = data.velocity_label || "";
    if (label.includes("Accelerating") || label.includes("Rising")) return <Rocket className="h-5 w-5 text-emerald-500" />;
    if (label.includes("Steady")) return <Minus className="h-5 w-5 text-amber-500" />;
    if (label.includes("Slowing")) return <TrendingDown className="h-5 w-5 text-rose-500" />;
    return <TrendingUp className="h-5 w-5 text-indigo-500" />;
  };

  const getBgClass = () => {
    const label = data.velocity_label || "";
    if (label.includes("Accelerating") || label.includes("Rising")) return "bg-emerald-50/50 border-emerald-100";
    if (label.includes("Steady")) return "bg-amber-50/50 border-amber-100";
    if (label.includes("Slowing")) return "bg-rose-50/50 border-rose-100";
    return "bg-indigo-50/50 border-indigo-100";
  };

  return (
    <Card className={`border shadow-sm overflow-hidden ${getBgClass()}`}>
       <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
               {getIcon()}
             </div>
             <div>
               <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                 Reading Velocity: {data.velocity_label}
               </p>
               <p className="text-xs text-slate-500 font-medium">
                 {data.books_last_30_days} books in 30 days vs {data.books_last_60_days} prior
               </p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-xl font-black text-slate-900">{data.velocity_score}%</p>
             <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">MOM Growth</p>
          </div>
       </CardContent>
    </Card>
  );
}
