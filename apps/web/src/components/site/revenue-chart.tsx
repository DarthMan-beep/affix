"use client";

import { useMemo, useRef, useState } from "react";
import { euro } from "@/lib/content";

// 30 days of example revenue: steady growth, weekend peaks, deterministic noise
const DAYS = Array.from({ length: 30 }, (_, i) => {
  const trend = 820 + i * 34;
  const weekly = Math.sin((i / 7) * Math.PI * 2 + 1.2) * 140;
  const noise = ((i * 7919) % 97) - 48;
  return Math.round(trend + weekly + noise * 2.2);
});

const W = 560;
const H = 180;
const PAD = { top: 16, right: 12, bottom: 22, left: 40 };
const MAX = 2400;

export function RevenueChart() {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const pts = useMemo(
    () =>
      DAYS.map((v, i) => ({
        x: PAD.left + (i / (DAYS.length - 1)) * (W - PAD.left - PAD.right),
        y: PAD.top + (1 - v / MAX) * (H - PAD.top - PAD.bottom),
        v,
      })),
    [],
  );
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
  const baseY = H - PAD.bottom;
  const area = `${line}L${pts.at(-1)!.x},${baseY}L${pts[0].x},${baseY}Z`;
  const total = DAYS.reduce((s, v) => s + v, 0);
  const last = pts.at(-1)!;
  const shown = hover ?? pts.length - 1;
  const hp = pts[shown];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((x - PAD.left) / (W - PAD.left - PAD.right)) * (DAYS.length - 1));
    setHover(Math.max(0, Math.min(DAYS.length - 1, i)));
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.8rem] text-muted">Revenue, last 30 days</p>
          <p className="font-display tracking-heading tabular text-[2rem] font-bold leading-tight">
            {euro(total, 0)}
          </p>
        </div>
        <p className="rounded-full bg-spring/30 px-2.5 py-1 text-[0.75rem] font-semibold text-leaf-700">
          +18.2% vs previous 30 days
        </p>
      </div>

      <div className="relative mt-4">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Daily revenue for the last 30 days, ${euro(total, 0)} in total, rising from ${euro(DAYS[0], 0)} to ${euro(DAYS.at(-1)!, 0)} a day`}
        >
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b7f4e" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1b7f4e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 800, 1600, 2400].map((v) => {
            const y = PAD.top + (1 - v / MAX) * (H - PAD.top - PAD.bottom);
            return (
              <g key={v}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#0e2a1e" strokeOpacity={v === 0 ? 0.25 : 0.08} />
                <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="#86958c" className="font-mono max-sm:hidden">
                  {v === 0 ? "€0" : `€${(v / 1000).toFixed(1)}k`}
                </text>
              </g>
            );
          })}
          {[0, 14, 29].map((i) => (
            <text key={i} x={pts[i].x} y={H - 6} fontSize="10" fill="#86958c" textAnchor={i === 0 ? "start" : i === 29 ? "end" : "middle"} className="font-mono max-sm:hidden">
              {i === 29 ? "Today" : `${30 - i}d ago`}
            </text>
          ))}
          <path d={area} fill="url(#rev-fill)" />
          <path d={line} fill="none" stroke="#1b7f4e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && (
            <line x1={hp.x} x2={hp.x} y1={PAD.top} y2={baseY} stroke="#0e2a1e" strokeOpacity="0.25" strokeDasharray="3 3" />
          )}
          <circle cx={hp.x} cy={hp.y} r="5" fill="#1b7f4e" stroke="#fff" strokeWidth="2" />
          {hover === null && (
            <circle cx={last.x} cy={last.y} r="10" fill="#1b7f4e" fillOpacity="0.15" />
          )}
          {/* generous hit area */}
          <rect x={PAD.left} y={0} width={W - PAD.left - PAD.right} height={H} fill="transparent" />
        </svg>

        <div
          className="pointer-events-none absolute whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[0.72rem] text-cream shadow-lg"
          style={{
            left: `${(hp.x / W) * 100}%`,
            top: `${(hp.y / H) * 100 - 4}%`,
            // Keep the tooltip inside the card near either edge
            transform: `translate(${hp.x / W > 0.8 ? "calc(-100% + 10px)" : hp.x / W < 0.2 ? "-10px" : "-50%"}, -100%)`,
          }}
        >
          <span className="font-mono tabular font-medium">{euro(hp.v, 0)}</span>
          <span className="text-cream/60"> · {shown === 29 ? "today" : `${29 - shown}d ago`}</span>
        </div>
      </div>
    </div>
  );
}
