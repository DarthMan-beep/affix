"use client";

import { useId, useState } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { euro } from "@/lib/content";
import { splitSale } from "@/lib/split";
import Link from "next/link";

const countries = [
  { name: "Germany", vat: 0.19 },
  { name: "Austria", vat: 0.2 },
  { name: "France", vat: 0.2 },
  { name: "Netherlands", vat: 0.21 },
  { name: "Spain", vat: 0.21 },
  { name: "Italy", vat: 0.22 },
  { name: "Ireland", vat: 0.23 },
  { name: "Sweden", vat: 0.25 },
];

const included = [
  "Hosted checkout and storefront",
  "VAT, invoices and OSS filing",
  "Instant affiliate payouts",
  "Fraud and chargeback protection",
  "Courses and member area",
  "Marketplace listing",
];

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[0.9rem] font-medium text-ink">
          {label}
        </label>
        <span className="font-display tracking-heading tabular text-[1.5rem] font-bold text-ink">
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-affix mt-2"
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
  );
}

export function Pricing() {
  const uid = useId();
  const [price, setPrice] = useState(89);
  const [commission, setCommission] = useState(30);
  const [country, setCountry] = useState(0);

  const c = countries[country];
  const s = splitSale(price, c.vat, commission / 100);
  const vendorShare = Math.max(0, s.vendor);

  const parts = [
    { key: "vendor", label: "You keep", note: "Paid out daily", value: vendorShare, color: "bg-split-vendor" },
    { key: "affiliate", label: "Affiliate commission", note: `${commission}% of the net price, paid in seconds`, value: s.affiliate, color: "bg-split-affiliate" },
    { key: "vat", label: `VAT, ${c.name} ${Math.round(c.vat * 100)}%`, note: "Collected and filed by Affix", value: s.vat, color: "bg-split-vat hatch" },
    { key: "fee", label: "Affix fee", note: "4.9% + €1", value: s.fee, color: "bg-split-fee" },
  ];
  const barTotal = parts.reduce((sum, p) => sum + p.value, 0);

  return (
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-affix grid gap-12 lg:grid-cols-[1fr_minmax(0,34rem)] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Pricing"
            title="One fee, and only when you sell."
            lead="No monthly plan, no setup fee, nothing to pay in a quiet month. Affiliates never pay anything."
          />

          <Reveal className="mt-10">
            <p className="font-display tracking-display text-[clamp(3.8rem,7vw,5.8rem)] font-bold leading-none text-ink">
              4.9% <span className="text-leaf-700">+ €1</span>
            </p>
            <p className="mt-3 text-[1rem] text-muted">per successful sale, everything included</p>

            <ul className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {included.map((i) => (
                <li key={i} className="flex items-center gap-3 text-[0.95rem] text-ink">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-spring">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {i}
                </li>
              ))}
            </ul>

            <Link
              href="#start"
              className="group mt-10 flex items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4 transition-colors hover:border-ink/30"
            >
              <span>
                <span className="block font-semibold text-ink">Selling more than €50k a month?</span>
                <span className="block text-[0.9rem] text-muted">Talk to us about volume pricing.</span>
              </span>
              <ArrowRight size={18} className="shrink-0 text-ink transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <div className="rounded-[28px] bg-card p-6 shadow-[0_40px_90px_-50px_rgb(14_42_30/0.5)] ring-1 ring-line sm:p-8">
            <p className="label-mono text-leaf-700">Sale calculator</p>
            <h3 className="font-display tracking-heading mt-3 text-[1.6rem] font-bold leading-tight text-ink">
              Where every euro of a sale goes
            </h3>

            <div className="mt-7 space-y-6">
              <Slider
                id={`${uid}-price`}
                label="Product price (incl. VAT)"
                value={price}
                display={euro(price, 0)}
                min={9}
                max={999}
                step={1}
                onChange={setPrice}
              />
              <Slider
                id={`${uid}-commission`}
                label="Affiliate commission"
                value={commission}
                display={`${commission}%`}
                min={0}
                max={70}
                step={5}
                onChange={setCommission}
              />
              <div className="flex items-center justify-between gap-4">
                <label htmlFor={`${uid}-country`} className="text-[0.9rem] font-medium text-ink">
                  Buyer&apos;s country
                </label>
                <select
                  id={`${uid}-country`}
                  value={country}
                  onChange={(e) => setCountry(Number(e.target.value))}
                  className="h-10 rounded-full border border-line bg-paper px-4 text-[0.9rem] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-leaf"
                >
                  {countries.map((co, i) => (
                    <option key={co.name} value={i}>
                      {co.name} · {Math.round(co.vat * 100)}% VAT
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="mt-8 flex h-12 gap-[2px] overflow-hidden rounded-xl"
              role="img"
              aria-label={`Of ${euro(price)}: you keep ${euro(vendorShare)}, the affiliate earns ${euro(s.affiliate)}, VAT is ${euro(s.vat)} and the Affix fee is ${euro(s.fee)}`}
            >
              {parts.map((p) =>
                p.value > 0 ? (
                  <span
                    key={p.key}
                    className={`${p.color} h-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                    style={{ width: `${(p.value / barTotal) * 100}%` }}
                  />
                ) : null,
              )}
            </div>

            <ul className="mt-4 divide-y divide-line">
              {parts.map((p) => (
                <li key={p.key} className="flex items-center gap-3 py-3">
                  <span className={`h-3.5 w-3.5 shrink-0 rounded-[4px] ${p.color}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[0.92rem] ${p.key === "vendor" ? "font-bold" : "font-medium"} text-ink`}>
                      {p.label}
                    </span>
                    <span className="block text-[0.78rem] text-muted">{p.note}</span>
                  </span>
                  <span className="font-mono tabular text-right text-[0.95rem] font-medium text-ink">
                    {euro(p.value)}
                  </span>
                </li>
              ))}
            </ul>

            {s.vendor < 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#d0634a]/10 px-3 py-2.5 text-[0.82rem] text-[#8a3524]">
                <Info size={15} className="mt-0.5 shrink-0" />
                At this price and commission the fee is larger than your share. Raise the
                price or lower the commission.
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
