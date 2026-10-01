import Link from "next/link";
import { PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5">
      <section className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-spring">
          <PackageX size={24} />
        </span>
        <h1 className="font-display tracking-heading mt-6 text-[2rem] font-bold text-ink">Product not found</h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-muted">
          This product doesn&apos;t exist or is no longer for sale.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[0.92rem] font-semibold text-cream hover:bg-forest-700"
        >
          Back to Affix
        </Link>
      </section>
    </main>
  );
}
