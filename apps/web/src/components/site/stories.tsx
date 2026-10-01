import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { stories } from "@/lib/content";

const numbers = [
  { value: "€48M", label: "paid to affiliates" },
  { value: "2.4s", label: "median payout time" },
  { value: "12,400", label: "vendors selling" },
  { value: "36", label: "countries with buyers" },
];

export function Stories() {
  return (
    <section id="stories" className="grain relative isolate scroll-mt-16 bg-forest-950 py-24 sm:py-32">
      <div className="container-affix">
        <SectionHeading
          tone="forest"
          eyebrow="Stories"
          title="People who sell on Affix."
          lead="Instructors, bakers and educators who moved their products and partners over, in their own words."
        />

        <dl className="mt-14 grid grid-cols-2 gap-y-8 border-y border-cream/10 py-8 sm:mt-16 lg:grid-cols-4">
          {numbers.map((n, i) => (
            <Reveal
              key={n.label}
              delay={i * 0.06}
              className={`px-2 sm:px-6 ${i % 2 === 1 ? "border-l border-cream/10" : ""} ${i > 0 ? "lg:border-l lg:border-cream/10" : ""}`}
            >
              <dt className="sr-only">{n.label}</dt>
              <dd className="font-display tracking-heading tabular text-[clamp(2.2rem,4vw,3.4rem)] font-bold leading-none text-cream">
                {n.value}
              </dd>
              <dd className="mt-2 text-[0.9rem] text-cream/60">{n.label}</dd>
            </Reveal>
          ))}
        </dl>

        <div className="mt-14 grid gap-6 md:grid-cols-3 lg:gap-8">
          {stories.map((s, i) => (
            <Reveal key={s.name} delay={i * 0.08} className="h-full">
              <figure className="flex h-full flex-col">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[24px]">
                  <Image
                    src={s.image}
                    alt={`${s.name}, ${s.role}`}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover object-top"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-forest-950/85 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-forest-950/75 px-3 py-1 text-[0.72rem] font-semibold text-cream backdrop-blur">
                    {s.side}
                  </span>
                  <figcaption className="absolute inset-x-5 bottom-5">
                    <p className="font-display text-[1.2rem] font-bold text-cream">{s.name}</p>
                    <p className="text-[0.85rem] text-cream/70">
                      {s.role} · {s.city}
                    </p>
                  </figcaption>
                </div>
                <blockquote className="font-display tracking-heading mt-6 flex-1 text-[1.3rem] font-semibold leading-snug text-cream">
                  &ldquo;{s.quote}&rdquo;
                </blockquote>
                <p className="mt-6 flex items-baseline gap-3 border-t border-cream/10 pt-5">
                  <span className="font-display tabular text-[2rem] font-bold leading-none text-spring">
                    {s.metric}
                  </span>
                  <span className="text-[0.88rem] leading-snug text-cream/60">{s.metricLabel}</span>
                </p>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
