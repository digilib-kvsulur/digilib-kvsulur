import React, { useEffect, useState } from "react";
import { getActiveRotationalCycle, VerifiedRotationalCycle, VerifiedWinnerRecord } from "@/lib/rotationalBadgeService";

// In-memory cache for the active cycle so we don't refetch on every avatar/name render
let cachedCycle: VerifiedRotationalCycle | null = null;
let cacheTime = 0;
let fetchPromise: Promise<VerifiedRotationalCycle | null> | null = null;

async function getCachedActiveCycle(): Promise<VerifiedRotationalCycle | null> {
  const now = Date.now();
  if (cachedCycle && now - cacheTime < 120_000) {
    return cachedCycle;
  }
  if (!fetchPromise) {
    fetchPromise = getActiveRotationalCycle().then((res) => {
      cachedCycle = res;
      cacheTime = Date.now();
      fetchPromise = null;
      return res;
    }).catch(() => {
      fetchPromise = null;
      return null;
    });
  }
  return fetchPromise;
}

interface RotationalWinnerBadgeProps {
  userId?: string | null;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export const RotationalWinnerBadge: React.FC<RotationalWinnerBadgeProps> = ({
  userId,
  size = "xs",
  showLabel = true,
  className = "",
}) => {
  const [winner, setWinner] = useState<VerifiedWinnerRecord | null>(null);
  const [cycleLabel, setCycleLabel] = useState<string>("");

  useEffect(() => {
    if (!userId) {
      setWinner(null);
      return;
    }

    let isMounted = true;
    getCachedActiveCycle().then((cycle) => {
      if (!isMounted || !cycle?.winners) return;
      const match = cycle.winners.find((w) => w.studentId === userId);
      if (match) {
        setWinner(match);
        setCycleLabel(cycle.cycleLabel);
      } else {
        setWinner(null);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!winner) return null;

  const isBLU = winner.badgeType === "best_library_user";
  const title = isBLU
    ? `👑 Best Library User (${winner.scopeValue}) · ${cycleLabel}`
    : `📚 Reader of the Month (${winner.scopeValue}) · ${cycleLabel}`;

  const sizeClasses = size === "xs"
    ? "text-[9px] px-1.5 py-0.5 gap-1 h-4"
    : size === "sm"
    ? "text-[10px] px-2 py-0.5 gap-1.5 h-5"
    : "text-xs px-2.5 py-1 gap-1.5 h-6";

  return (
    <span
      title={title}
      className={`inline-flex items-center font-black rounded-full select-none transition-transform hover:scale-105 shadow-2xs border ${
        isBLU
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
      } ${sizeClasses} ${className}`}
    >
      <span className="leading-none">{isBLU ? "👑" : "📚"}</span>
      {showLabel && (
        <span className="truncate max-w-[130px] font-bold">
          {isBLU ? "Best Library User" : "Reader of Month"}
        </span>
      )}
    </span>
  );
};

export default RotationalWinnerBadge;
