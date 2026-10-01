"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Site-wide motion settings. With reducedMotion="user", people who ask their
 * OS for less motion get no movement (transforms jump to their end state)
 * while fades still run. Components never branch on the setting themselves,
 * so server and client render the same markup.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
