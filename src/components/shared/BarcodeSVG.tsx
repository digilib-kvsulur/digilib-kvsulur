import { buildCode39Bars } from "@/lib/barcode";

interface BarcodeSVGProps {
  value: string;
  className?: string;
  showLabel?: boolean;
  height?: number;
}

export default function BarcodeSVG({ value, className = "w-full h-11", showLabel = true, height = 45 }: BarcodeSVGProps) {
  const { bars, width, cleanVal } = buildCode39Bars(value);

  if (!cleanVal) {
    return <span className="text-xs text-red-500">Invalid Code</span>;
  }

  return (
    <div className="flex flex-col items-center justify-center bg-white p-2 border rounded">
      <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
        {bars.map((bar, idx) =>
          bar.isBlack ? (
            <rect key={idx} x={bar.x} y={0} width={bar.width} height={height} fill="black" />
          ) : null
        )}
      </svg>
      {showLabel && (
        <span className="text-[10px] font-mono mt-1 tracking-[2px] text-black font-semibold uppercase">{cleanVal}</span>
      )}
    </div>
  );
}
