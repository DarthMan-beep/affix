"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { euro, products } from "@/lib/content";
import { splitSale } from "@/lib/split";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/* ------------------------------------------------------------ live counter */

const START_TOTAL = 48_213_904.12;

export function LiveCounter() {
  const [total, setTotal] = useState(START_TOTAL);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      // Deterministic, commission-sized increments
      setTotal((t) => t + 18 + ((i * 37.13) % 61));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="glass inline-flex w-fit items-center gap-2.5 rounded-full py-1.5 pl-3 pr-4 text-[0.82rem] text-cream/85">
      <span className="live-dot h-2 w-2 rounded-full bg-spring" />
      <span className="font-mono tabular text-cream">{euro(total)}</span>
      <span className="hidden sm:inline">paid to affiliates so far</span>
      <span className="sm:hidden">paid out</span>
    </p>
  );
}

/* ------------------------------------------------------------ sale → payout */

const PAYOUT_SECONDS = 2.4;

const feed = [
  { p: products[1], affiliate: "maya.cooks", payee: "Maya K.", account: "DE•• 4821", country: "Germany", vat: 0.19 },
  { p: products[0], affiliate: "fitwithnoor", payee: "Noor A.", account: "NL•• 0937", country: "Netherlands", vat: 0.21 },
  { p: products[2], affiliate: "lensandlight", payee: "Theo B.", account: "FR•• 6610", country: "France", vat: 0.2 },
].map((f) => ({ ...f, commission: splitSale(f.p.price, f.vat, f.p.commission).affiliate }));

type Phase = "sale" | "paying" | "paid" | "out";

export function HeroFeed() {
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("sale");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Reduced motion: render the settled state (derived below), no cycling.
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;

    timers.push(
      setTimeout(() => {
        setPhase("paying");
        const t0 = performance.now();
        const tick = (now: number) => {
          const s = Math.min(PAYOUT_SECONDS, (now - t0) / 1000);
          setElapsed(s);
          if (s < PAYOUT_SECONDS) raf = requestAnimationFrame(tick);
          else setPhase("paid");
        };
        raf = requestAnimationFrame(tick);
      }, 1100),
    );
    timers.push(setTimeout(() => setPhase("out"), 1100 + PAYOUT_SECONDS * 1000 + 3200));
    timers.push(
      setTimeout(() => {
        setPhase("sale");
        setElapsed(0);
        setIndex((i) => (i + 1) % feed.length);
      }, 1100 + PAYOUT_SECONDS * 1000 + 3900),
    );
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [index, reduce]);

  const item = feed[index];
  const shownPhase: Phase = reduce ? "paid" : phase;
  const shownElapsed = reduce ? PAYOUT_SECONDS : elapsed;
  const visible = shownPhase !== "out";
  const showPayout = shownPhase === "paying" || shownPhase === "paid";
  const paid = shownPhase === "paid";

  return (
    <div
      className="pointer-events-none absolute bottom-10 right-8 hidden w-[344px] flex-col gap-3 lg:flex xl:right-12"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {visible && (
          <motion.div
            key={`sale-${index}`}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ui-card flex items-center gap-3.5 rounded-2xl p-3.5"
          >
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
              <Image src={item.p.image} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="label-mono text-[0.62rem] text-muted-2">New sale · just now</p>
              <p className="mt-0.5 truncate text-[0.95rem] font-semibold text-ink">
                {item.p.title}
              </p>
              <p className="truncate text-[0.78rem] text-muted">
                via @{item.affiliate} · {item.country}
              </p>
            </div>
            <p className="font-mono tabular self-start pt-4 text-[0.92rem] font-medium text-ink">
              {euro(item.p.price)}
            </p>
          </motion.div>
        )}

        {visible && showPayout && (
          <motion.div
            key={`pay-${index}`}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="ui-card rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <p className="label-mono text-[0.62rem] text-muted-2">Commission payout</p>
              <span
                className={`font-mono tabular inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.72rem] font-medium transition-colors duration-300 ${
                  paid ? "bg-spring/30 text-leaf-700" : "bg-ink/[0.06] text-muted"
                }`}
              >
                {paid && <Check size={12} strokeWidth={3} />}
                {shownElapsed.toFixed(1)}s
              </span>
            </div>

            <div className="mt-2 flex items-end justify-between gap-3">
              <p
                className={`font-display tracking-heading tabular text-[2rem] font-bold leading-none transition-colors duration-300 ${
                  paid ? "text-leaf-700" : "text-ink"
                }`}
              >
                +{euro(item.commission)}
              </p>
              <p className="pb-0.5 text-right text-[0.75rem] leading-tight text-muted">
                to {item.payee}
                <br />
                <span className="font-mono">{item.account}</span>
              </p>
            </div>

            {/* sale → split → sent → received */}
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {["Split", "Sent", "Received"].map((s, i) => {
                const done = shownElapsed >= ((i + 1) / 3) * PAYOUT_SECONDS - 0.05;
                return (
                  <div key={s}>
                    <div className="h-1 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-leaf transition-[width] duration-150"
                        style={{
                          width: `${Math.max(0, Math.min(1, (shownElapsed / PAYOUT_SECONDS) * 3 - i)) * 100}%`,
                        }}
                      />
                    </div>
                    <p
                      className={`mt-1.5 text-[0.7rem] font-medium transition-colors ${
                        done ? "text-ink" : "text-muted-2"
                      }`}
                    >
                      {s}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
