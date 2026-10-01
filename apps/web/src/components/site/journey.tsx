"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { SectionHeading } from "@/components/ui/section-heading";
import { GuillocheRosette } from "@/components/ui/guilloche";
import {
  CheckoutPanel,
  LinkPanel,
  PayoutPanel,
  SplitPanel,
} from "@/components/site/journey-panels";

const steps: { title: string; body: string; detail: string; panel: ReactNode }[] = [
  {
    title: "An affiliate shares a smart link",
    body: "Every affiliate gets a short, tracked link for every product. It is resolved on our servers, so the click still counts when the buyer blocks cookies or switches from phone to laptop.",
    detail: "affix.to/maya/sourdough",
    panel: <LinkPanel />,
  },
  {
    title: "The buyer checks out on one page",
    body: "Cards, PayPal and local methods in 24 languages. An order bump and a one-click upsell raise the basket without adding a single step.",
    detail: "€89.00 + €19.00 order bump",
    panel: <CheckoutPanel />,
  },
  {
    title: "Affix splits the payment",
    body: "The moment the payment clears, VAT for the buyer's country, our fee, the affiliate's commission and the vendor's share are calculated to the cent.",
    detail: "€108.00 split four ways in 0.7s",
    panel: <SplitPanel />,
  },
  {
    title: "Everyone is paid in seconds",
    body: "The commission goes straight to the affiliate's bank over instant rails. The vendor's balance updates at the same moment and pays out daily.",
    detail: "Median 2.4 seconds, sale to paid",
    panel: <PayoutPanel />,
  },
];

function Step({
  index,
  active,
  onActive,
  step,
}: {
  index: number;
  active: boolean;
  onActive: (i: number) => void;
  step: (typeof steps)[number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <div ref={ref} className="relative py-10 lg:flex lg:min-h-[64vh] lg:items-center lg:py-0">
      <div
        className={`transition-opacity duration-500 lg:max-w-[30rem] ${
          active ? "opacity-100" : "lg:opacity-35"
        }`}
      >
        <p className="label-mono flex items-center gap-3 text-spring">
          <span className="font-mono grid h-7 w-7 place-items-center rounded-full border border-spring/40 text-[0.72rem] tracking-normal">
            {index + 1}
          </span>
          Step {index + 1} of {steps.length}
        </p>
        <h3 className="font-display tracking-heading mt-5 text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.05] text-cream">
          {step.title}
        </h3>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-cream/70">{step.body}</p>
        <p className="font-mono mt-5 inline-flex rounded-full border border-cream/15 px-3 py-1.5 text-[0.78rem] text-cream/80">
          {step.detail}
        </p>

        {/* Inline panel on small screens */}
        <div className="mt-8 lg:hidden">{step.panel}</div>
      </div>
    </div>
  );
}

export function Journey() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="product"
      className="grain relative isolate scroll-mt-16 overflow-clip bg-forest-950 py-24 sm:py-32"
    >
      <GuillocheRosette className="animate-rotate-slow pointer-events-none absolute -right-[18rem] top-[-12rem] -z-10 w-[56rem] text-leaf/[0.07]" />

      <div className="container-affix">
        <SectionHeading
          tone="forest"
          eyebrow="How it works"
          title="From first click to paid commission in four steps."
          lead="Follow one sale of Jonas's sourdough course, promoted by Maya on Instagram. Every figure below comes from that single €108 order."
        />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:mt-4 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16 xl:grid-cols-[1fr_minmax(0,32rem)]">
          <div>
            {steps.map((s, i) => (
              <Step key={s.title} index={i} step={s} active={active === i} onActive={setActive} />
            ))}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-17rem)] flex h-[34rem] items-center">
              {/* progress rail */}
              <div className="absolute -left-8 top-1/2 flex -translate-y-1/2 flex-col gap-2">
                {steps.map((s, i) => (
                  <span
                    key={s.title}
                    className={`w-1 rounded-full transition-all duration-500 ${
                      i === active ? "h-8 bg-spring" : "h-3 bg-cream/20"
                    }`}
                  />
                ))}
              </div>
              <div className="relative w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.98 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {steps[active].panel}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
