"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 24, color = "#8B5CF6" }: SparklineProps) {
  if (data.length === 0 || data.every((d) => d === 0)) {
    return <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-zinc-600">—</div>;
  }

  const max = Math.max(...data, 1);
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * innerW;
    const y = padding + innerH - (v / max) * innerH;
    return `${x},${y}`;
  }).join(" ");

  // Fill area under the line
  const firstX = padding;
  const lastX = padding + innerW;
  const fillPoints = `${firstX},${padding + innerH} ${points} ${lastX},${padding + innerH}`;

  return (
    <svg width={width} height={height} className="shrink-0">
      <polygon points={fillPoints} fill={color} opacity={0.15} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot on the last point */}
      {data.length > 0 && (() => {
        const lastVal = data[data.length - 1];
        const x = padding + innerW;
        const y = padding + innerH - (lastVal / max) * innerH;
        return <circle cx={x} cy={y} r={2} fill={color} />;
      })()}
    </svg>
  );
}
