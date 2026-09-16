import { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";
import { fetchDevMessageSettings, fetchGlobalNewsColor } from "@/lib/librarySettings";

const THEMES: Record<string, {
  border: string;
  badgeBg: string;
  badgeBorder: string;
  iconColor: string;
  btnBg: string;
  btnText: string;
  btnShadow: string;
  linkBorder: string;
  linkText: string;
  topGlow: string;
}> = {
  blue: {
    border: "border-blue-500/50",
    badgeBg: "bg-blue-500/15",
    badgeBorder: "border-blue-500/30",
    iconColor: "text-blue-500",
    btnBg: "bg-blue-600 hover:bg-blue-700",
    btnText: "text-white",
    btnShadow: "0 4px 15px rgba(37, 99, 235, 0.35)",
    linkBorder: "border-blue-500",
    linkText: "text-blue-600 dark:text-blue-400",
    topGlow: "from-blue-500/30 via-blue-500/10 to-transparent",
  },
  amber: {
    border: "border-amber-500/50",
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-500/30",
    iconColor: "text-amber-500",
    btnBg: "bg-amber-600 hover:bg-amber-700",
    btnText: "text-white",
    btnShadow: "0 4px 15px rgba(217, 119, 6, 0.35)",
    linkBorder: "border-amber-500",
    linkText: "text-amber-600 dark:text-amber-400",
    topGlow: "from-amber-500/30 via-amber-500/10 to-transparent",
  },
  emerald: {
    border: "border-emerald-500/50",
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/30",
    iconColor: "text-emerald-500",
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
    btnText: "text-white",
    btnShadow: "0 4px 15px rgba(5, 150, 105, 0.35)",
    linkBorder: "border-emerald-500",
    linkText: "text-emerald-600 dark:text-emerald-400",
    topGlow: "from-emerald-500/30 via-emerald-500/10 to-transparent",
  },
  purple: {
    border: "border-purple-500/50",
    badgeBg: "bg-purple-500/15",
    badgeBorder: "border-purple-500/30",
    iconColor: "text-purple-500",
    btnBg: "bg-purple-600 hover:bg-purple-700",
    btnText: "text-white",
    btnShadow: "0 4px 15px rgba(147, 51, 234, 0.35)",
    linkBorder: "border-purple-500",
    linkText: "text-purple-600 dark:text-purple-400",
    topGlow: "from-purple-500/30 via-purple-500/10 to-transparent",
  },
  rose: {
    border: "border-rose-500/50",
    badgeBg: "bg-rose-500/15",
    badgeBorder: "border-rose-500/30",
    iconColor: "text-rose-500",
    btnBg: "bg-rose-600 hover:bg-rose-700",
    btnText: "text-white",
    btnShadow: "0 4px 15px rgba(225, 29, 72, 0.35)",
    linkBorder: "border-rose-500",
    linkText: "text-rose-600 dark:text-rose-400",
    topGlow: "from-rose-500/30 via-rose-500/10 to-transparent",
  },
};

export default function DeveloperMessagePopup() {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("News & Updates");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [colorTheme, setColorTheme] = useState("blue");

  useEffect(() => {
    const checkSettings = async () => {
      // Don't show if they've dismissed it this session
      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          const dismissed = window.sessionStorage.getItem("dev_message_dismissed");
          if (dismissed === "true") return;
        }
      } catch (_) {}

      try {
        const [settings, color] = await Promise.all([
          fetchDevMessageSettings(),
          fetchGlobalNewsColor(),
        ]);
        if (color) setColorTheme(color.toLowerCase());
        if (settings.enable && settings.message.trim()) {
          setTitle(settings.title || "News & Updates");
          setMessage(settings.message);
          setLinkUrl(settings.linkUrl || "");
          setLinkText(settings.linkText || "Learn More");
          setImageUrl(settings.imageUrl || "");
          setShowModal(true);
        }
      } catch (err) {
        console.error("Failed to load dev message settings", err);
      }
    };
    checkSettings();
  }, []);

  const handleClose = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem("dev_message_dismissed", "true");
      }
    } catch (err) {
      console.warn("Could not save dismissal to sessionStorage:", err);
    }
    setShowModal(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (showModal) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [showModal]);

  const theme = THEMES[colorTheme] || THEMES.blue;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(8px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose(e);
      }}
    >
      <div
        className={`glass-card relative w-full max-w-lg p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl space-y-4 overflow-hidden border ${theme.border}`}
        style={{ background: "hsl(var(--card))" }}
      >
        {/* Top accent glow line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.topGlow}`} />

        {/* Banner Image if present */}
        {imageUrl && (
          <div className="-mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-4 overflow-hidden rounded-t-2xl sm:rounded-t-3xl max-h-56 bg-muted">
            <img src={imageUrl} alt="Global News" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => handleClose(e)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-background/80 backdrop-blur-md hover:bg-muted transition-colors shadow-xs z-20 cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className={`p-2 rounded-xl border ${theme.badgeBg} ${theme.badgeBorder}`}>
            <Megaphone className={`w-6 h-6 ${theme.iconColor}`} />
          </div>
          <h2
            className="text-lg sm:text-xl font-bold leading-tight"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {title}
          </h2>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid hsl(var(--border))" }} />

        {/* Body */}
        <div
          className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-h-[40vh] overflow-y-auto pr-2"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {message}
        </div>

        {/* CTA */}
        <div className="flex justify-end gap-3 pt-2">
          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95 border ${theme.linkBorder} ${theme.linkText}`}
            >
              {linkText}
            </a>
          )}
          <button
            type="button"
            onClick={(e) => handleClose(e)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${theme.btnBg} ${theme.btnText}`}
            style={{
              boxShadow: theme.btnShadow,
            }}
          >
            Got it! 👍
          </button>
        </div>
      </div>
    </div>
  );
}
