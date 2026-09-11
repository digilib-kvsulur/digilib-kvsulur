import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, RefreshCw, X, Barcode, Check } from "lucide-react";

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  title?: string;
  description?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  onOpenChange,
  onScan,
  title = "Scan Barcode / QR Code",
  description = "Point your device camera at the book or student ID card barcode.",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [hasCamera, setHasCamera] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCamera(false);
        setErrorMsg("Camera access is not supported by your browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setScanning(true);
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setHasCamera(false);
      setErrorMsg("Camera permission denied or camera unavailable. You can enter the code manually below.");
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  // BarcodeDetector interval loop (if supported natively by browser)
  useEffect(() => {
    if (!scanning || !open) return;

    let active = true;
    const BarcodeDetectorClass = (window as any).BarcodeDetector;

    if (BarcodeDetectorClass) {
      try {
        const detector = new BarcodeDetectorClass({
          formats: ["code_39", "code_128", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
        });

        const interval = setInterval(async () => {
          if (!active || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = barcodes[0].rawValue.trim();
              if (detected) {
                active = false;
                onScan(detected);
                onOpenChange(false);
              }
            }
          } catch {
            /* ignore detect frame errors */
          }
        }, 300);

        return () => {
          active = false;
          clearInterval(interval);
        };
      } catch (e) {
        console.warn("BarcodeDetector init error:", e);
      }
    }
  }, [scanning, open]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Camera className="h-5 w-5 text-indigo-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Viewport with Targeting Overlay */}
          <div className="relative aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden border flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" />

            {/* Target reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-1/2 border-2 border-dashed border-white/80 rounded-xl relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 animate-pulse" />
              </div>
            </div>

            {!scanning && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                <p className="text-xs">Starting camera stream...</p>
              </div>
            )}

            {errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4 text-center">
                <p className="text-xs text-red-300 font-medium mb-2">{errorMsg}</p>
                <Button size="sm" variant="outline" className="text-xs text-white border-white/30" onClick={startCamera}>
                  Retry Camera
                </Button>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Or type accession / student barcode..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="pl-9 h-9 text-xs font-mono"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs gradient-primary border-0">
              Submit
            </Button>
          </form>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
