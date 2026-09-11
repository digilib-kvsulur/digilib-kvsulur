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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookResults, setBookResults] = useState<{ id: string; title: string; author: string }[]>([]);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  // Keyboard shortcut listener: Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Quick book search as user types
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setBookResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("books")
          .select("id, title, author")
          .ilike("title", `%${searchTerm.trim()}%`)
          .limit(5);

        setBookResults(data || []);
      } catch (e) {
        console.error(e);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command, page, or search books..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      <CommandList className="max-h-[380px] overflow-y-auto">
        <CommandEmpty>No results found.</CommandEmpty>

        {bookResults.length > 0 && (
          <CommandGroup heading="Books from Catalog">
            {bookResults.map((book) => (
              <CommandItem
                key={book.id}
                onSelect={() => runCommand(() => navigate(`/book/${book.id}`))}
                className="flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-medium text-foreground">{book.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">by {book.author}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Quick Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))} className="gap-2 cursor-pointer">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            <span>My Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/catalog"))} className="gap-2 cursor-pointer">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Book Catalog</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/student-portfolio"))} className="gap-2 cursor-pointer">
            <FileText className="h-4 w-4 text-primary" />
            <span>Student Portfolio &amp; Library Card</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/support"))} className="gap-2 cursor-pointer">
            <LifeBuoy className="h-4 w-4 text-primary" />
            <span>Help &amp; Support Tickets</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Library Features">
          <CommandItem onSelect={() => runCommand(() => navigate("/catalog?q=fiction"))} className="gap-2 cursor-pointer">
            <Search className="h-4 w-4 text-indigo-500" />
            <span>Explore Fiction &amp; Stories</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/catalog?view=map"))} className="gap-2 cursor-pointer">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Physical Shelf Locator Map</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme Preferences">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))} className="gap-2 cursor-pointer">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Light Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))} className="gap-2 cursor-pointer">
            <Moon className="h-4 w-4 text-indigo-400" />
            <span>Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))} className="gap-2 cursor-pointer">
            <Laptop className="h-4 w-4 text-slate-500" />
            <span>System Default</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
