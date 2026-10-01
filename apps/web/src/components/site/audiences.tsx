import Image from "next/image";
import { ArrowRight, Check, Link2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const cards = [
  {
    id: "vendors",
    side: "For vendors",
    title: "Launch a product and let affiliates sell it.",
    points: [
      "Checkout, VAT and invoices from day one",
      "Set commission per product or per affiliate",
      "Recruit from 120,000 affiliates, or invite your own",
    ],
    cta: "Start selling",
    href: "/sign-up?intent=vendor",
    image: "/images/vendor-studio.jpg",
    alt: "A course creator recording a lesson at his desk",
    position: "object-[50%_30%]",
    chip: {
      icon: TrendingUp,
      label: "Revenue this month",
      value: "€38,860",
      note: "+18.2%",
    },
  },
  {
    id: "affiliates",
    side: "For affiliates",
    title: "Recommend what you love. Get paid the moment it sells.",
    points: [
      "8,400 products with real conversion data",
      "One smart link per product, tracked for 180 days",
      "Commission in your account 2.4 seconds after a sale",
    ],
    cta: "Browse the marketplace",
    href: "#marketplace",
    image: "/images/affiliate-creator.jpg",
    alt: "A content creator filming a video recommendation on her phone",
    position: "object-[40%_30%]",
    chip: {
      icon: Link2,
      label: "affix.to/mei/pilates",
      value: "1,284 clicks",
      note: "57 sales",
    },
  },
];

export function Audiences() {
  return (
    <section className="scroll-mt-24 bg-paper-2 py-20 sm:py-28">
      <div className="container-affix">
        <SectionHeading
          eyebrow="Two sides, one platform"
          title="Built for both sides of every sale."
          lead="Vendors get a storefront, a checkout and a sales team. Affiliates get products worth recommending and commissions that arrive the same second."
        />

        <div className="mt-14 grid gap-4 sm:mt-16 lg:grid-cols-2 lg:gap-5">
          {cards.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.08}>
              <article
                id={c.id}
                className="group relative isolate flex min-h-[640px] scroll-mt-28 flex-col justify-end overflow-hidden rounded-[28px] bg-forest-900 p-6 sm:min-h-[720px] sm:p-9"
              >
                <Image
                  src={c.image}
                  alt={c.alt}
                  fill
                  quality={90}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className={`-z-20 object-cover ${c.position} transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]`}
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-950 via-forest-950/55 to-transparent" />

                {/* Floating product UI */}
                <div className="ui-card absolute left-6 top-6 flex items-center gap-3 rounded-2xl px-3.5 py-3 sm:left-9 sm:top-9">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-spring">
                    <c.chip.icon size={17} />
                  </span>
                  <div>
                    <p className="font-mono text-[0.72rem] text-muted">{c.chip.label}</p>
                    <p className="tabular text-[0.95rem] font-semibold text-ink">
                      {c.chip.value}{" "}
                      <span className="ml-1 rounded-full bg-spring/35 px-1.5 py-0.5 text-[0.7rem] font-semibold text-leaf-700">
                        {c.chip.note}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="label-mono text-spring">{c.side}</p>
                <h3 className="font-display tracking-heading mt-4 max-w-[18ch] text-[clamp(2rem,3.4vw,2.9rem)] font-bold leading-[1.02] text-cream">
                  {c.title}
                </h3>
                <ul className="mt-6 space-y-2.5">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[0.98rem] text-cream/80">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-spring/20 text-spring">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button href={c.href} variant={i === 0 ? "spring" : "cream"} size="lg">
                    {c.cta}
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover/btn:translate-x-0.5"
                    />
                  </Button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
