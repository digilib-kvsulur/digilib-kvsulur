import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, User, BookOpen } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function LibraryCard({ user }: { user: any }) {
  const cardRef = useRef<HTMLDivElement>(null);

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
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 53.98] }); // Standard ID card size (CR80)
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
      {/* Actual Card - we set a fixed aspect ratio and standard sizing for rendering */}
      <div 
        ref={cardRef} 
        className="w-[340px] h-[215px] rounded-xl overflow-hidden relative shadow-lg bg-white border border-slate-200 shrink-0"
        style={{
          backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)'
        }}
      >
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-indigo-600 flex items-center px-4 justify-between">
          <div className="text-white font-bold tracking-tight">
            <p className="text-[10px] uppercase text-indigo-200 leading-none mb-0.5">PM SHRI Kendriya Vidyalaya</p>
            <p className="text-sm">AFS Sulur Library</p>
          </div>
          <BookOpen className="h-6 w-6 text-indigo-200" />
        </div>

        {/* Card Body */}
        <div className="absolute top-14 left-0 right-0 bottom-6 p-4 flex gap-4">
          {/* Avatar Area */}
          <div className="w-20 h-24 rounded-lg bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <User className="h-10 w-10 text-slate-400" />
            )}
          </div>
          
          {/* Student Details */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-base font-black text-slate-900 leading-tight truncate">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
              {user.role === 'student' ? 'Student' : 'Staff Member'}
            </p>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
              <div>
                <p className="text-[8px] text-slate-500 uppercase">Class/Sec</p>
                <p className="text-[11px] font-bold text-slate-800">{user.student_class || '—'}</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-500 uppercase">Adm No.</p>
                <p className="text-[11px] font-bold text-slate-800">{user.admission_number || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Barcode Area (Simulated) */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-800 flex items-center justify-center">
          <div className="flex items-center gap-2">
             <div className="w-48 h-3 flex items-center opacity-70 overflow-hidden relative">
                {/* Visual faux barcode stripes */}
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="h-full bg-white absolute" style={{ width: `${Math.max(1, Math.random() * 4)}px`, left: `${i * 5}px` }} />
                ))}
             </div>
             <p className="text-[8px] text-white font-mono tracking-widest">{user.id?.substring(0,8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 w-[340px]">
        <Button onClick={() => generateCard("pdf")} variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Printer className="h-4 w-4 mr-2" /> Print PDF
        </Button>
        <Button onClick={() => generateCard("image")} size="sm" className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700">
          <Download className="h-4 w-4 mr-2" /> Save Image
        </Button>
      </div>
    </div>
  );
}
