import Link from "next/link";
import { ArrowRight, Link2, Store } from "lucide-react";
import { startPromoting, startSelling } from "@/app/dashboard/actions";
import { Chip } from "./ui";

const copy = {
  selling: {
    icon: Store,
    title: "Selling",
    pitch: "List digital products with checkout, VAT and payouts handled, and let affiliates sell them for you.",
    start: "Start selling",
    action: startSelling,
    href: "/dashboard/selling",
  },
  promoting: {
    icon: Link2,
    title: "Promoting",
    pitch: "Pick products from the marketplace, share smart links and get commission seconds after each sale.",
    start: "Start promoting",
    action: startPromoting,
    href: "/dashboard/promoting",
  },
};

/** Overview card for one workspace: live stats if open, an invitation if not. */
export function WorkspaceCard({
  kind,
  active,
  stats,
}: {
  kind: keyof typeof copy;
  active: boolean;
  stats: { label: string; value: string }[];
}) {
  const c = copy[kind];
  return (
    <section className="flex flex-col rounded-[24px] bg-card p-6 ring-1 ring-line sm:p-7">
      <div className="flex items-center justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-ink text-spring" : "bg-ink/[0.06] text-ink"}`}>
          <c.icon size={20} />
        </span>
        {active ? <Chip tone="green">Active</Chip> : <Chip>Not set up</Chip>}
      </div>
      <h2 className="font-display tracking-heading mt-5 text-[1.5rem] font-bold text-ink">{c.title}</h2>

      {active ? (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-paper px-3.5 py-3">
                <dt className="text-[0.74rem] leading-tight text-muted">{s.label}</dt>
                <dd className="font-display tabular mt-1 text-[1.35rem] font-bold leading-none text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
          <Link
            href={c.href}
            className="group mt-6 inline-flex items-center gap-1.5 self-start text-[0.92rem] font-semibold text-ink hover:text-leaf-700"
          >
            Open {c.title.toLowerCase()}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-muted">{c.pitch}</p>
          <form action={c.action} className="mt-6">
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700"
            >
              {c.start} <ArrowRight size={16} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}

/** Full-page invitation shown when a workspace isn't open yet. */
export function WorkspaceLocked({ kind }: { kind: keyof typeof copy }) {
  const c = copy[kind];
  return (
    <section className="grain relative isolate mt-10 overflow-hidden rounded-[28px] bg-forest-900 px-6 py-14 text-center sm:px-12">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-spring text-ink">
        <c.icon size={24} />
      </span>
      <h2 className="font-display tracking-heading mx-auto mt-6 max-w-md text-[2rem] font-bold leading-tight text-cream">
        Your {c.title.toLowerCase()} workspace isn&apos;t open yet
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[1rem] leading-relaxed text-cream/70">{c.pitch}</p>
      <form action={c.action} className="mt-8">
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-spring px-7 font-semibold text-ink shadow-[0_10px_30px_-12px_rgb(125_239_161/0.8)] transition-colors hover:bg-spring-300"
        >
          {c.start} <ArrowRight size={17} />
        </button>
      </form>
    </section>
  );
}
