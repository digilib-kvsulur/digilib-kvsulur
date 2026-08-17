import { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";
import { fetchDevMessageSettings } from "@/lib/librarySettings";

export default function DeveloperMessagePopup() {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("News & Updates");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkSettings = async () => {
      // Don't show if they've dismissed it this session
      const dismissed = sessionStorage.getItem("dev_message_dismissed");
      if (dismissed === "true") return;

      try {
        const settings = await fetchDevMessageSettings();
        if (settings.enable && settings.message.trim()) {
          setTitle(settings.title || "News & Updates");
          setMessage(settings.message);
          setShowModal(true);
        }
      } catch (err) {
        console.error("Failed to load dev message settings", err);
      }
    };
    checkSettings();
  }, []);

  const handleClose = () => {
    sessionStorage.setItem("dev_message_dismissed", "true");
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="glass-card relative w-full max-w-lg p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl space-y-4"
        style={{ border: "1px solid hsl(var(--primary) / 0.45)", background: "hsl(var(--card))" }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div
            className="p-2 rounded-xl"
            style={{
              background: "hsl(var(--primary) / 0.15)",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            <Megaphone className="w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
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
          className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto pr-2"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {message}
        </div>

        {/* CTA */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95 text-primary-foreground bg-primary"
            style={{
              boxShadow: "0 4px 15px hsl(var(--primary) / 0.35)",
            }}
          >
            Got it! 👍
          </button>
        </div>
      </div>
    </div>
  );
}
