import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { Trust } from "@/lib/fraud";

const levels = {
  good: { label: "Good", box: "bg-spring/30 text-leaf-700" },
  watch: { label: "Watch", box: "bg-[#e0a030]/20 text-[#7a5410]" },
  risk: { label: "At risk", box: "bg-[#c2553a]/15 text-[#8f3823]" },
} as const;

/** The trust score with its level in words and an icon, so colour never carries it alone. */
export function TrustBadge({ trust }: { trust: Trust }) {
  const level = levels[trust.level];
  const Icon = trust.level === "good" ? ShieldCheck : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${level.box}`}>
      <Icon size={12} />
      <span className="font-mono tabular">{trust.score}</span> · {level.label}
    </span>
  );
}

/** The reasons behind a score, one line each. */
export function TrustSignals({ trust, empty = "No warning signs in the last 30 days." }: { trust: Trust; empty?: string }) {
  if (trust.signals.length === 0) return <p className="text-[0.88rem] text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {trust.signals.map((s) => (
        <li key={s.key} className="flex items-start justify-between gap-4 text-[0.88rem]">
          <span>
            <span className="font-semibold text-ink">{s.label}.</span> <span className="text-muted">{s.detail}</span>
          </span>
          <span className="font-mono tabular shrink-0 text-[0.8rem] text-[#8f3823]">−{s.penalty}</span>
        </li>
      ))}
    </ul>
  );
}
