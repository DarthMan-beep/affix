"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const links = [
  { label: "How it works", href: "#product" },
  { label: "Vendors", href: "#vendors" },
  { label: "Affiliates", href: "#affiliates" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Pricing", href: "#pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled || open
            ? "border-b border-line bg-paper/85 backdrop-blur-xl"
            : "border-b border-transparent bg-paper"
        }`}
      >
        <nav className="container-affix flex h-[72px] items-center justify-between gap-6">
          <Logo sizeClass="h-[30px] w-auto" className="text-ink" />

          <div className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="rounded-full px-4 py-2 text-[0.92rem] font-medium text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/sign-in"
              className="rounded-full px-4 py-2 text-[0.92rem] font-semibold text-ink transition-colors hover:bg-ink/[0.05]"
            >
              Log in
            </Link>
            <Button href="/sign-up?intent=vendor" variant="ink">
              Start selling
              <ArrowRight
                size={16}
                className="transition-transform group-hover/btn:translate-x-0.5"
              />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-ink/[0.05] lg:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-line bg-paper/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-affix flex flex-col gap-1 py-4">
              {links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-display rounded-2xl px-3 py-3 text-xl font-semibold text-ink hover:bg-ink/[0.04]"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button href="/sign-in" variant="outline" size="lg" onClick={() => setOpen(false)}>
                  Log in
                </Button>
                <Button href="/sign-up?intent=vendor" variant="ink" size="lg" onClick={() => setOpen(false)}>
                  Start selling
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
