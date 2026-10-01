"use client";

import { motion } from "motion/react";
import { SectionHeading } from "@/components/ui/section-heading";

const fixes = [
  {
    topic: "Payouts",
    broken: "Commissions held for 30 to 60 days",
    fixed: "Paid out 2.4 seconds after the sale",
    proof: "2.4s",
    proofLabel: "median payout, last 90 days",
  },
  {
    topic: "Tracking",
    broken: "Sales lost when a cookie expires",
    fixed: "Server-side tracking across devices for 180 days",
    proof: "180d",
    proofLabel: "attribution window",
  },
  {
    topic: "Tax",
    broken: "VAT filings in every country you sell to",
    fixed: "Affix is the Merchant of Record and files it for you",
    proof: "30+",
    proofLabel: "countries with VAT handled",
  },
  {
    topic: "Checkout",
    broken: "A checkout that loses one buyer in three",
    fixed: "A one-page checkout with order bumps and upsells",
    proof: "+23%",
    proofLabel: "average order value",
  },
  {
    topic: "Reach",
    broken: "Affiliates you have to find on your own",
    fixed: "A marketplace of 120,000 active affiliates",
    proof: "120k",
    proofLabel: "affiliates, one switch away",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function FixedList() {

  return (
    <section id="why" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-affix">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionHeading
            eyebrow="Why Affix"
            title={
              <>
                Affiliate marketing was broken.
                <br className="hidden sm:block" /> Here is what we fixed.
              </>
            }
            lead="We sold and promoted digital products on other platforms for years. These are the five problems Affix was built to solve."
          />
        </div>

        <ol className="mt-14 border-b border-line sm:mt-20">
          {fixes.map((f) => (
            <motion.li
              key={f.topic}
              initial="rest"
              whileInView="fixed"
              viewport={{ once: true, amount: 0.6 }}
              className="grid gap-4 border-t border-line py-8 sm:py-10 lg:grid-cols-[10rem_1fr_13rem] lg:items-center lg:gap-10"
            >
              <p className="label-mono flex items-center gap-2.5 text-muted-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ink/25" />
                {f.topic}
              </p>

              <div className="min-w-0">
                <p className="relative inline-block text-[1.05rem] text-muted sm:text-[1.2rem]">
                  {f.broken}
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-[-2%] top-[55%] h-[2px] w-[104%] origin-left rounded-full bg-ink/55"
                    variants={{ rest: { scaleX: 0 }, fixed: { scaleX: 1 } }}
                    transition={{ duration: 0.7, delay: 0.15, ease }}
                  />
                  <span className="sr-only"> (fixed)</span>
                </p>
                <motion.p
                  className="font-display tracking-heading mt-2 text-[clamp(1.65rem,3.3vw,2.7rem)] font-bold leading-[1.08] text-ink"
                  variants={{
                    rest: { opacity: 0, y: 14 },
                    fixed: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.7, delay: 0.55, ease }}
                >
                  {f.fixed}
                </motion.p>
              </div>

              <motion.div
                className="flex items-baseline gap-3 lg:flex-col lg:items-end lg:gap-1 lg:text-right"
                variants={{ rest: { opacity: 0 }, fixed: { opacity: 1 } }}
                transition={{ duration: 0.6, delay: 0.8, ease }}
              >
                <span className="font-display tracking-heading tabular text-[2rem] font-bold leading-none text-leaf-700 lg:text-[2.6rem]">
                  {f.proof}
                </span>
                <span className="text-[0.85rem] leading-snug text-muted">{f.proofLabel}</span>
              </motion.div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
