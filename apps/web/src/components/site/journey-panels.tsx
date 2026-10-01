import Image from "next/image";
import type { ReactNode } from "react";
import { Check, Copy, Link2, Lock, Zap } from "lucide-react";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { AffixSymbol } from "@/components/ui/logo";
import { euro } from "@/lib/content";
import { splitSale } from "@/lib/split";

/* One sale, followed from click to payout. All figures derive from here. */
const PRICE = 89;
const BUMP = 19;
const GROSS = PRICE + BUMP; // €108.00
const SALE = splitSale(GROSS, 0.19, 0.3);

function Window({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[22px] bg-card text-ink shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] ring-1 ring-black/5 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-line bg-paper/70 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        </span>
        <p className="font-mono ml-2 truncate text-[0.72rem] text-muted">{title}</p>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- 1 · link */

const channels = [
  { name: "Instagram", clicks: 612 },
  { name: "Newsletter", clicks: 402 },
  { name: "YouTube", clicks: 270 },
];
const CLICKS = channels.reduce((s, c) => s + c.clicks, 0); // 1,284
const SALES = 57;
const COMMISSION_BASE = splitSale(PRICE, 0.19, 0.3).affiliate; // €22.44 per sale

export function LinkPanel() {
  const epc = (SALES * COMMISSION_BASE) / CLICKS;
  return (
    <Window title="app.affix.to/links">
      <p className="label-mono text-[0.64rem] text-muted-2">Your smart link</p>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-3">
        <Link2 size={17} className="shrink-0 text-leaf-700" />
        <p className="font-mono min-w-0 flex-1 truncate text-[0.92rem] font-medium">
          affix.to/maya/sourdough
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-[0.75rem] font-semibold text-cream">
          <Copy size={12} /> Copy
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2">
        {[
          ["Clicks", CLICKS.toLocaleString("en-IE")],
          ["Sales", String(SALES)],
          ["Earnings per click", euro(epc)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-paper px-3 py-3">
            <dt className="text-[0.7rem] leading-tight text-muted">{k}</dt>
            <dd className="font-display tabular mt-1 text-[1.35rem] font-bold leading-none">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-[0.8rem] font-semibold">Clicks by channel, last 30 days</p>
      <div className="mt-3 space-y-2.5">
        {channels.map((c) => (
          <div key={c.name} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3">
            <span className="text-[0.8rem] text-muted">{c.name}</span>
            <span className="h-2.5 rounded-full bg-ink/[0.06]">
              <span
                className="block h-full rounded-full bg-split-vendor"
                style={{ width: `${(c.clicks / channels[0].clicks) * 100}%` }}
              />
            </span>
            <span className="font-mono tabular text-right text-[0.8rem]">{c.clicks}</span>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-center gap-2 rounded-xl bg-spring/25 px-3 py-2.5 text-[0.8rem] font-medium text-leaf-700">
        <Check size={14} strokeWidth={3} /> Tracked across devices for 180 days
      </p>
    </Window>
  );
}

/* ------------------------------------------------------------ 2 · checkout */

export function CheckoutPanel() {
  return (
    <Window title="checkout.affix.to/sourdough-at-home">
      <div className="flex items-center gap-3.5">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <Image src="/images/product-sourdough.jpg" alt="" fill sizes="56px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Sourdough at Home</p>
          <p className="text-[0.8rem] text-muted">Online course by Jonas Berg</p>
        </div>
        <p className="font-mono tabular text-[0.95rem]">{euro(PRICE)}</p>
      </div>

      <div className="mt-4 rounded-2xl border-2 border-dashed border-leaf/70 bg-spring/15 p-3.5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-ink text-spring">
            <Check size={13} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9rem] font-semibold">Add the Rye &amp; Spelt Guide</p>
            <p className="text-[0.78rem] text-muted">Order bump · 42% of buyers add it</p>
          </div>
          <p className="font-mono tabular text-[0.9rem] font-medium">+{euro(BUMP)}</p>
        </div>
      </div>

      <p className="mt-5 text-[0.8rem] font-semibold">Payment method</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["Visa", "Mastercard", "PayPal"] as const).map((m, i) => (
          <span
            key={m}
            className={`grid h-11 place-items-center rounded-xl border ${
              i === 0 ? "border-ink bg-paper ring-1 ring-ink" : "border-line"
            }`}
          >
            <PaymentIcon type={m} format="logo" width={40} />
          </span>
        ))}
      </div>

      <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-[0.82rem]">
        <p className="flex justify-between text-muted">
          <span>Includes VAT (Germany, 19%)</span>
          <span className="font-mono tabular">{euro(SALE.vat)}</span>
        </p>
        <p className="flex justify-between text-[1rem] font-semibold">
          <span>Total</span>
          <span className="font-mono tabular">{euro(GROSS)}</span>
        </p>
      </div>

      <div className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[0.95rem] font-semibold text-cream">
        <Lock size={15} /> Pay {euro(GROSS)}
      </div>
    </Window>
  );
}

/* --------------------------------------------------------------- 3 · split */

const parts = [
  { key: "vendor", label: "Jonas Berg", note: "Vendor", value: SALE.vendor, color: "bg-split-vendor" },
  { key: "affiliate", label: "Maya K.", note: "Affiliate · 30% of net", value: SALE.affiliate, color: "bg-split-affiliate" },
  { key: "vat", label: "VAT, Germany 19%", note: "Filed by Affix", value: SALE.vat, color: "bg-split-vat hatch" },
  { key: "fee", label: "Affix fee", note: "4.9% + €1", value: SALE.fee, color: "bg-split-fee" },
];

export function SplitPanel() {
  return (
    <Window title="app.affix.to/payments/pay_8Kd2x">
      <div className="flex items-baseline justify-between">
        <p className="text-[0.85rem] text-muted">Payment cleared</p>
        <p className="inline-flex items-center gap-1 rounded-full bg-spring/30 px-2 py-0.5 text-[0.72rem] font-semibold text-leaf-700">
          <Check size={12} strokeWidth={3} /> Split in 0.7s
        </p>
      </div>
      <p className="font-display tracking-heading tabular mt-1 text-[2.6rem] font-bold leading-none">
        {euro(GROSS)}
      </p>

      {/* Stacked bar: one scale, 2px surface gaps, value labels in the legend */}
      <div className="mt-6 flex h-11 gap-[2px] overflow-hidden rounded-lg" role="img" aria-label="How the payment is split">
        {parts.map((p) => (
          <span
            key={p.key}
            className={`${p.color} h-full first:rounded-l-lg last:rounded-r-lg`}
            style={{ width: `${(p.value / GROSS) * 100}%` }}
          />
        ))}
      </div>

      <ul className="mt-5 divide-y divide-line">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-3 py-2.5">
            <span className={`h-3 w-3 shrink-0 rounded-[4px] ${p.color}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.88rem] font-semibold">{p.label}</span>
              <span className="block text-[0.74rem] text-muted">{p.note}</span>
            </span>
            <span className="font-mono tabular w-12 text-right text-[0.78rem] text-muted">
              {((p.value / GROSS) * 100).toFixed(1)}%
            </span>
            <span className="font-mono tabular w-16 text-right text-[0.9rem] font-medium">
              {euro(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </Window>
  );
}

/* -------------------------------------------------------------- 4 · payout */

const timeline = [
  { t: "12:04:31.2", label: "Payment cleared", value: euro(GROSS) },
  { t: "12:04:31.9", label: "Split calculated", value: "4 parts" },
  { t: "12:04:32.4", label: "Sent via SEPA Instant", value: "DE•• 4821" },
  { t: "12:04:33.6", label: "Received by Maya K.", value: `+${euro(SALE.affiliate)}` },
];

export function PayoutPanel() {
  return (
    <div className="space-y-3">
      <div className="ui-card flex items-center gap-3 rounded-2xl p-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-spring">
          <AffixSymbol className="h-[18px] w-auto" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9rem] font-semibold text-ink">
            You earned {euro(SALE.affiliate)}
          </p>
          <p className="truncate text-[0.78rem] text-muted">
            Sourdough at Home · paid to your bank
          </p>
        </div>
        <p className="font-mono self-start text-[0.7rem] text-muted-2">now</p>
      </div>

      <Window title="app.affix.to/payouts/po_Q71mc">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.85rem] text-muted">Sale to payout</p>
            <p className="font-display tracking-display tabular mt-1 text-[4rem] font-bold leading-[0.85] text-leaf-700">
              2.4s
            </p>
          </div>
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[0.75rem] font-semibold text-spring">
            <Zap size={13} /> Instant
          </span>
        </div>

        <ol className="relative mt-6 space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line">
          {timeline.map((row, i) => (
            <li key={row.t} className="relative flex items-center gap-4 pl-6">
              <span
                className={`absolute left-0 h-[11px] w-[11px] rounded-full border-2 ${
                  i === timeline.length - 1
                    ? "border-leaf bg-spring"
                    : "border-ink/25 bg-card"
                }`}
              />
              <span className="font-mono tabular w-[5.6rem] shrink-0 text-[0.75rem] text-muted">
                {row.t}
              </span>
              <span className="min-w-0 flex-1 text-[0.88rem] font-medium">{row.label}</span>
              <span
                className={`font-mono tabular text-[0.82rem] ${
                  i === timeline.length - 1 ? "font-semibold text-leaf-700" : "text-muted"
                }`}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ol>
      </Window>
    </div>
  );
}
