import React, { useEffect, useState, useMemo } from "react";
import { BookOpen, Sparkles, Bookmark } from "lucide-react";
import { useGlobalLoader } from "@/lib/loadingManager";

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

/**
 * Memoized Visual Artwork (Book 3D Flip + Shimmer Progress Bar).
 * Taking 0 props ensures React NEVER re-renders or resets the CSS animations
 * when the status message or subMessage text changes!
 */
const LibraryLoaderArtwork = React.memo(() => {
  return (
    <>
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

          {/* Animated Flipping Pages (Keyframes defined in index.css) */}
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
      <div className="flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase">
        <Bookmark className="w-3.5 h-3.5" />
        <span>PM SHRI KV SULUR DLMS</span>
      </div>
    </>
  );
});

LibraryLoaderArtwork.displayName = "LibraryLoaderArtwork";

/**
 * Memoized Progress Bar Track.
 * Running independently in CSS without resetting when text changes.
 */
const LibraryLoaderProgressBar = React.memo(() => {
  return (
    <div className="w-48 sm:w-56 h-1.5 bg-muted rounded-full mt-5 overflow-hidden relative">
      <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-primary via-indigo-500 to-amber-400 rounded-full library-progress-slide" />
    </div>
  );
});

LibraryLoaderProgressBar.displayName = "LibraryLoaderProgressBar";

export const LibraryLoader: React.FC<LibraryLoaderProps> = ({
  message,
  subMessage,
  fullScreen = true,
}) => {
  const [internalMessageIndex, setInternalMessageIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setInternalMessageIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [message]);

  const activeMessage = message || DEFAULT_MESSAGES[internalMessageIndex];
  const activeSubMessage = subMessage || "Empowering students through the universe of books & knowledge";

  const content = (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none max-w-sm sm:max-w-md mx-auto">
      {/* 1. Memoized visuals - Never re-renders on text changes */}
      <LibraryLoaderArtwork />

      {/* 2. Isolated Text Container - Only this portion morphs when message updates */}
      <div className="min-h-[3.25rem] flex flex-col items-center justify-center transition-all duration-200">
        <h3
          key={activeMessage}
          className="text-base sm:text-lg font-semibold text-foreground tracking-tight animate-in fade-in duration-300"
        >
          {activeMessage}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
          {activeSubMessage}
        </p>
      </div>

      {/* 3. Memoized progress bar - Never resets on text changes */}
      <LibraryLoaderProgressBar />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-16 flex items-center justify-center">
      {content}
    </div>
  );
};

/**
 * Global Persistent Overlay mounted once at root of App.tsx.
 * Stays mounted permanently in the DOM; when status messages update,
 * only the text changes, preserving uninterrupted animations and progress bar.
 */
export const GlobalLibraryLoaderOverlay: React.FC = () => {
  const { isLoading, message, subMessage } = useGlobalLoader();
  const [renderDom, setRenderDom] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setRenderDom(true);
    } else {
      const timer = setTimeout(() => setRenderDom(false), 320);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!renderDom) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-background/95 backdrop-blur-md flex items-center justify-center transition-opacity duration-300 ease-out ${
        isLoading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative flex flex-col items-center justify-center p-6 text-center select-none max-w-sm sm:max-w-md mx-auto">
        <LibraryLoaderArtwork />
        <div className="min-h-[3.25rem] flex flex-col items-center justify-center transition-all duration-200">
          <h3
            key={message}
            className="text-base sm:text-lg font-semibold text-foreground tracking-tight animate-in fade-in duration-300"
          >
            {message}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            {subMessage || "Empowering students through the universe of books & knowledge"}
          </p>
        </div>
        <LibraryLoaderProgressBar />
      </div>
    </div>
  );
};

export default LibraryLoader;
