import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";

/** Eyebrow + headline + optional lead, left-aligned by default. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone = "paper",
  align = "left",
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: "paper" | "forest";
  align?: "left" | "center";
  className?: string;
}) {
  const dark = tone === "forest";
  return (
    <Reveal
      className={`${align === "center" ? "mx-auto text-center" : ""} max-w-3xl ${className}`}
    >
      <p
        className={`label-mono inline-flex items-center gap-2 ${
          dark ? "text-spring" : "text-leaf-700"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-spring" : "bg-leaf"}`}
        />
        {eyebrow}
      </p>
      <h2
        className={`font-display tracking-heading mt-5 text-[clamp(2.25rem,4.6vw,4rem)] font-bold leading-[1.02] ${
          dark ? "text-cream" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={`mt-5 max-w-[60ch] text-[1.075rem] leading-relaxed ${
            align === "center" ? "mx-auto" : ""
          } ${dark ? "text-cream/70" : "text-muted"}`}
        >
          {lead}
        </p>
      )}
    </Reveal>
  );
}
