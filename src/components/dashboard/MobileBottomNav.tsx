import {
  Home, BookOpen, Search, FileText, Menu, Target, Brain, User,
  BookCheck, Compass, Timer, Award, Medal, CalendarDays, Users,
  StickyNote, LifeBuoy, MessageSquare, Gamepad2, GraduationCap
} from "lucide-react";

type Tab = string;

interface MobileBottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenMenu: () => void;
  onCatalog: () => void;
}

const primaryTabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Home", icon: Home },
  { id: "books", label: "Books", icon: BookOpen },
  { id: "portfolio", label: "Portfolio", icon: FileText },
  { id: "quizzes", label: "Quizzes", icon: Brain },
];

export default function MobileBottomNav({ activeTab, onTabChange, onOpenMenu, onCatalog }: MobileBottomNavProps) {
  const isPrimaryActive = primaryTabs.some((t) => t.id === activeTab);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6 h-16">
        {primaryTabs.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span className="truncate max-w-[56px]">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onCatalog}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground"
        >
          <Search className="h-5 w-5" />
          <span>Catalog</span>
        </button>
        <button
          type="button"
          onClick={onOpenMenu}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
            !isPrimaryActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

export const mobileNavSections: { title: string; items: { id: Tab; label: string; icon: React.ElementType }[] }[] = [
  {
    title: "Reading",
    items: [
      { id: "overview", label: "Overview", icon: Home },
      { id: "portfolio", label: "My Portfolio", icon: FileText },
      { id: "books", label: "Books", icon: BookOpen },
      { id: "issued", label: "Book Issued", icon: BookCheck },
      { id: "locator", label: "Library Map", icon: Compass },
    ],
  },
  {
    title: "Learning",
    items: [
      { id: "materials", label: "Study Materials", icon: GraduationCap },
      { id: "study", label: "Study Tracker", icon: Timer },
      { id: "quizzes", label: "Quizzes", icon: Brain },
      { id: "badges", label: "Badge Cabinet", icon: Award },
      { id: "certificates", label: "Certificates", icon: Award },
      { id: "rankings", label: "Rankings", icon: Medal },
    ],
  },
  {
    title: "Community",
    items: [
      { id: "events", label: "Events", icon: CalendarDays },
      { id: "periodicals", label: "Periodicals", icon: BookOpen },
      { id: "community", label: "Community", icon: Users },
      { id: "games", label: "Games Corner", icon: Gamepad2 },
      { id: "network", label: "Network", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "notes", label: "My Notes", icon: StickyNote },
      { id: "support", label: "Help & Support", icon: LifeBuoy },
      { id: "feedback", label: "Feedback", icon: MessageSquare },
      { id: "profile", label: "Profile", icon: User },
    ],
  },
];
