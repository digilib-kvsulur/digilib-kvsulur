import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, Award, Calendar, MapPin, Sparkles, CheckCircle, 
  Printer, BookOpen, Star, Trophy, HeartHandshake
} from "lucide-react";
import { 
  getStudentRotationalAwardInfo, 
  acknowledgeStudentRotationalAward, 
  VerifiedWinnerRecord, 
  VerifiedRotationalCycle 
} from "@/lib/rotationalBadgeService";

interface RotationalBadgeWinningPopupProps {
  userId?: string;
}

export const RotationalBadgeWinningPopup: React.FC<RotationalBadgeWinningPopupProps> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [winner, setWinner] = useState<VerifiedWinnerRecord | null>(null);
  const [cycle, setCycle] = useState<VerifiedRotationalCycle | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const checkAward = async () => {
      try {
        const info = await getStudentRotationalAwardInfo(userId);
        if (info.isWinner && !info.hasAcknowledged && info.winnerRecord && info.cycle) {
          setWinner(info.winnerRecord);
          setCycle(info.cycle);
          setOpen(true);
        }
      } catch (err) {
        console.error("Error loading rotational award popup:", err);
      }
    };

    checkAward();
  }, [userId]);

  if (!winner || !cycle) return null;

  const isClassAward = winner.badgeType === "best_library_user";
  const formattedCollectionDate = new Date(cycle.settings.collectionDate).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const handleAcknowledge = async () => {
    if (!userId || !cycle) return;
    setAcknowledging(true);
    try {
      await acknowledgeStudentRotationalAward(userId, cycle.cycleId);
      setOpen(false);
    } catch (err) {
      console.error(err);
      setOpen(false);
    } finally {
      setAcknowledging(false);
    }
  };

  const handlePrintSlip = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Award Claim Pass - ${winner.studentName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          .pass-box { border: 3px double #3b82f6; border-radius: 12px; padding: 24px; max-width: 550px; margin: 0 auto; text-align: center; }
          .title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 16px; }
          .badge-banner { background: ${isClassAward ? "#fef3c7" : "#e0e7ff"}; border: 1px solid ${isClassAward ? "#f59e0b" : "#6366f1"}; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
          .badge-name { font-size: 20px; font-weight: 900; color: ${isClassAward ? "#b45309" : "#3730a3"}; text-transform: uppercase; }
          .student-name { font-size: 22px; font-weight: 800; color: #0f172a; margin: 12px 0 4px; }
          .details { font-size: 13px; color: #475569; margin-bottom: 16px; }
          .collection-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 14px; margin-top: 16px; text-align: left; }
          .collection-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .collection-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
          .stamp-row { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="pass-box">
          <div class="title">PM SHRI KENDRIYA VIDYALAYA AFS SULUR</div>
          <div class="sub">DIGITAL LIBRARY MANAGEMENT SYSTEM · BADGE CLAIM PASS</div>
          <div class="badge-banner">
            <div class="badge-name">${isClassAward ? "👑 BEST LIBRARY USER" : "📚 READER OF THE MONTH"}</div>
            <div style="font-size: 12px; font-weight: 700; margin-top: 4px;">For ${winner.scopeValue} · ${cycle.cycleLabel}</div>
          </div>
          <div class="student-name">${winner.studentName}</div>
          <div class="details">Class &amp; Section: <strong>${winner.studentClass}</strong> | Admission No: <strong>${winner.admissionNumber}</strong></div>
          <div class="details">Total Score: <strong>${winner.compositeScore}</strong> (${winner.points} XP · ${winner.booksIssuedCount} Books Borrowed)</div>

          <div class="collection-box">
            <div class="collection-label">📅 Badge Collection Date</div>
            <div class="collection-val">${formattedCollectionDate}</div>
            <div class="collection-label">📍 Collection Location</div>
            <div class="collection-val">${cycle.settings.collectionVenue}</div>
            <div class="collection-label">📝 Instructions</div>
            <div style="font-size: 12px; color: #334155;">${cycle.settings.librarianNote}</div>
          </div>

          <div class="stamp-row">
            <div>
              <p>_______________________</p>
              <p>Student Signature</p>
            </div>
            <div>
              <p>_______________________</p>
              <p>Librarian Signature &amp; Seal</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleAcknowledge()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-2 border-amber-500/40 shadow-2xl rounded-2xl">
        {/* Top Celebratory Header */}
        <div className={`p-6 text-center text-white relative overflow-hidden ${
          isClassAward
            ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700"
            : "bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"
        }`}>
          {/* Subtle star particle shapes */}
          <div className="absolute top-2 left-4 text-white/30 animate-pulse text-xs">✨</div>
          <div className="absolute top-3 right-5 text-white/40 animate-pulse text-sm">⭐</div>
          <div className="absolute bottom-2 left-6 text-white/20 text-xs">🌟</div>
          <div className="absolute bottom-3 right-6 text-white/30 text-xs">✨</div>

          {/* Badge Icon Emblem */}
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center mx-auto shadow-lg mb-3">
            {isClassAward ? (
              <Crown className="h-9 w-9 text-amber-100 fill-amber-200" />
            ) : (
              <Award className="h-9 w-9 text-indigo-100 fill-indigo-200" />
            )}
          </div>

          <Badge className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] font-black uppercase tracking-wider mb-2">
            Rotational Badge Winner · {cycle.cycleLabel}
          </Badge>

          <h2 className="text-2xl font-black tracking-tight leading-snug">
            {isClassAward ? "👑 Best Library User" : "📚 Reader of the Month"}
          </h2>

          <p className="text-xs text-white/90 font-medium mt-1">
            Official Rotational Award for <strong>{winner.scopeValue}</strong>
          </p>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 bg-background">
          {/* Student Name and Achievement Metrics */}
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Congratulations
            </p>
            <h3 className="text-xl font-black text-foreground">
              {winner.studentName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Class {winner.studentClass} · Admission No: <span className="font-mono text-foreground font-semibold">{winner.admissionNumber}</span>
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="p-2 rounded-xl bg-muted/60 text-center">
                <span className="text-[10px] text-muted-foreground block font-semibold">Points (XP)</span>
                <span className="text-sm font-black text-primary">{winner.points}</span>
              </div>
              <div className="p-2 rounded-xl bg-muted/60 text-center">
                <span className="text-[10px] text-muted-foreground block font-semibold">Books Issued</span>
                <span className="text-sm font-black text-foreground">{winner.booksIssuedCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-muted/60 text-center">
                <span className="text-[10px] text-muted-foreground block font-semibold">Total Score</span>
                <span className="text-sm font-black text-emerald-600">{winner.compositeScore}</span>
              </div>
            </div>
          </div>

          {/* Collection Date Callout Box (Crucial User Requirement) */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Date of Collecting Physical Badge
                </p>
                <p className="text-sm font-black text-primary leading-tight mt-0.5">
                  {formattedCollectionDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-primary/15">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">
                  Collection Venue
                </p>
                <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                  {cycle.settings.collectionVenue}
                </p>
              </div>
            </div>

            {cycle.settings.librarianNote && (
              <div className="pt-1 text-[11px] text-muted-foreground italic border-t border-primary/15">
                &ldquo;{cycle.settings.librarianNote}&rdquo;
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-md"
              onClick={handleAcknowledge}
              disabled={acknowledging}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {acknowledging ? "Acknowledging..." : "Acknowledge & Collect Badge"}
            </Button>

            <Button
              variant="outline"
              className="w-full text-xs font-semibold h-9"
              onClick={handlePrintSlip}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Print / Save Winner Slip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RotationalBadgeWinningPopup;
