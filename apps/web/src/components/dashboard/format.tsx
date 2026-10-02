import type { ReactNode } from "react";

/** 0.0123 → "1.2%"; whole numbers lose the decimal ("12%"). */
export const formatPercent = (ratio: number) => {
  const pct = ratio * 100;
  return `${pct >= 10 || pct === 0 ? Math.round(pct) : pct.toFixed(1)}%`;
};

/** Centered note shown in place of a table or list that has nothing to show. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-6 py-10 text-center text-[0.9rem] text-muted">{children}</p>;
}
