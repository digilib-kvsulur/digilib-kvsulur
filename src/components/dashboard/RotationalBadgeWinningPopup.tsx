import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, Award, Calendar, MapPin, Sparkles, CheckCircle, 
  Printer, BookOpen, Star, Trophy, HeartHandshake, X, FileText, Download
} from "lucide-react";
import { 
  getStudentRotationalAwardInfo, 
  acknowledgeStudentRotationalAward, 
  VerifiedWinnerRecord, 
  VerifiedRotationalCycle 
} from "@/lib/rotationalBadgeService";
import { 
  getStudentEventWinnersInfo, 
  acknowledgeStudentEventWinner, 
  EventWinnerRecord 
} from "@/lib/eventWinnersService";

interface RotationalBadgeWinningPopupProps {
  userId?: string;
}

export const RotationalBadgeWinningPopup: React.FC<RotationalBadgeWinningPopupProps> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [awardType, setAwardType] = useState<"rotational" | "event" | null>(null);

  // Rotational state
  const [rotationalWinner, setRotationalWinner] = useState<VerifiedWinnerRecord | null>(null);
  const [rotationalCycle, setRotationalCycle] = useState<VerifiedRotationalCycle | null>(null);

  // Event winner state
  const [eventWinner, setEventWinner] = useState<EventWinnerRecord | null>(null);

  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const checkAwards = async () => {
      try {
        // 1. Check Rotational Badge Awards
        const rotInfo = await getStudentRotationalAwardInfo(userId);
        if (rotInfo.isWinner && !rotInfo.hasAcknowledged && rotInfo.winnerRecord && rotInfo.cycle) {
          setRotationalWinner(rotInfo.winnerRecord);
          setRotationalCycle(rotInfo.cycle);
          setAwardType("rotational");
          setOpen(true);
          return;
        }

        // 2. Check Other Event Winners
        const evtInfo = await getStudentEventWinnersInfo(userId);
        if (evtInfo.hasUnacknowledged && evtInfo.unacknowledgedWinner) {
          setEventWinner(evtInfo.unacknowledgedWinner);
          setAwardType("event");
          setOpen(true);
          return;
        }
      } catch (err) {
        console.error("Error loading winning popup:", err);
      }
    };

    checkAwards();
  }, [userId]);

  if (!open || !awardType) return null;

  const handleAcknowledge = async () => {
    if (!userId) return;
    setAcknowledging(true);
    try {
      if (awardType === "rotational" && rotationalCycle) {
        await acknowledgeStudentRotationalAward(userId, rotationalCycle.cycleId);
      } else if (awardType === "event" && eventWinner) {
        await acknowledgeStudentEventWinner(userId, eventWinner.id, eventWinner.eventId);
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
      setOpen(false);
    } finally {
      setAcknowledging(false);
    }
  };

  // --- Rotational Render Data ---
  const isClassAward = rotationalWinner?.badgeType === "best_library_user";
  const rotCollectionDate = rotationalCycle?.settings?.collectionDate
    ? new Date(rotationalCycle.settings.collectionDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Collection Date TBA";

  // --- Event Winner Render Data ---
  const evtCollectionDate = eventWinner?.collectionDate
    ? new Date(eventWinner.collectionDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Collection Date TBA";

  const handlePrintSlip = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const studentName = awardType === "rotational" ? rotationalWinner?.studentName : eventWinner?.studentName;
    const title = awardType === "rotational"
      ? (isClassAward ? "👑 BEST LIBRARY USER" : "📚 READER OF THE MONTH")
      : (eventWinner?.positionTitle || "🏆 EVENT WINNER");
    const scope = awardType === "rotational" ? rotationalWinner?.scopeValue : eventWinner?.eventTitle;
    const cycleOrEvent = awardType === "rotational" ? rotationalCycle?.cycleLabel : eventWinner?.eventTitle;
    const stdClass = awardType === "rotational" ? rotationalWinner?.studentClass : eventWinner?.studentClass;
    const admnNo = awardType === "rotational" ? rotationalWinner?.admissionNumber : eventWinner?.admissionNumber;
    const dateStr = awardType === "rotational" ? rotCollectionDate : evtCollectionDate;
    const venueStr = awardType === "rotational"
      ? rotationalCycle?.settings?.collectionVenue
      : (eventWinner?.collectionVenue || "Central Library Counter");
    const noteStr = awardType === "rotational"
      ? rotationalCycle?.settings?.librarianNote
      : (eventWinner?.librarianNote || "Bring your student ID card.");

    printWindow.document.write(`
      <html>
      <head>
        <title>Award Claim Pass - ${studentName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          .pass-box { border: 3px double #f59e0b; border-radius: 12px; padding: 24px; max-width: 550px; margin: 0 auto; text-align: center; }
          .title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #b45309; }
          .sub { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 16px; }
          .badge-banner { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
          .badge-name { font-size: 20px; font-weight: 900; color: #b45309; text-transform: uppercase; }
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
          <div class="sub">DIGITAL LIBRARY MANAGEMENT SYSTEM · OFFICIAL AWARD CLAIM PASS</div>
          <div class="badge-banner">
            <div class="badge-name">${title}</div>
            <div style="font-size: 12px; font-weight: 700; margin-top: 4px;">${scope} · ${cycleOrEvent}</div>
          </div>
          <div class="student-name">${studentName}</div>
          <div class="details">Class &amp; Section: <strong>${stdClass}</strong> | Admission No: <strong>${admnNo}</strong></div>

          <div class="collection-box">
            <div class="collection-label">📅 Physical Certificate &amp; Trophy Collection Date</div>
            <div class="collection-val">${dateStr}</div>
            <div class="collection-label">📍 Collection Location</div>
            <div class="collection-val">${venueStr}</div>
            <div class="collection-label">📝 Instructions</div>
            <div style="font-size: 12px; color: #334155;">${noteStr}</div>
          </div>

          <div class="stamp-row">
            <div>
              <p>_______________________</p>
              <p>Student Library Committee</p>
            </div>
            <div>
              <p>_______________________</p>
              <p>Librarian Signature</p>
            </div>
            <div>
              <p>_______________________</p>
              <p>Principal Signature</p>
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
      <DialogContent className="w-[94vw] max-w-md max-h-[90vh] overflow-y-auto p-0 border-2 border-amber-500/40 shadow-2xl rounded-2xl sm:rounded-3xl focus:outline-none [&>button.absolute]:hidden">
        {/* Top Celebratory Header */}
        <div className={`p-5 sm:p-6 text-center text-white relative overflow-hidden ${
          awardType === "rotational"
            ? (isClassAward ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700" : "bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700")
            : "bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600"
        }`}>
          {/* Subtle star particle shapes */}
          <div className="absolute top-2 left-4 text-white/30 animate-pulse text-xs">✨</div>
          <div className="absolute top-3 right-10 text-white/40 animate-pulse text-sm">⭐</div>
          <div className="absolute bottom-2 left-6 text-white/20 text-xs">🌟</div>
          <div className="absolute bottom-3 right-6 text-white/30 text-xs">✨</div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleAcknowledge}
            className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/25 hover:bg-black/45 text-white/90 flex items-center justify-center backdrop-blur-xs transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Emblem Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center mx-auto shadow-lg mb-2 sm:mb-3">
            {awardType === "rotational" ? (
              isClassAward ? (
                <Crown className="h-8 w-8 sm:h-9 sm:w-9 text-amber-100 fill-amber-200" />
              ) : (
                <Award className="h-8 w-8 sm:h-9 sm:w-9 text-indigo-100 fill-indigo-200" />
              )
            ) : (
              <Trophy className="h-8 w-8 sm:h-9 sm:w-9 text-amber-100 fill-amber-200" />
            )}
          </div>

          <Badge className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-2">
            {awardType === "rotational" ? `Rotational Winner · ${rotationalCycle?.cycleLabel}` : `Event Winner · ${eventWinner?.eventTitle}`}
          </Badge>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            {awardType === "rotational"
              ? (isClassAward ? "👑 Best Library User" : "📚 Reader of the Month")
              : (eventWinner?.positionTitle || "🏆 Event Winner")}
          </h2>

          <p className="text-xs sm:text-sm text-white/95 font-medium mt-1">
            {awardType === "rotational"
              ? `Official Rotational Award for ${rotationalWinner?.scopeValue}`
              : `Event: ${eventWinner?.eventTitle}`}
          </p>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 bg-background">
          {/* Student Name */}
          <div className="text-center space-y-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Congratulations
            </p>
            <h3 className="text-lg sm:text-xl font-black text-foreground break-words">
              {awardType === "rotational" ? rotationalWinner?.studentName : eventWinner?.studentName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Class {awardType === "rotational" ? rotationalWinner?.studentClass : eventWinner?.studentClass} · Admission No: <span className="font-mono text-foreground font-semibold">{awardType === "rotational" ? rotationalWinner?.admissionNumber : eventWinner?.admissionNumber}</span>
            </p>

            {awardType === "rotational" && rotationalWinner && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1.5 sm:pt-2">
                <div className="p-2 rounded-xl bg-muted/60 text-center">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-semibold">Points (XP)</span>
                  <span className="text-xs sm:text-sm font-black text-primary">{rotationalWinner.points}</span>
                </div>
                <div className="p-2 rounded-xl bg-muted/60 text-center">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-semibold">Books Issued</span>
                  <span className="text-xs sm:text-sm font-black text-foreground">{rotationalWinner.booksIssuedCount}</span>
                </div>
                <div className="p-2 rounded-xl bg-muted/60 text-center">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-semibold">Total Score</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600">{rotationalWinner.compositeScore}</span>
                </div>
              </div>
            )}
          </div>

          {/* Collection Date Callout Box */}
          <div className="rounded-xl border-2 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 sm:p-3.5 space-y-2 sm:space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Physical Certificate &amp; Award Collection Date
                </p>
                <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 leading-tight mt-0.5 break-words">
                  {awardType === "rotational" ? rotCollectionDate : evtCollectionDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-amber-500/15">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">
                  Collection Location
                </p>
                <p className="text-xs font-semibold text-foreground break-words mt-0.5">
                  {awardType === "rotational"
                    ? rotationalCycle?.settings?.collectionVenue
                    : (eventWinner?.collectionVenue || "Central Library Counter")}
                </p>
              </div>
            </div>

            {(awardType === "rotational" ? rotationalCycle?.settings?.librarianNote : eventWinner?.librarianNote) && (
              <div className="pt-1 text-[10px] sm:text-[11px] text-muted-foreground italic border-t border-amber-500/15 break-words">
                &ldquo;{awardType === "rotational" ? rotationalCycle?.settings?.librarianNote : eventWinner?.librarianNote}&rdquo;
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 sm:h-11 text-xs sm:text-sm shadow-md"
              onClick={handleAcknowledge}
              disabled={acknowledging}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {acknowledging ? "Acknowledging..." : "Acknowledge & Collect Award"}
            </Button>

            {awardType === "event" && eventWinner?.certificateId && (
              <Button
                variant="default"
                className="w-full text-xs font-bold h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  window.location.href = "/student-dashboard?tab=certificates";
                }}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                View &amp; Download E-Certificate
              </Button>
            )}

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
