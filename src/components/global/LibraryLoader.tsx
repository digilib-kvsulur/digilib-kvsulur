import React, { useEffect, useState } from "react";
import { BookOpen, Sparkles, Bookmark } from "lucide-react";

interface LibraryLoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

const DEFAULT_MESSAGES = [
  "Opening the digital library stacks...",
  "Turning to your favorite page...",
  "Arranging knowledge on the shelves...",
  "Retrieving volumes from PM SHRI KV Sulur...",
  "Every great journey begins with a book...",
  "Dusting off rare editions...",
];

export const LibraryLoader: React.FC<LibraryLoaderProps> = ({
  message,
  subMessage,
  fullScreen = true,
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [message]);

  const activeMessage = message || DEFAULT_MESSAGES[currentMessageIndex];

  const content = (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none max-w-sm sm:max-w-md mx-auto">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1s]" />

      {/* Cool 3D Library Book Animation */}
      <div className="relative w-28 h-24 mb-6 perspective-[600px] flex items-center justify-center">
        {/* Soft shadow under the book */}
        <div className="absolute -bottom-2 w-24 h-4 bg-black/15 dark:bg-black/40 rounded-full blur-md animate-pulse" />

        {/* The Open Book */}
        <div className="relative w-24 h-16 flex justify-center items-center">
          {/* Left Book Cover / Backing */}
          <div className="absolute left-0 w-12 h-16 bg-gradient-to-br from-indigo-700 to-indigo-900 dark:from-indigo-600 dark:to-indigo-950 rounded-l-md shadow-lg border-l-2 border-indigo-400/40 origin-right transform -rotate-y-[20deg]" />

          {/* Right Book Cover / Backing */}
          <div className="absolute right-0 w-12 h-16 bg-gradient-to-bl from-indigo-700 to-indigo-900 dark:from-indigo-600 dark:to-indigo-950 rounded-r-md shadow-lg border-r-2 border-indigo-400/40 origin-left transform rotate-y-[20deg]" />

          {/* Left Static Page */}
          <div className="absolute left-0.5 w-11 h-14 bg-gradient-to-r from-amber-50 to-stone-100 dark:from-slate-800 dark:to-slate-700 rounded-l-sm shadow-sm flex flex-col justify-around py-2 px-1.5 opacity-95">
            <div className="h-1 w-full bg-slate-300/70 dark:bg-slate-600 rounded-full" />
            <div className="h-1 w-3/4 bg-slate-300/70 dark:bg-slate-600 rounded-full" />
            <div className="h-1 w-5/6 bg-slate-300/70 dark:bg-slate-600 rounded-full" />
          </div>

          {/* Right Static Page */}
          <div className="absolute right-0.5 w-11 h-14 bg-gradient-to-l from-amber-50 to-stone-100 dark:from-slate-800 dark:to-slate-700 rounded-r-sm shadow-sm flex flex-col justify-around py-2 px-1.5 opacity-95">
            <div className="h-1 w-full bg-slate-300/70 dark:bg-slate-600 rounded-full" />
            <div className="h-1 w-4/5 bg-slate-300/70 dark:bg-slate-600 rounded-full" />
            <div className="h-1 w-2/3 bg-slate-300/70 dark:bg-slate-600 rounded-full" />
          </div>

          {/* Animated Flipping Pages (3 pages in sequence) */}
          <div className="absolute right-0.5 w-11 h-14 origin-left rounded-r-sm bg-gradient-to-l from-amber-50 via-white to-amber-100 dark:from-slate-700 dark:to-slate-800 border-r border-indigo-200/40 shadow-md book-flip-1 flex flex-col justify-around py-2 px-1.5">
            <div className="h-1 w-full bg-indigo-300/60 dark:bg-indigo-500/40 rounded-full" />
            <div className="h-1 w-3/4 bg-indigo-300/60 dark:bg-indigo-500/40 rounded-full" />
            <div className="h-1 w-5/6 bg-indigo-300/60 dark:bg-indigo-500/40 rounded-full" />
          </div>

          <div className="absolute right-0.5 w-11 h-14 origin-left rounded-r-sm bg-gradient-to-l from-amber-50 via-white to-amber-100 dark:from-slate-700 dark:to-slate-800 border-r border-indigo-200/40 shadow-md book-flip-2 flex flex-col justify-around py-2 px-1.5">
            <div className="h-1 w-5/6 bg-indigo-300/60 dark:bg-indigo-500/40 rounded-full" />
            <div className="h-1 w-full bg-indigo-300/60 dark:bg-indigo-500/40 rounded-full" />
            <div className="h-1 w-2/3 bg-indigo-300/60 dark:bg-indigo-500/40 rounded-full" />
          </div>

          {/* Golden Ribbon Bookmark in Center Spine */}
          <div className="absolute -top-1 w-1.5 h-16 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-b shadow-sm z-20" />
        </div>

        {/* Floating Sparkle Glyphs */}
        <Sparkles className="absolute -top-2 -right-1 w-4 h-4 text-amber-500 animate-bounce [animation-duration:2.5s]" />
        <BookOpen className="absolute -bottom-1 -left-2 w-3.5 h-3.5 text-primary/70 animate-pulse [animation-duration:2s]" />
      </div>

      {/* School Library Crest & Title */}
      <div className="flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase">
        <Bookmark className="w-3.5 h-3.5" />
        <span>PM SHRI KV SULUR DLMS</span>
      </div>

      {/* Dynamic Status / Quote */}
      <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight min-h-[1.75rem] transition-all duration-300 ease-in-out">
        {activeMessage}
      </h3>

      {/* Subtitle / Microcopy */}
      <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
        {subMessage || "Empowering students through the universe of books & knowledge"}
      </p>

      {/* Modern Library Bookmark Shimmer Progress Bar */}
      <div className="w-48 sm:w-56 h-1.5 bg-muted rounded-full mt-5 overflow-hidden relative">
        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-primary via-indigo-500 to-amber-400 rounded-full library-progress-slide" />
      </div>

      {/* Scoped CSS for the flipping pages and bookmark slider */}
      <style>{`
        @keyframes bookPageFlip {
          0% {
            transform: rotateY(0deg);
            opacity: 1;
          }
          50% {
            transform: rotateY(-90deg) scaleX(0.85);
            opacity: 0.9;
          }
          100% {
            transform: rotateY(-180deg);
            opacity: 0;
          }
        }

        .book-flip-1 {
          animation: bookPageFlip 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-style: preserve-3d;
        }

        .book-flip-2 {
          animation: bookPageFlip 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite 0.6s;
          transform-style: preserve-3d;
        }

        @keyframes libraryProgress {
          0% {
            left: -35%;
          }
          100% {
            left: 100%;
          }
        }

        .library-progress-slide {
          animation: libraryProgress 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-16 flex items-center justify-center animate-in fade-in duration-300">
      {content}
    </div>
  );
};

export default LibraryLoader;
