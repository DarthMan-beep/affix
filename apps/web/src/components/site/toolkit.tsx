import Image from "next/image";
import type { ReactNode } from "react";
import { Check, CirclePlay, FileText, ShieldCheck, Store } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevenueChart } from "@/components/site/revenue-chart";
import { euro, products } from "@/lib/content";

function Card({
  title,
  body,
  children,
  className = "",
  dark = false,
}: {
  title: string;
  body: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-[26px] p-6 sm:p-7 ${
        dark ? "bg-forest-900 text-cream" : "bg-card ring-1 ring-line"
      } ${className}`}
    >
      <div className="flex-1">{children}</div>
      <div className="mt-7">
        <h3 className={`font-display tracking-heading text-[1.35rem] font-bold leading-tight ${dark ? "text-cream" : "text-ink"}`}>
          {title}
        </h3>
        <p className={`mt-2 text-[0.95rem] leading-relaxed ${dark ? "text-cream/65" : "text-muted"}`}>
          {body}
        </p>
      </div>
    </div>
  );
}

function FraudVisual() {
  const signals = ["Card and IP country match", "Device seen before", "Normal purchase velocity"];
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-spring/15 text-spring">
          <ShieldCheck size={22} />
        </span>
        <span className="rounded-full bg-spring px-2.5 py-1 text-[0.72rem] font-bold text-ink">Approved</span>
      </div>
      <p className="mt-6 text-[0.8rem] text-cream/60">Risk score</p>
      <p className="font-display tabular text-[2.6rem] font-bold leading-none">0.04</p>
      <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-spring via-[#e0a030] to-[#d0634a]">
        <span className="relative block h-full">
          <span className="absolute left-[4%] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-forest-900 bg-cream" />
        </span>
      </div>
      <ul className="mt-5 space-y-2">
        {signals.map((s) => (
          <li key={s} className="flex items-center gap-2 text-[0.82rem] text-cream/75">
            <Check size={14} className="text-spring" strokeWidth={3} /> {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlansVisual() {
  const plans = [
    { label: "Pay in full", price: "€297" },
    { label: "3 monthly payments", price: "3 × €99", active: true },
    { label: "Membership", price: "€29 / month" },
  ];
  return (
    <div className="space-y-2">
      {plans.map((p) => (
        <div
          key={p.label}
          className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
            p.active ? "border-ink bg-paper ring-1 ring-ink" : "border-line"
          }`}
        >
          <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${p.active ? "border-ink" : "border-ink/25"}`}>
            {p.active && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
          </span>
          <span className="flex-1 text-[0.88rem] font-medium">{p.label}</span>
          <span className="font-mono tabular text-[0.85rem]">{p.price}</span>
        </div>
      ))}
    </div>
  );
}

function StoreVisual() {
  const items = [products[1], products[4], products[9]];
  return (
    <div className="rounded-2xl bg-paper p-3">
      <div className="flex items-center gap-2 px-1 pb-3">
        <Store size={15} className="text-leaf-700" />
        <span className="font-mono truncate text-[0.75rem] text-muted">jonasberg.affix.store</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((p) => (
          <div key={p.title} className="overflow-hidden rounded-xl bg-card">
            <div className="relative aspect-[4/3]">
              <Image src={p.image} alt="" fill sizes="120px" className="object-cover" />
            </div>
            <p className="truncate px-2 pt-1.5 text-[0.7rem] font-semibold">{p.title}</p>
            <p className="font-mono px-2 pb-2 text-[0.68rem] text-muted">{euro(p.price, 0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonsVisual() {
  const lessons = [
    { t: "Feeding your starter", d: "12:40", done: true },
    { t: "Autolyse and folds", d: "18:05", done: true },
    { t: "Shaping a tight boule", d: "15:22", now: true },
    { t: "Scoring and baking", d: "21:10" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between text-[0.78rem]">
        <span className="font-semibold">Sourdough at Home</span>
        <span className="font-mono text-muted">50%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-ink/[0.07]">
        <div className="h-full w-1/2 rounded-full bg-split-vendor" />
      </div>
      <ul className="mt-4 space-y-1.5">
        {lessons.map((l) => (
          <li
            key={l.t}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.82rem] ${l.now ? "bg-paper font-semibold" : ""}`}
          >
            {l.done ? (
              <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-split-vendor text-white">
                <Check size={11} strokeWidth={3} />
              </span>
            ) : (
              <CirclePlay size={18} className={l.now ? "text-ink" : "text-muted-2"} />
            )}
            <span className={`flex-1 ${l.done ? "text-muted" : ""}`}>{l.t}</span>
            <span className="font-mono text-[0.72rem] text-muted-2">{l.d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UpsellVisual() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex items-center gap-4 rounded-2xl bg-paper p-3">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          <Image src="/images/product-pilates.jpg" alt="" fill sizes="64px" className="object-cover" />
        </span>
        <div className="min-w-0">
          <p className="label-mono text-[0.6rem] text-leaf-700">One-time offer</p>
          <p className="mt-0.5 font-semibold leading-snug">Add the 6-week Reformer Plan</p>
          <p className="text-[0.8rem] text-muted">
            <span className="line-through">€89</span>{" "}
            <span className="font-semibold text-ink">€49</span> · one click, no card details
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:flex-col">
        <span className="grid h-10 flex-1 place-items-center rounded-full bg-ink px-5 text-[0.85rem] font-semibold text-cream">
          Yes, add it
        </span>
        <span className="grid h-10 flex-1 place-items-center rounded-full px-5 text-[0.85rem] font-medium text-muted ring-1 ring-inset ring-line">
          No, thanks
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 sm:col-span-2">
        {[
          ["Take rate", "38%"],
          ["Extra per order", "€18.62"],
          ["Added revenue, 30 days", "€6,204"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line px-3 py-2.5">
            <dt className="text-[0.7rem] leading-tight text-muted">{k}</dt>
            <dd className="font-display tabular mt-1 text-[1.15rem] font-bold leading-none text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function InvoiceVisual() {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold">
          <FileText size={16} className="text-leaf-700" /> Invoice AFX-2026-04182
        </span>
      </div>
      <div className="mt-4 space-y-1.5 text-[0.8rem]">
        <p className="flex justify-between text-muted"><span>Net</span><span className="font-mono tabular">€90.76</span></p>
        <p className="flex justify-between text-muted"><span>VAT DE 19%</span><span className="font-mono tabular">€17.24</span></p>
        <p className="flex justify-between border-t border-line pt-1.5 font-semibold"><span>Total</span><span className="font-mono tabular">€108.00</span></p>
      </div>
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-spring/30 px-2.5 py-1 text-[0.72rem] font-semibold text-leaf-700">
        <Check size={12} strokeWidth={3} /> Filed with the OSS return
      </p>
    </div>
  );
}

export function Toolkit() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-affix">
        <SectionHeading
          eyebrow="The toolkit"
          title="Every tool between the click and the payout."
          lead="Affix replaces the checkout plugin, the course host, the affiliate tracker and the tax accountant. One login, one dashboard, one monthly statement."
        />

        <div className="mt-14 grid gap-4 sm:mt-16 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <Reveal className="h-full md:col-span-2">
            <Card
              title="Live analytics"
              body="Revenue, clicks, conversion and earnings per click by product, affiliate and channel, updated with every sale."
            >
              <RevenueChart />
            </Card>
          </Reveal>
          <Reveal delay={0.05} className="h-full">
            <Card
              dark
              title="Fraud protection"
              body="Every payment is scored before it clears. Stolen cards and fake clicks are blocked before they turn into chargebacks."
            >
              <FraudVisual />
            </Card>
          </Reveal>
          <Reveal className="h-full">
            <Card
              title="Subscriptions and payment plans"
              body="Memberships, instalments and trials, with automatic renewals and dunning."
            >
              <PlansVisual />
            </Card>
          </Reveal>
          <Reveal delay={0.05} className="h-full">
            <Card
              title="Your own storefront"
              body="A branded shop for all your products on your own domain, ready in minutes."
            >
              <StoreVisual />
            </Card>
          </Reveal>
          <Reveal delay={0.1} className="h-full">
            <Card
              title="Courses and member area"
              body="Host videos, downloads and communities. Access is granted the second a payment clears."
            >
              <LessonsVisual />
            </Card>
          </Reveal>
          <Reveal className="h-full md:col-span-2">
            <Card
              title="Upsells after the purchase"
              body="Offer a second product on the thank-you page. Buyers accept with one click, without entering their card again."
            >
              <UpsellVisual />
            </Card>
          </Reveal>
          <Reveal delay={0.05} className="h-full">
            <Card
              title="Invoices and VAT"
              body="Compliant invoices in the buyer's language, and VAT filed through the EU One-Stop Shop."
            >
              <InvoiceVisual />
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
