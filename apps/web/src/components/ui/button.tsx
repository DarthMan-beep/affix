import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "spring" | "ink" | "glass" | "outline" | "cream";
type Size = "md" | "lg";

const base =
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[transform,background-color,box-shadow,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]";

const sizes: Record<Size, string> = {
  md: "h-10 px-5 text-[0.9rem]",
  lg: "h-13 px-7 text-[1rem]",
};

const variants: Record<Variant, string> = {
  // Luminous green: the primary action everywhere
  spring:
    "bg-spring text-ink hover:bg-spring-300 shadow-[0_10px_30px_-12px_rgb(125_239_161/0.8)] hover:-translate-y-0.5",
  // Forest pill for paper surfaces
  ink: "bg-ink text-cream hover:bg-forest-700 hover:-translate-y-0.5",
  // Frosted pill for photography and dark surfaces
  glass: "glass text-cream hover:bg-white/20",
  // Low-emphasis on paper
  outline:
    "bg-transparent text-ink ring-1 ring-inset ring-ink/15 hover:ring-ink/40 hover:bg-ink/[0.03]",
  // Light pill on forest
  cream: "bg-cream text-ink hover:bg-white hover:-translate-y-0.5",
};

export function Button({
  href,
  variant = "spring",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}
