import Link from "next/link";
import { RANGE_PRESETS, type DateRange } from "@/lib/range";
import { formatCents, formatNumber } from "./ui";

/* Range switcher, ranked bars and the click heatmap: the server-rendered chart pieces. */

/** 7 / 30 / 90 day switcher. Keeps the page it is on and swaps ?range=. */
export function RangeTabs({ base, range }: { base: string; range: DateRange }) {
  return (
    <div className="inline-flex rounded-full bg-ink/[0.05] p-1" role="group" aria-label="Date range">
      {RANGE_PRESETS.map((p) => {
        const active = range.preset === p;
        return (
          <Link
            key={p}
            href={`${base}?range=${p}`}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={`rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${
              active ? "bg-card text-ink shadow-[0_1px_2px_rgb(14_42_30/0.12)]" : "text-muted hover:text-ink"
            }`}
          >
            {p} days
          </Link>
        );
      })}
    </div>
  );
}

/** Ranked horizontal bars: a share of a whole, largest first, one colour. */
export function BarList({
  rows,
  unit,
  empty,
}: {
  rows: { label: string; value: number }[];
  unit: "eur" | "count";
  empty: string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (total === 0) return <p className="py-6 text-center text-[0.88rem] text-muted">{empty}</p>;

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-[0.88rem]">
            <span className="truncate text-ink">{r.label}</span>
            <span className="shrink-0 text-muted">
              <span className="font-mono tabular font-semibold text-ink">
                {unit === "eur" ? formatCents(r.value) : formatNumber(r.value)}
              </span>{" "}
              · {Math.round((r.value / total) * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full bg-split-vendor"
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// One green, light to dark: more clicks, darker cell.
const STEPS = ["rgb(14 42 30 / 0.05)", "#cfe8d8", "#93cdaa", "#4fa877", "#1b7f4e", "#0f5a36"];

/** Clicks by weekday and hour of day. `cells[weekday][hour]`, Monday first. */
export function Heatmap({ cells }: { cells: number[][] }) {
  const max = Math.max(0, ...cells.flat());
  const step = (v: number) => (v === 0 || max === 0 ? 0 : Math.min(5, 1 + Math.floor((v / max) * 4.999)));

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[34rem]">
          <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[2px]">
            {cells.map((row, d) => (
              <div key={WEEKDAYS[d]} className="contents">
                <span className="self-center text-[0.72rem] text-muted">{WEEKDAYS[d]}</span>
                {row.map((v, h) => (
                  <span
                    key={h}
                    title={`${WEEKDAYS[d]} ${String(h).padStart(2, "0")}:00 · ${formatNumber(v)} ${v === 1 ? "click" : "clicks"}`}
                    className="aspect-square rounded-[3px]"
                    style={{ background: STEPS[step(v)] }}
                  />
                ))}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="font-mono pt-1 text-center text-[0.62rem] text-muted-2">
                {h % 6 === 0 ? String(h).padStart(2, "0") : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[0.72rem] text-muted">
        Fewer
        {STEPS.map((c) => (
          <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}
