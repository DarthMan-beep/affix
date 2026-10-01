"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { faqs } from "@/lib/content";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-affix grid gap-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
        <div>
          <SectionHeading eyebrow="FAQ" title="Questions, answered." />
          <p className="mt-6 max-w-sm text-[1rem] leading-relaxed text-muted">
            Something else on your mind?{" "}
            <Link href="#start" className="font-semibold text-ink underline decoration-leaf decoration-2 underline-offset-4 hover:decoration-ink">
              Talk to our team
            </Link>
            . A real person replies within one business day.
          </p>
        </div>

        <ul className="border-b border-line">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className="border-t border-line">
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-display tracking-heading text-[1.2rem] font-semibold leading-snug text-ink sm:text-[1.35rem]">
                      {f.q}
                    </span>
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
                        isOpen ? "bg-ink text-spring" : "bg-ink/[0.06] text-ink"
                      }`}
                    >
                      <Plus
                        size={18}
                        className={`transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                      />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-a-${i}`}
                      role="region"
                      aria-labelledby={`faq-q-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[62ch] pb-7 pr-12 text-[1rem] leading-relaxed text-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
