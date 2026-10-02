"use client";

import { useId, useRef, useState } from "react";

/*
 * Time-series chart for the dashboards, drawn by hand in SVG like the landing
 * page's revenue chart (components/site/revenue-chart.tsx): one series, one
 * axis, a single green, and a tooltip that follows the pointer.
 */

export type ChartPoint = {
  /** Shown in the tooltip and on the x-axis, e.g. "2 Oct". */
  label: string;
  /** Cents for unit "eur", a plain count otherwise. */
  value: number;
};

const W = 560;
const H = 190;
const PAD = { top: 14, right: 12, bottom: 24, left: 44 };
const GREEN = "#1b7f4e";

const eur0 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const num = new Intl.NumberFormat("en-IE");

/** A round axis maximum with four even steps: 37 → 40, 1,280 → 1,600. */
function niceMax(max: number, unit: "eur" | "count") {
  const floor = unit === "eur" ? 400 : 4;
  const target = Math.max(max, floor);
  const magnitude = 10 ** Math.floor(Math.log10(target / 4));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s * 4 >= target)!;
  return step * 4;
}

export function TimeChart({
  points,
  kind,
  unit,
  description,
}: {
  points: ChartPoint[];
  kind: "line" | "bar";
  unit: "eur" | "count";
  /** Read by screen readers in place of the picture. */
  description: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const gradient = useId();

  const n = points.length;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)), unit);
  const innerW = W - PAD.left - PAD.right;
  const baseY = H - PAD.bottom;
  const slot = innerW / Math.max(n, 1);
  // Lines run edge to edge; bars sit in the middle of their day's slot.
  const xAt = (i: number) =>
    kind === "bar" ? PAD.left + slot * (i + 0.5) : PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const yAt = (v: number) => PAD.top + (1 - v / max) * (baseY - PAD.top);

  const tick = (v: number) =>
    unit === "eur" ? (v >= 100_000 ? `€${(v / 100_000).toFixed(1)}k` : eur0.format(v / 100)) : num.format(v);
  const full = (v: number) => (unit === "eur" ? eur2.format(v / 100) : num.format(v));

  const line = points.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join("");
  const area = n > 1 ? `${line}L${xAt(n - 1).toFixed(1)},${baseY}L${xAt(0).toFixed(1)},${baseY}Z` : "";
  const barW = Math.max(2, Math.min(18, slot - 2));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = kind === "bar" ? Math.floor((x - PAD.left) / slot) : Math.round(((x - PAD.left) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hp = hover === null ? null : { x: xAt(hover), y: yAt(points[hover].value), ...points[hover] };
  const xLabels = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={description}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.22" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((step) => {
          const v = (max / 4) * step;
          const y = yAt(v);
          return (
            <g key={step}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#0e2a1e" strokeOpacity={step === 0 ? 0.25 : 0.08} />
              <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="#86958c" className="font-mono">
                {tick(v)}
              </text>
            </g>
          );
        })}
        {xLabels.map((i) => (
          <text
            key={i}
            x={kind === "bar" ? xAt(i) : xAt(i)}
            y={H - 6}
            fontSize="10"
            fill="#86958c"
            textAnchor={n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle"}
            className="font-mono"
          >
            {points[i]?.label}
          </text>
        ))}

        {kind === "line" ? (
          <>
            {area && <path d={area} fill={`url(#${gradient})`} />}
            <path d={line} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {n === 1 && <circle cx={xAt(0)} cy={yAt(points[0].value)} r="4" fill={GREEN} />}
          </>
        ) : (
          points.map((p, i) => {
            if (p.value <= 0) return null;
            const y = yAt(p.value);
            const h = baseY - y;
            const r = Math.min(3, barW / 2, h);
            const x = xAt(i) - barW / 2;
            // Rounded at the data end, square on the baseline.
            const d = `M${x},${baseY}V${y + r}Q${x},${y} ${x + r},${y}H${x + barW - r}Q${x + barW},${y} ${x + barW},${y + r}V${baseY}Z`;
            return <path key={i} d={d} fill={GREEN} fillOpacity={hover === null || hover === i ? 1 : 0.45} />;
          })
        )}

        {hp && kind === "line" && (
          <>
            <line x1={hp.x} x2={hp.x} y1={PAD.top} y2={baseY} stroke="#0e2a1e" strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle cx={hp.x} cy={hp.y} r="5" fill={GREEN} stroke="#fff" strokeWidth="2" />
          </>
        )}
        {/* generous hit area */}
        <rect x={PAD.left} y={0} width={innerW} height={H} fill="transparent" />
      </svg>

      {hp && (
        <div
          className="pointer-events-none absolute whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[0.72rem] text-cream shadow-lg"
          style={{
            left: `${(hp.x / W) * 100}%`,
            top: `${(hp.y / H) * 100 - 4}%`,
            // Keep the tooltip inside the card near either edge
            transform: `translate(${hp.x / W > 0.8 ? "calc(-100% + 10px)" : hp.x / W < 0.2 ? "-10px" : "-50%"}, -100%)`,
          }}
        >
          <span className="font-mono tabular font-medium">{full(hp.value)}</span>
          <span className="text-cream/60"> · {hp.label}</span>
        </div>
      )}
    </div>
  );
}
