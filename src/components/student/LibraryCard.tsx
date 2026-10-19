import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, User, BookOpen } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import BarcodeSVG from "@/components/shared/BarcodeSVG";
import { defaultStudentBarcode } from "@/lib/barcode";
import { getAvatarUrl } from "@/lib/utils";

export default function LibraryCard({ user }: { user: any }) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Format admission number to display only the last 5 digits (only digits)
  const rawAdm = user?.admission_number || "";
  const digitsOnly = rawAdm.replace(/[^0-9]/g, "");
  const formattedAdm = digitsOnly ? digitsOnly.slice(-5) : "";

  const barcodeValue = user?.library_card_barcode || defaultStudentBarcode(formattedAdm || rawAdm);

  const generateCard = async (format: "pdf" | "image") => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, logging: false });
      if (format === "image") {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `LibraryCard_${user?.first_name}.png`;
        a.click();
      } else {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 53.98] });
        pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
        pdf.save(`LibraryCard_${user?.first_name}.pdf`);
      }
    } catch (e) {
      console.error("Failed to generate library card", e);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4 w-full flex flex-col items-center">
      <div
        ref={cardRef}
        className="w-full max-w-[340px] aspect-[340/215] rounded-2xl overflow-hidden relative shadow-md bg-white border border-slate-200"
        style={{ backgroundImage: "linear-gradient(145deg, #ffffff 0%, #f8fafc 72%, #f0fdfa 100%)" }}
      >
        {/* School identity */}
        <div className="absolute top-0 left-0 right-0 h-[23%] bg-slate-900 flex items-center px-3 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5 shrink-0">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-100">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain" />
              </div>
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-100">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="text-white font-bold leading-tight min-w-0">
              <p className="text-[8px] uppercase tracking-wide text-teal-300 font-bold mb-0.5">PM SHRI KENDRIYA VIDYALAYA</p>
              <p className="text-[10px] sm:text-xs text-slate-100 font-black truncate">AFS SULUR LIBRARY</p>
            </div>
          </div>
          <BookOpen className="h-5 w-5 text-teal-300 shrink-0" />
        </div>

        <div className="absolute top-[23%] left-0 right-0 h-[3px] bg-teal-500" />

        <div className="absolute top-[26%] left-0 right-0 bottom-[23%] px-4 py-2 flex gap-3">
          <div className="w-[25%] aspect-[4/5] rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative self-center">
            {user?.avatar_url ? (
              <img
                src={getAvatarUrl(user.avatar_url)}
                alt="Profile"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector(".card-user-fallback")) {
                    const iconWrapper = document.createElement("div");
                    iconWrapper.className = "card-user-fallback flex items-center justify-center w-full h-full text-slate-400";
                    iconWrapper.innerHTML = `<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
                    parent.appendChild(iconWrapper);
                  }
                }}
              />
            ) : (
              <User className="h-7 w-7 text-slate-400" />
            )}
          </div>

          {/* Details on Right */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-[8px] font-semibold text-teal-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-600" />
              {user.role === "student" ? "STUDENT" : "STAFF"}
            </p>
            
            <div className="grid grid-cols-2 gap-x-2 bg-white/80 p-1.5 rounded-md border border-slate-200">
              <div>
                <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Class</p>
                <p className="text-[10px] sm:text-xs font-black text-slate-800 leading-none mt-0.5">{user.student_class || "—"}</p>
              </div>
              <div>
                <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Adm No.</p>
                <p className="text-[10px] sm:text-xs font-black text-slate-800 leading-none mt-0.5 truncate">{formattedAdm || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[23%] bg-slate-100 flex items-center justify-between px-3 border-t border-slate-200">
          <div className="min-w-0">
            <p className="text-[7px] text-slate-500 font-semibold uppercase tracking-wider">Library card</p>
            <p className="text-[8px] text-slate-700 font-bold">2026–27</p>
          </div>
          {barcodeValue ? (
            <div className="w-[62%] max-w-[190px] bg-white px-2 py-1 rounded-md border border-slate-200 shrink-0">
              <BarcodeSVG value={barcodeValue} className="w-full h-5 text-slate-900" showLabel={false} height={20} />
              <p className="text-[7px] text-slate-700 font-mono text-center font-semibold mt-0.5">{barcodeValue}</p>
            </div>
          ) : (
            <p className="text-[7px] text-slate-500 font-mono">PENDING</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 w-full max-w-[340px]">
        <Button onClick={() => generateCard("pdf")} variant="outline" size="sm" className="flex-1 h-9 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50">
          <Printer className="h-4 w-4 mr-1" /> Print PDF
        </Button>
        <Button onClick={() => generateCard("image")} size="sm" className="flex-1 h-9 rounded-lg bg-teal-700 hover:bg-teal-800 text-white">
          <Download className="h-4 w-4 mr-1" /> Save Image
        </Button>
      </div>
    </div>
  );
}
