import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Medal, Target } from "lucide-react";

interface HeatmapProps {
  activityLog: { date: string; value: number }[];
  year: number;
}

export default function ReadingHeatmap({ activityLog, year }: HeatmapProps) {
  // Generate a matrix of weeks x days for the given year
  const heatmapData = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Create lookup map
    const activityMap = new Map(activityLog.map(log => [log.date.split('T')[0], log.value]));
    
    // Find the first Sunday of the year (or previous year's last few days to align the grid)
    const firstDay = new Date(startDate);
    firstDay.setDate(startDate.getDate() - startDate.getDay());

    const weeks: { date: string; value: number; isCurrentMonth: boolean }[][] = [];
    let currentWeek: any[] = [];
    let currentDate = new Date(firstDay);

    while (currentDate <= endDate || currentWeek.length > 0) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      const dateString = currentDate.toISOString().split('T')[0];
      currentWeek.push({
        date: dateString,
        value: activityMap.get(dateString) || 0,
        isCurrentMonth: currentDate.getFullYear() === year
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: "", value: 0, isCurrentMonth: false });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [activityLog, year]);

  const getColorClass = (value: number) => {
    if (value === 0) return "bg-slate-100 hover:bg-slate-200";
    if (value < 30) return "bg-emerald-200 hover:bg-emerald-300"; // Less than 30 mins/pages
    if (value < 60) return "bg-emerald-400 hover:bg-emerald-500";
    if (value < 120) return "bg-emerald-600 hover:bg-emerald-700";
    return "bg-emerald-800 hover:bg-emerald-900"; // Super reader!
  };

  const totalValue = activityLog.reduce((acc, log) => acc + log.value, 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Reading Heatmap ({year})
            </CardTitle>
            <CardDescription>Track your daily reading consistency</CardDescription>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
             <div className="text-center">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
                <p className="text-sm font-black text-slate-800">{totalValue}</p>
             </div>
             <div className="w-px h-8 bg-slate-200" />
             <div className="text-center">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Streak</p>
                <p className="text-sm font-black text-orange-600 flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3 fill-orange-500" /> {activityLog.filter(a => a.value > 0).length} Days
                </p>
             </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-1 min-w-max">
            {/* Days of week labels */}
            <div className="flex flex-col gap-1 pr-2 text-[10px] text-slate-400 font-medium justify-between h-[100px] py-1">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            
            {/* Heatmap Grid */}
            <div className="flex gap-1">
              {heatmapData.map((week, wIndex) => (
                <div key={wIndex} className="flex flex-col gap-1">
                  {week.map((day, dIndex) => (
                    <div
                      key={day.date || dIndex}
                      title={day.date ? `${day.date}: ${day.value}` : ""}
                      className={`w-3.5 h-3.5 rounded-sm transition-colors cursor-help ${
                        !day.isCurrentMonth ? "opacity-20 bg-slate-100" : getColorClass(day.value)
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500 font-medium mt-4">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-slate-100" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600" />
            <div className="w-3 h-3 rounded-sm bg-emerald-800" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
