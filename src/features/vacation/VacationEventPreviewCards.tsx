import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Cpu,
  Eye,
  Flame,
  Globe,
  Key,
  Leaf,
  Lightbulb,
  MessageSquare,
  Palette,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { POSTER_ACTIVITIES, type PosterActivityTemplate } from "./constants";

interface VacationEventPreviewCardsProps {
  currentActivityTitle?: string;
  completedTitles?: Set<string>;
  onSelectToday?: () => void;
  onSelectActivity?: (title: string) => void;
}

const EVENT_THEMES: Record<
  number,
  {
    icon: React.ElementType;
    gradient: string;
    badgeBg: string;
    borderColor: string;
  }
> = {
  1: {
    icon: Cpu,
    gradient: "from-blue-600/20 via-cyan-500/10 to-indigo-500/10",
    badgeBg: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
    borderColor: "hover:border-blue-500/50",
  },
  2: {
    icon: Globe,
    gradient: "from-indigo-600/20 via-purple-500/10 to-blue-500/10",
    badgeBg: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    borderColor: "hover:border-indigo-500/50",
  },
  3: {
    icon: Leaf,
    gradient: "from-emerald-600/20 via-teal-500/10 to-green-500/10",
    badgeBg: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    borderColor: "hover:border-emerald-500/50",
  },
  4: {
    icon: Shield,
    gradient: "from-amber-600/20 via-orange-500/10 to-yellow-500/10",
    badgeBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    borderColor: "hover:border-amber-500/50",
  },
  5: {
    icon: MessageSquare,
    gradient: "from-purple-600/20 via-pink-500/10 to-rose-500/10",
    badgeBg: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
    borderColor: "hover:border-purple-500/50",
  },
  6: {
    icon: BookOpen,
    gradient: "from-amber-700/20 via-stone-500/10 to-orange-500/10",
    badgeBg: "bg-amber-700/20 text-amber-800 dark:text-amber-200 border-amber-700/30",
    borderColor: "hover:border-amber-700/50",
  },
  7: {
    icon: Award,
    gradient: "from-teal-600/20 via-cyan-500/10 to-emerald-500/10",
    badgeBg: "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30",
    borderColor: "hover:border-teal-500/50",
  },
  8: {
    icon: Palette,
    gradient: "from-pink-600/20 via-rose-500/10 to-fuchsia-500/10",
    badgeBg: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
    borderColor: "hover:border-pink-500/50",
  },
  9: {
    icon: Key,
    gradient: "from-red-600/20 via-orange-500/10 to-amber-500/10",
    badgeBg: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
    borderColor: "hover:border-red-500/50",
  },
  10: {
    icon: Lightbulb,
    gradient: "from-violet-600/20 via-purple-500/10 to-blue-500/10",
    badgeBg: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30",
    borderColor: "hover:border-violet-500/50",
  },
  11: {
    icon: BookOpen,
    gradient: "from-emerald-600/20 via-teal-500/10 to-blue-500/10",
    badgeBg: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    borderColor: "hover:border-emerald-500/50",
  },
  12: {
    icon: Cpu,
    gradient: "from-blue-600/20 via-sky-500/10 to-cyan-500/10",
    badgeBg: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
    borderColor: "hover:border-blue-500/50",
  },
  13: {
    icon: Sparkles,
    gradient: "from-purple-600/20 via-fuchsia-500/10 to-pink-500/10",
    badgeBg: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
    borderColor: "hover:border-purple-500/50",
  },
  14: {
    icon: Trophy,
    gradient: "from-amber-600/20 via-orange-500/10 to-red-500/10",
    badgeBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    borderColor: "hover:border-amber-500/50",
  },
  15: {
    icon: Award,
    gradient: "from-yellow-600/20 via-amber-500/10 to-orange-500/10",
    badgeBg: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 border-yellow-500/30",
    borderColor: "hover:border-yellow-500/50",
  },
};

export default function VacationEventPreviewCards({
  currentActivityTitle = "",
  completedTitles = new Set(),
  onSelectToday,
  onSelectActivity,
}: VacationEventPreviewCardsProps) {
  const [selectedEvent, setSelectedEvent] = useState<PosterActivityTemplate | null>(null);

  const getSubmissionTypeLabel = (type?: string) => {
    switch (type) {
      case "quiz":
        return "🏆 Live Quiz Championship";
      case "project_link":
        return "🔗 Project / Drive Link";
      case "media_upload":
        return "📸 Photo / Media Proof";
      case "text_response":
        return "✍️ Written Solution";
      default:
        return "⚡ Summary & Link";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {POSTER_ACTIVITIES.length} Vacation Games & Competitions
          </h3>
          <p className="text-xs text-muted-foreground">
            Explore exciting challenges, live quizzes, real-world skills, and submission types
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {completedTitles.size} / {POSTER_ACTIVITIES.length} Completed
          </span>
        </div>
      </div>

      {/* Grid of Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {POSTER_ACTIVITIES.map((item) => {
          const theme = EVENT_THEMES[item.order] || EVENT_THEMES[1];
          const IconComponent = theme.icon;
          const isToday =
            Boolean(currentActivityTitle) &&
            (currentActivityTitle.toLowerCase().includes(item.title.toLowerCase()) ||
              item.title.toLowerCase().includes(currentActivityTitle.toLowerCase()));
          const isCompleted = completedTitles.has(item.title.toLowerCase());

          return (
            <Card
              key={item.order}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden group cursor-pointer hover:shadow-md ${
                isToday
                  ? "border-amber-500 ring-2 ring-amber-500/40 shadow-sm bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-background"
                  : isCompleted
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : `border-border/70 hover:border-primary/50 bg-card/60 ${theme.borderColor}`
              }`}
              onClick={() => setSelectedEvent(item)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header: Day Number + Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      Day {item.order}
                    </span>
                    {isToday && (
                      <Badge className="bg-amber-600 text-white font-extrabold text-[10px] px-2 py-0 animate-pulse gap-1">
                        <Flame className="h-3 w-3" /> Active Today!
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </Badge>
                    )}
                  </div>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform bg-gradient-to-br ${theme.gradient}`}
                  >
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-[11px] text-muted-foreground font-semibold line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                  {item.tagline && (
                    <div className="mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                        {item.tagline}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description Snippet */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Submission Type & Skills tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-black bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                    {getSubmissionTypeLabel(item.submissionType)}
                  </span>
                  {item.learningOutcomes.slice(0, 2).map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                  {item.learningOutcomes.length > 2 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{item.learningOutcomes.length - 2} more
                    </span>
                  )}
                </div>

                {/* Action button */}
                <div className="pt-1 flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Eye className="h-3.5 w-3.5" /> Preview Challenge
                  </span>
                  <Button
                    size="sm"
                    variant={isToday ? "default" : "outline"}
                    className={cn(
                      "h-7 text-xs font-bold px-2 py-0.5",
                      isToday
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "text-primary border-primary/20 hover:bg-primary/10"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectActivity) {
                        onSelectActivity(item.title);
                      } else if (onSelectToday) {
                        onSelectToday();
                      }
                    }}
                  >
                    {isCompleted ? "View Submission" : isToday ? "Submit Today →" : "Submit Challenge →"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    Day {selectedEvent.order} of {POSTER_ACTIVITIES.length}
                  </Badge>
                  <span className="text-xs font-black bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full">
                    {getSubmissionTypeLabel(selectedEvent.submissionType)}
                  </span>
                  {selectedEvent.tagline && (
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                      {selectedEvent.tagline}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-black">{selectedEvent.title}</DialogTitle>
                {selectedEvent.subtitle && (
                  <DialogDescription className="font-semibold text-foreground/80">
                    {selectedEvent.subtitle}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Challenge description */}
                <div className="rounded-xl border p-3.5 bg-muted/30 space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" /> Challenge Overview
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Submission Requirement */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">
                    Submission Format:
                  </p>
                  <p className="text-xs text-foreground/90 font-medium">
                    {selectedEvent.submissionPrompt}
                  </p>
                </div>

                {/* What students learn */}
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Skills & Learning Outcomes:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedEvent.learningOutcomes.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg border bg-card/60 text-xs font-medium"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full Instructions */}
                <div className="rounded-xl border p-3.5 bg-card text-xs space-y-2 whitespace-pre-wrap leading-relaxed">
                  <p className="font-black text-muted-foreground uppercase tracking-wider">
                    Full Instructions & Guide:
                  </p>
                  <div>{selectedEvent.instructions.replace(/\[TYPE:[^\]]+\]\n?/g, "")}</div>
                </div>

                {/* Footer action */}
                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEvent(null)}
                    className="font-semibold text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      const title = selectedEvent.title;
                      setSelectedEvent(null);
                      if (onSelectActivity) {
                        onSelectActivity(title);
                      } else if (onSelectToday) {
                        onSelectToday();
                      }
                    }}
                    className="font-bold bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto text-xs"
                  >
                    Submit for this Challenge →
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
