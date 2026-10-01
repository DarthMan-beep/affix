import Link from "next/link";
import { AffixWordmark } from "@/components/ui/logo";

const columns = [
  { title: "Product", links: ["Checkout", "Smart links", "Marketplace", "Member area", "Analytics", "Pricing"] },
  { title: "Solutions", links: ["For vendors", "For affiliates", "Course creators", "Coaches", "Agencies"] },
  { title: "Resources", links: ["Help centre", "Affiliate academy", "API docs", "Status", "Changelog"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
];

export function Footer() {
  return (
    <footer className="pt-20 sm:pt-24">
      <div className="container-affix">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="col-span-2 max-w-xs sm:col-span-4 lg:col-span-1">
            <p className="font-display tracking-heading text-[1.5rem] font-bold leading-tight text-ink">
              Affiliate marketing, fixed.
            </p>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
              The platform where vendors launch digital products and affiliates are
              paid the second they sell.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="label-mono text-muted-2">{col.title}</h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-[0.92rem] text-ink/80 transition-colors hover:text-ink">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-7 text-[0.85rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Affix. A university project.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="#" className="hover:text-ink">Privacy</Link>
            <Link href="#" className="hover:text-ink">Terms</Link>
            <Link href="#" className="hover:text-ink">Cookies</Link>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-leaf" /> All systems operational
            </span>
          </div>
        </div>
      </div>

      {/* Oversized wordmark, cropped by the page edge */}
      <div className="mt-12 overflow-hidden px-2 sm:px-3" aria-hidden="true">
        <AffixWordmark className="-mb-[7%] h-auto w-full text-ink" />
      </div>
    </footer>
  );
}
