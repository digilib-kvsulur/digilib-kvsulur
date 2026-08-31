import React from "react";
import { buildCode39Bars } from "@/lib/barcode";

interface BarcodeSVGProps {
  value: string;
  className?: string;
  showLabel?: boolean;
  height?: number;
  /** Bar width multiplier (1 = narrow, 2 = medium, 3 = wide) */
  width?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}

export default function BarcodeSVG({
  value,
  className = "w-full h-11",
  showLabel = true,
  height = 45,
  width = 2,
  fontSize = 10,
  style,
}: BarcodeSVGProps) {
  const { bars, width: rawWidth, cleanVal } = buildCode39Bars(value);

  if (!cleanVal) {
    return <span className="text-xs text-red-500">Invalid Code</span>;
  }

  // Scale the SVG width by the width multiplier
  const scaledWidth = rawWidth * width;

  return (
    <div className="flex flex-col items-center justify-center bg-white" style={style}>
      <svg
        viewBox={`0 0 ${scaledWidth} ${height}`}
        className={className}
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) =>
          bar.isBlack ? (
            <rect
              key={idx}
              x={bar.x * width}
              y={0}
              width={bar.width * width}
              height={height}
              fill="black"
            />
          ) : null
        )}
      </svg>
      {showLabel && (
        <span
          className="font-mono tracking-widest text-black font-semibold uppercase"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.2, marginTop: 2 }}
        >
          {cleanVal}
        </span>
      )}
    </div>
  );
}
