import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Heart, MessageCircle, Flag, X, Volume2, VolumeX,
  Play, Pause, Share2, ChevronUp, ChevronDown, Music2,
  Send, Trash2, Sparkles, Loader2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Post } from "./Community";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReelViewerProps {
  reels: Post[];
  initialIndex: number;
  currentUserId?: string;
  onClose: () => void;
  onLike: (post: Post) => void;
  onComment?: (postId: string) => void;
  onReport: (post: Post) => void;
}

interface InReelComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  author_role?: string;
}

const ReelItem = ({
  reel,
  index,
  isActive,
  isMuted,
  onToggleMute,
  onLike,
  onOpenComments,
  onReport,
  onShare,
}: {
  reel: Post;
  index: number;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onLike: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onReport: (post: Post) => void;
  onShare: (post: Post) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [heartAnimPos, setHeartAnimPos] = useState({ x: 0, y: 0 });
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const lastTapRef = useRef<number>(0);

  // Play / Pause sync with isActive
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = isMuted;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
            })
            .catch(() => {
              setIsPlaying(false);
              setIsLoading(false);
            });
        }
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      setCurrentTime(cur);
      setDuration(dur);
      setProgress((cur / dur) * 100);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 700);
  };

  const handleTouchOrClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected -> Trigger Like
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartAnimPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
      if (!reel.liked) {
        onLike(reel);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap -> play / pause after small timeout
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !duration) return;
    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * duration;
    videoRef.current.currentTime = newTime;
    setProgress(newProgress);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const authorName = reel.author
    ? `${reel.author.first_name || ""} ${reel.author.last_name || ""}`.trim() || reel.author.username || "KV Reader"
    : "KV Reader";
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <div
      data-index={index}
      className="h-screen w-full snap-start relative flex items-center justify-center bg-black select-none overflow-hidden"
    >
      {/* Video element */}
      <div className="relative h-full w-full max-w-[460px] mx-auto flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={reel.media_url}
          className="h-full w-full object-cover sm:rounded-2xl cursor-pointer"
          loop
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onLoadedData={() => setIsLoading(false)}
          onClick={handleTouchOrClick}
        />

        {/* Video Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
            <Loader2 className="h-10 w-10 text-white animate-spin opacity-80" />
          </div>
        )}

        {/* Animated Center Play/Pause Indicator */}
        {showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="h-20 w-20 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white scale-100 animate-in fade-in zoom-in-50 duration-200">
              {isPlaying ? <Play className="h-10 w-10 fill-white" /> : <Pause className="h-10 w-10 fill-white" />}
            </div>
          </div>
        )}

        {/* Double-Tap Popping Heart Animation */}
        {showHeartAnim && (
          <div
            className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
            style={{ left: heartAnimPos.x || "50%", top: heartAnimPos.y || "50%" }}
          >
            <div className="relative">
              <Heart className="h-24 w-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-in zoom-in-50 fade-in duration-300" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-amber-300 animate-spin" />
            </div>
          </div>
        )}

        {/* Top Vignette Gradient */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Bottom Vignette Gradient */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

        {/* Bottom Creator Info & Captions */}
        <div className="absolute bottom-6 left-4 right-18 z-20 space-y-2.5 text-white pr-2">
          {/* Creator Profile row */}
          <div className="flex items-center gap-3">
            <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500">
              <Avatar className="h-10 w-10 border-2 border-black">
                {reel.author?.avatar_url && (
                  <AvatarImage src={reel.author.avatar_url} alt={authorName} className="object-cover" />
                )}
                <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white drop-shadow-md truncate">
                  {authorName}
                </span>
                {reel.author?.role && (
                  <Badge variant="secondary" className="h-4 text-[9px] font-semibold bg-white/20 text-white backdrop-blur-sm border-0 px-1.5 py-0">
                    {reel.author.role}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-white/70 truncate">
                @{reel.author?.username || "user"}
              </p>
            </div>
          </div>

          {/* Title & Caption */}
          <div className="space-y-1">
            <h3 className="font-bold text-base text-white drop-shadow leading-snug line-clamp-2">
              {reel.title}
            </h3>

            {reel.content && (
              <div className="text-xs text-white/90 leading-relaxed">
                <p className={expandedCaption ? "" : "line-clamp-2"}>
                  {reel.content}
                </p>
                {reel.content.length > 70 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCaption(!expandedCaption);
                    }}
                    className="text-[11px] font-bold text-white/80 hover:text-white mt-0.5 underline decoration-dotted"
                  >
                    {expandedCaption ? "show less" : "...more"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Audio Track Marquee */}
          <div className="flex items-center gap-2 text-[11px] text-white/80 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full w-fit max-w-[240px]">
            <Music2 className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="truncate">Original Audio • @{reel.author?.username || "kvsulur"}</span>
          </div>
        </div>

        {/* Right Floating Interaction Sidebar */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col gap-4 items-center">
          {/* Like Button */}
          <div className="flex flex-col items-center gap-1 group">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(reel);
              }}
              className={`h-11 w-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-75 ${
                reel.liked
                  ? "bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                  : "bg-black/40 text-white border border-white/10 hover:bg-black/60"
              }`}
              title="Like"
            >
              <Heart
                className={`h-6 w-6 transition-transform group-hover:scale-110 ${
                  reel.liked ? "fill-rose-500 text-rose-500" : "text-white"
                }`}
              />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow">
              {reel.likes || 0}
            </span>
          </div>

          {/* Comments Button */}
          <div className="flex flex-col items-center gap-1 group">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenComments(reel);
              }}
              className="h-11 w-11 rounded-full flex items-center justify-center bg-black/40 text-white border border-white/10 backdrop-blur-md hover:bg-black/60 transition-all active:scale-75"
              title="Comments"
            >
              <MessageCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow">
              {reel.comment_count || 0}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center gap-1 group">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(reel);
              }}
              className="h-11 w-11 rounded-full flex items-center justify-center bg-black/40 text-white border border-white/10 backdrop-blur-md hover:bg-black/60 transition-all active:scale-75"
              title="Share Reel"
            >
              <Share2 className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
            <span className="text-white text-[10px] font-medium drop-shadow">Share</span>
          </div>

          {/* Mute Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="h-10 w-10 rounded-full flex items-center justify-center bg-black/40 text-white border border-white/10 backdrop-blur-md hover:bg-black/60 transition-all"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          {/* Report Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReport(reel);
            }}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-black/30 text-white/70 border border-white/10 backdrop-blur-md hover:text-white hover:bg-black/60 transition-all"
            title="Report Reel"
          >
            <Flag className="h-4 w-4" />
          </button>
        </div>

        {/* Interactive Progress Bar Scrubber at very bottom */}
        <div className="absolute bottom-1 inset-x-2 z-30 group flex flex-col justify-end">
          <div className="relative h-1 group-hover:h-2.5 transition-all w-full flex items-center">
            {/* Background track */}
            <div className="absolute inset-0 bg-white/30 rounded-full overflow-hidden">
              {/* Active filled track */}
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Range input for seeking */}
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress || 0}
              onChange={handleScrubberChange}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* Time tooltip on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-between text-[9px] text-white/80 px-1 mt-0.5 pointer-events-none">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useBackHandler } from "@/hooks/useBackHandler";

export const ReelViewer = ({
  reels,
  initialIndex,
  currentUserId,
  onClose,
  onLike,
  onComment,
  onReport,
}: ReelViewerProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [commentsList, setCommentsList] = useState<InReelComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Device back button: comments drawer closes first (priority 100), then reel viewer (priority 90)
  useBackHandler({
    enabled: commentsDrawerOpen,
    priority: 100,
    stateName: "reel_comments",
    onBack: () => {
      setCommentsDrawerOpen(false);
      return true;
    },
  });

  useBackHandler({
    enabled: true, // Reel viewer is always an overlay – always active
    priority: 90,
    stateName: "reel_viewer",
    onBack: () => {
      if (commentsDrawerOpen) return false; // Let the higher-priority handler above take it
      onClose();
      return true;
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // Setup intersection observer for snapping and active index tracking
  useEffect(() => {
    const options = {
      root: containerRef.current,
      threshold: 0.6,
    };

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
          setActiveIndex(index);
        }
      });
    }, options);

    const children = containerRef.current?.children;
    if (children) {
      Array.from(children).forEach((child) => observer.current?.observe(child));
    }

    return () => observer.current?.disconnect();
  }, [reels.length]);

  // Scroll to initial index on mount
  useEffect(() => {
    if (containerRef.current) {
      const children = containerRef.current.children;
      if (children[initialIndex]) {
        children[initialIndex].scrollIntoView();
      }
    }
  }, [initialIndex]);

  // Scroll navigation helpers
  const scrollToReel = useCallback((index: number) => {
    if (index < 0 || index >= reels.length) return;
    if (containerRef.current) {
      const children = containerRef.current.children;
      if (children[index]) {
        children[index].scrollIntoView({ behavior: "smooth" });
        setActiveIndex(index);
      }
    }
  }, [reels.length]);

  // Keyboard Navigation Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in comment box
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "Escape":
          if (commentsDrawerOpen) setCommentsDrawerOpen(false);
          else onClose();
          break;
        case "ArrowDown":
        case "j":
        case "J":
          e.preventDefault();
          scrollToReel(activeIndex + 1);
          break;
        case "ArrowUp":
        case "k":
        case "K":
          e.preventDefault();
          scrollToReel(activeIndex - 1);
          break;
        case "m":
        case "M":
          setIsMuted((prev) => !prev);
          break;
        case "l":
        case "L":
          if (reels[activeIndex]) onLike(reels[activeIndex]);
          break;
        case "c":
        case "C":
          if (reels[activeIndex]) handleOpenComments(reels[activeIndex]);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, commentsDrawerOpen, reels, onClose, scrollToReel, onLike]);

  // Handle In-Reel Comments
  const handleOpenComments = async (post: Post) => {
    setActiveCommentPost(post);
    setCommentsDrawerOpen(true);
    setCommentsLoading(true);

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, profiles(first_name, last_name, username, avatar_url, role)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setCommentsList(
        (data || []).map((c: any) => ({
          id: c.id,
          post_id: c.post_id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          author_name: c.profiles
            ? `${c.profiles.first_name || ""} ${c.profiles.last_name || ""}`.trim() || c.profiles.username || "Reader"
            : "Reader",
          author_avatar: c.profiles?.avatar_url,
          author_role: c.profiles?.role,
        }))
      );
    } catch (e) {
      console.error("Error loading comments:", e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeCommentPost) return;

    setSubmittingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || currentUserId;
      if (!uid) {
        throw new Error("You must be logged in to comment on reels.");
      }

      const text = newCommentText.trim();
      const { data: inserted, error: insertErr } = await supabase
        .from("post_comments")
        .insert({
          post_id: activeCommentPost.id,
          user_id: uid,
          content: text,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Load profile info for the author
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, username, avatar_url, role")
        .eq("id", uid)
        .maybeSingle();

      const newC: InReelComment = {
        id: inserted.id,
        post_id: inserted.post_id,
        user_id: inserted.user_id,
        content: inserted.content,
        created_at: inserted.created_at,
        author_name: profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.username || "You"
          : "You",
        author_avatar: profile?.avatar_url,
        author_role: profile?.role,
      };

      setCommentsList((prev) => [...prev, newC]);
      setNewCommentText("");

      // Update comment count on post
      activeCommentPost.comment_count = (activeCommentPost.comment_count || 0) + 1;
      if (onComment) onComment(activeCommentPost.id);
    } catch (err: any) {
      toast({ title: "Failed to post comment", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
      if (error) throw error;
      setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
      if (activeCommentPost) {
        activeCommentPost.comment_count = Math.max(0, (activeCommentPost.comment_count || 1) - 1);
      }
      toast({ title: "Comment deleted" });
    } catch (err: any) {
      toast({ title: "Error deleting comment", description: err.message, variant: "destructive" });
    }
  };

  // Share Reel Handler
  const handleShareReel = (post: Post) => {
    const url = `${window.location.origin}/community?reel=${post.id}`;
    if (navigator.share) {
      navigator
        .share({
          title: post.title || "Check out this Reel on KV Sulur DLMS",
          text: post.content || "Watch this student reel!",
          url: url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied! 📋",
        description: "Reel link copied to clipboard.",
      });
    }
  };

  if (reels.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-6">
        <p className="text-base text-white/70 mb-4">No reels available at the moment.</p>
        <Button variant="outline" className="text-white border-white/20" onClick={onClose}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black flex items-center justify-center">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 inset-x-4 z-50 flex items-center justify-between pointer-events-none max-w-lg mx-auto">
        {/* Reel Counter */}
        <div className="pointer-events-auto bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white/90 flex items-center gap-1.5 shadow-lg">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>{activeIndex + 1} of {reels.length}</span>
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Mute button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/10 backdrop-blur-md shadow-lg"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-5 w-5 text-rose-400" /> : <Volume2 className="h-5 w-5 text-emerald-400" />}
          </Button>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/10 backdrop-blur-md shadow-lg"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Up / Down Arrow Navigation Buttons */}
      <div className="hidden md:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-40">
        <Button
          variant="ghost"
          size="icon"
          disabled={activeIndex === 0}
          className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md disabled:opacity-30"
          onClick={() => scrollToReel(activeIndex - 1)}
          title="Previous Reel (Up Arrow)"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={activeIndex === reels.length - 1}
          className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md disabled:opacity-30"
          onClick={() => scrollToReel(activeIndex + 1)}
          title="Next Reel (Down Arrow)"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Vertical Reel Scroll Container */}
      <div
        ref={containerRef}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {reels.map((reel, index) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            index={index}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onLike={onLike}
            onOpenComments={handleOpenComments}
            onReport={onReport}
            onShare={handleShareReel}
          />
        ))}
      </div>

      {/* In-Reel Comments Drawer / Bottom Sheet */}
      {commentsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl h-[75vh] sm:h-[600px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Comments</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                  {commentsList.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => setCommentsDrawerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {commentsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                  <p className="text-xs text-slate-400">Loading comments...</p>
                </div>
              ) : commentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 space-y-2">
                  <MessageCircle className="h-10 w-10 text-slate-600 stroke-[1.5]" />
                  <p className="text-sm font-medium text-slate-300">No comments yet</p>
                  <p className="text-xs text-slate-500">Be the first to share your thoughts on this reel!</p>
                </div>
              ) : (
                commentsList.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 group">
                    <Avatar className="h-8 w-8 border border-slate-700 shrink-0">
                      {comment.author_avatar && (
                        <AvatarImage src={comment.author_avatar} alt={comment.author_name} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-indigo-700 text-white text-[10px] font-bold">
                        {(comment.author_name || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 bg-slate-800/60 rounded-xl p-3 border border-slate-800">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-white truncate">
                            {comment.author_name}
                          </span>
                          {comment.author_role && (
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 text-indigo-300 border-indigo-500/30">
                              {comment.author_role}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 break-words leading-relaxed">
                        {comment.content}
                      </p>
                    </div>

                    {currentUserId === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Comment Input Box */}
            <form onSubmit={handleSendComment} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
              <Input
                placeholder="Add a friendly comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 rounded-xl text-xs h-10 focus-visible:ring-indigo-500"
                maxLength={300}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newCommentText.trim() || submittingComment}
                className="h-10 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 shrink-0"
              >
                {submittingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">Post</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
