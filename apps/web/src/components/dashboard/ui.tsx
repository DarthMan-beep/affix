import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-mono text-leaf-700">{eyebrow}</p>}
        <h1 className="font-display tracking-heading mt-3 text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-[1.04] text-ink">
          {title}
        </h1>
        {description && <p className="mt-3 max-w-[60ch] text-[1rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] bg-card p-6 ring-1 ring-line sm:p-7 ${className}`}>{children}</section>;
}

const chipTones = {
  green: "bg-spring/30 text-leaf-700",
  neutral: "bg-ink/[0.06] text-muted",
  amber: "bg-[#e0a030]/20 text-[#7a5410]",
  ink: "bg-ink text-cream",
};

export function Chip({ tone = "neutral", children }: { tone?: keyof typeof chipTones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${chipTones[tone]}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card px-4 py-3.5 ring-1 ring-line sm:px-5 sm:py-4">
      <dt className="text-[0.78rem] text-muted">{label}</dt>
      <dd className="font-display tracking-heading tabular mt-1 text-[1.6rem] font-bold leading-none text-ink">{value}</dd>
    </div>
  );
}

const noticeTones = {
  success: { box: "bg-spring/20 text-leaf-700", icon: CheckCircle2 },
  warning: { box: "bg-[#e0a030]/15 text-[#6b4a0e]", icon: AlertTriangle },
  info: { box: "bg-ink/[0.05] text-ink", icon: Info },
};

export function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: keyof typeof noticeTones;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const t = noticeTones[tone];
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={`flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${t.box}`}
    >
      <div className="flex items-start gap-3">
        <t.icon size={19} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          {children && <div className="mt-0.5 text-[0.9rem] opacity-90">{children}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

export const percent = (bps: number) => `${Math.round(bps) / 100}%`;
export const formatCents = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
export const formatNumber = (n: number) => new Intl.NumberFormat("en-IE").format(n);
