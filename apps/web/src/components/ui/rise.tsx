"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// Reduced motion is handled globally by MotionProvider (reducedMotion="user").

const ease = [0.16, 1, 0.3, 1] as const;

/** Page-load entrance: fade and rise, used for above-the-fold content. */
export function Rise({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Headline lines that slide up out of a clipping mask, one after another. */
export function MaskLines({
  lines,
  className = "",
  delay = 0,
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
}) {
  return (
    <h1 className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block"
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 1.1, delay: delay + i * 0.11, ease }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/** Slow settle from a slight zoom, for the hero photograph. */
export function Settle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 1.08, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 2.2, ease }}
    >
      {children}
    </motion.div>
  );
}
