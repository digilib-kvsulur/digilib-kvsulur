import React, { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Post } from "./Community";

interface ReelViewerProps {
  reels: Post[];
  initialIndex: number;
  onClose: () => void;
  onLike: (post: Post) => void;
  onComment: (postId: string) => void;
  onReport: (post: Post) => void;
}

const ReelItem = ({
  reel,
  isActive,
  onLike,
  onComment,
  onReport
}: {
  reel: Post;
  isActive: boolean;
  onLike: (post: Post) => void;
  onComment: (postId: string) => void;
  onReport: (post: Post) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {
          console.log("Auto-play prevented by browser");
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  return (
    <div className="h-screen w-full snap-start relative flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={reel.media_url}
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        preload="metadata"
      />

      {/* Bottom Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6 pb-24">
        <div className="text-white space-y-2 max-w-md">
          <h3 className="font-bold text-lg line-clamp-2">{reel.title}</h3>
          <p className="text-sm opacity-90">
            @{reel.author?.username || "User"}
          </p>
        </div>
      </div>

      {/* Right Interaction Bar */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-10">
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md"
            onClick={() => onLike(reel)}
          >
            <Heart className={`h-6 w-6 ${reel.liked ? "fill-rose-500 text-rose-500" : ""}`} />
          </Button>
          <span className="text-white text-xs font-bold">{reel.likes}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md"
            onClick={() => onComment(reel.id)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <span className="text-white text-xs font-bold">{reel.comment_count}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md"
          onClick={() => onReport(reel)}
        >
          <Flag className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export const ReelViewer = ({
  reels,
  initialIndex,
  onClose,
  onLike,
  onComment,
  onReport
}: ReelViewerProps) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const options = {
      root: containerRef.current,
      threshold: 0.6,
    };

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute("data-index") || "0");
          setActiveIndex(index);
        }
      });
    }, options);

    const children = containerRef.current?.children;
    if (children) {
      Array.from(children).forEach((child) => observer.current?.observe(child));
    }

    return () => observer.current?.disconnect();
  }, []);

  useEffect(() => {
    // Scroll to initial index on mount
    if (containerRef.current) {
      const children = containerRef.current.children;
      if (children[initialIndex]) {
        children[initialIndex].scrollIntoView();
      }
    }
  }, []);

  if (reels.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <p>No reels available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 right-6 z-50 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-md"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

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
            onLike={onLike}
            onComment={onComment}
            onReport={onReport}
          />
        ))}
      </div>
    </div>
  );
};
