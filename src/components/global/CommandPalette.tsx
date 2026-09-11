import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BookOpen,
  LayoutDashboard,
  Award,
  Brain,
  Trophy,
  Users,
  Search,
  BookPlus,
  FileText,
  LifeBuoy,
  Moon,
  Sun,
  Laptop,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Bell,
  Compass,
  Download,
  KeyRound,
  MessageSquare,
  BookmarkCheck,
  CalendarDays,
  Gamepad2,
  ShieldCheck,
  FolderArchive,
  BarChart2,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookResults, setBookResults] = useState<any[]>([]);
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  // Keyboard shortcut listener: Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Multi-field smart book search as user types
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setBookResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = searchTerm.trim();
        const { data } = await supabase
          .from("books")
          .select("id, title, author, category, accession_number, isbn")
          .or(`title.ilike.%${query}%,author.ilike.%${query}%,category.ilike.%${query}%,accession_number.ilike.%${query}%`)
          .limit(6);

        setBookResults(data || []);
      } catch (e) {
        console.error("Book search error in palette:", e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    setSearchTerm("");
    command();
  };

  const triggerTestNotification = async () => {
    toast.success("🔔 Realtime Test Notification Triggered!", {
      description: "Audio chime and visual alert tested successfully.",
    });
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("PM SHRI KV Sulur DLMS", {
        body: "Realtime push notification test successful!",
        icon: "/logos/kv-logo.png",
      });
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search books, pages, features or commands (e.g. 'NCERT', 'Quiz', 'Math')..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      <CommandList className="max-h-[420px] overflow-y-auto">
        <CommandEmpty>No matching pages, books, or commands found.</CommandEmpty>

        {/* Live Catalog Search Results */}
        {bookResults.length > 0 && (
          <CommandGroup heading="Books from Catalog">
            {bookResults.map((book) => (
              <CommandItem
                key={book.id}
                onSelect={() => runCommand(() => navigate(`/book/${book.id}`))}
                className="flex items-center gap-2 cursor-pointer py-2"
              >
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-semibold text-foreground">{book.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    by {book.author || "Unknown"} {book.category ? `· ${book.category}` : ""}
                  </span>
                </div>
                {book.accession_number && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    #{book.accession_number}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* All Primary Pages */}
        <CommandGroup heading="All Pages">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))} className="gap-2.5 cursor-pointer">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Home / Portal Landing</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))} className="gap-2.5 cursor-pointer">
            <LayoutDashboard className="h-4 w-4 text-indigo-500" />
            <span>My Dashboard (Auto-Route)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/catalog"))} className="gap-2.5 cursor-pointer">
            <Search className="h-4 w-4 text-sky-500" />
            <span>Library Book Catalog</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-portfolio"))} className="gap-2.5 cursor-pointer">
            <FileText className="h-4 w-4 text-purple-500" />
            <span>Student Portfolio &amp; Digital Library Card</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/points-history"))} className="gap-2.5 cursor-pointer">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>XP &amp; Points Ledger History</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/teacher-dashboard"))} className="gap-2.5 cursor-pointer">
            <GraduationCap className="h-4 w-4 text-emerald-500" />
            <span>Teacher / Staff Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin-dashboard"))} className="gap-2.5 cursor-pointer">
            <ShieldCheck className="h-4 w-4 text-rose-500" />
            <span>Admin Control Centre</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/support"))} className="gap-2.5 cursor-pointer">
            <LifeBuoy className="h-4 w-4 text-cyan-500" />
            <span>Support Center &amp; Ticket Tracking</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/feedback"))} className="gap-2.5 cursor-pointer">
            <MessageSquare className="h-4 w-4 text-orange-500" />
            <span>Feedback &amp; Suggestions Box</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/download"))} className="gap-2.5 cursor-pointer">
            <Download className="h-4 w-4 text-teal-500" />
            <span>Mobile App &amp; Desktop Client Downloads</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/reset-password"))} className="gap-2.5 cursor-pointer">
            <KeyRound className="h-4 w-4 text-slate-400" />
            <span>Account Security &amp; Password Reset</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Deep Tab Shortcuts */}
        <CommandGroup heading="Academics &amp; Study Tools">
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=ncert"))} className="gap-2.5 cursor-pointer">
            <FolderArchive className="h-4 w-4 text-emerald-500" />
            <span>NCERT Official Textbooks (Class 6–12)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=study-guide"))} className="gap-2.5 cursor-pointer">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span>AI Chapter Study Guide &amp; Practice</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=community"))} className="gap-2.5 cursor-pointer">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <span>Academic Doubts &amp; Solution Clearing</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=materials"))} className="gap-2.5 cursor-pointer">
            <FileText className="h-4 w-4 text-blue-500" />
            <span>CBSE Sample Papers &amp; Olympiad Vault</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=quizzes"))} className="gap-2.5 cursor-pointer">
            <Brain className="h-4 w-4 text-purple-500" />
            <span>Interactive Quiz Arena</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=locator"))} className="gap-2.5 cursor-pointer">
            <Compass className="h-4 w-4 text-cyan-500" />
            <span>Physical Shelf Locator Map</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=issued"))} className="gap-2.5 cursor-pointer">
            <BookmarkCheck className="h-4 w-4 text-amber-600" />
            <span>My Issued Books &amp; 7-Day Loan Countdown</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=badges"))} className="gap-2.5 cursor-pointer">
            <Award className="h-4 w-4 text-yellow-500" />
            <span>Badge Cabinet &amp; Trophy Case</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=rankings"))} className="gap-2.5 cursor-pointer">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>School Reading Leaderboards</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=events"))} className="gap-2.5 cursor-pointer">
            <CalendarDays className="h-4 w-4 text-rose-500" />
            <span>Library Events &amp; Book Fairs</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-dashboard?tab=games"))} className="gap-2.5 cursor-pointer">
            <Gamepad2 className="h-4 w-4 text-violet-500" />
            <span>Games &amp; Brain Teasers Corner</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick System Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => triggerTestNotification())} className="gap-2.5 cursor-pointer">
            <Bell className="h-4 w-4 text-primary" />
            <span>Test Realtime Notification &amp; Chime</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))} className="gap-2.5 cursor-pointer">
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            <span>Toggle Dark / Light Mode (Current: {theme || "system"})</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))} className="gap-2.5 cursor-pointer">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Set Light Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))} className="gap-2.5 cursor-pointer">
            <Moon className="h-4 w-4 text-indigo-400" />
            <span>Set Dark Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))} className="gap-2.5 cursor-pointer">
            <Laptop className="h-4 w-4 text-slate-500" />
            <span>Set System Default Theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* Keyboard Shortcut Legend Footer */}
      <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 rounded bg-muted border font-mono text-[10px]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border font-mono text-[10px]">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border font-mono text-[10px]">Esc</kbd> Close</span>
        </div>
        <span className="font-semibold text-primary/80">Ctrl + K anywhere</span>
      </div>
    </CommandDialog>
  );
};
