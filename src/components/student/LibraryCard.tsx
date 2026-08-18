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
  const barcodeValue = user?.library_card_barcode || defaultStudentBarcode(user?.admission_number);

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
        className="w-full max-w-[340px] aspect-[340/215] rounded-xl overflow-hidden relative shadow-lg bg-white border border-slate-200"
        style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-[22%] bg-indigo-600 flex items-center px-4 justify-between">
          <div className="text-white font-bold tracking-tight min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase text-indigo-200 leading-none mb-0.5 truncate">PM SHRI Kendriya Vidyalaya</p>
            <p className="text-xs sm:text-sm truncate">AFS Sulur Library</p>
          </div>
          <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-200 shrink-0" />
        </div>

        <div className="absolute top-[22%] left-0 right-0 bottom-[18%] p-3 sm:p-4 flex gap-3">
          <div className="w-[22%] aspect-[4/5] rounded-lg bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
            {user?.avatar_url ? (
              <img src={getAvatarUrl(user.avatar_url)} alt="Profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <User className="h-8 w-8 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">
              {user.role === "student" ? "Student" : "Staff Member"}
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <div>
                <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase">Class</p>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-800">{user.student_class || "—"}</p>
              </div>
              <div>
                <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase">Adm No.</p>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-800 truncate">{user.admission_number || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[18%] bg-slate-800 flex items-center justify-center px-2">
          {barcodeValue ? (
            <div className="w-full max-w-[280px] scale-90 sm:scale-100 origin-center">
              <BarcodeSVG value={barcodeValue} className="w-full h-8" showLabel={true} height={32} />
            </div>
          ) : (
            <p className="text-[8px] text-white/70 font-mono">Barcode pending — contact librarian</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 w-full max-w-[340px]">
        <Button onClick={() => generateCard("pdf")} variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        <Button onClick={() => generateCard("image")} size="sm" className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700">
          <Download className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}
