import Image from "next/image";
import { ArrowRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { euro, products, type Product } from "@/lib/content";

function ProductCard({ p }: { p: Product }) {
  return (
    <article className="group w-[284px] shrink-0 overflow-hidden rounded-[22px] bg-card ring-1 ring-line transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgb(14_42_30/0.45)] sm:w-[300px]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={p.image}
          alt=""
          fill
          sizes="300px"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[0.7rem] font-semibold text-ink backdrop-blur">
          {p.category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="truncate text-[1rem] font-semibold text-ink">{p.title}</h3>
        <p className="text-[0.8rem] text-muted">
          by {p.vendor} · {euro(p.price, 0)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex gap-3 sm:gap-4">
            <div>
              <p className="whitespace-nowrap text-[0.66rem] uppercase tracking-wider text-muted-2">Commission</p>
              <p className="font-mono tabular text-[0.88rem] font-semibold text-leaf-700">
                {Math.round(p.commission * 100)}%
              </p>
            </div>
            <div>
              <p className="whitespace-nowrap text-[0.66rem] uppercase tracking-wider text-muted-2">Per click</p>
              <p className="font-mono tabular text-[0.88rem] font-semibold text-ink">{euro(p.epc)}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[0.75rem] font-semibold text-cream transition-colors group-hover:bg-leaf-700">
            <Link2 size={13} /> Get link
          </span>
        </div>
      </div>
    </article>
  );
}

function Row({ items, reverse = false, duration }: { items: Product[]; reverse?: boolean; duration: string }) {
  return (
    <div className="marquee-pause relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div
        className={`flex w-max gap-4 pr-4 ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}
        style={{ ["--marquee-duration" as string]: duration }}
      >
        {[...items, ...items].map((p, i) => (
          <ProductCard key={`${p.title}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}

export function Marketplace() {
  return (
    <section id="marketplace" className="scroll-mt-24 overflow-hidden bg-paper-2 py-20 sm:py-28">
      <div className="container-affix">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="The marketplace"
            title="Find something worth recommending."
            lead="8,400 courses, memberships and guides, each with its real commission, conversion rate and earnings per click. No guessing which offer pays."
          />
          <div className="shrink-0">
            <Button href="#affiliates" variant="ink" size="lg">
              Browse all products
              <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-14 space-y-4 sm:mt-16">
        <Row items={products.slice(0, 5)} duration="70s" />
        <Row items={products.slice(5)} reverse duration="80s" />
      </div>
    </section>
  );
}
