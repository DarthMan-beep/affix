import { ArrowRight, Link2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const sides = [
  {
    side: "For vendors",
    icon: Store,
    title: "Put a product in front of people who can sell it.",
    steps: [
      { title: "Open a selling workspace", body: "Create a free account and choose Sell. It takes a minute." },
      {
        title: "Add your product",
        body: "Set the price, the commission (a percentage or a fixed amount), how long a click counts and the refund window.",
      },
      {
        title: "Let affiliates in",
        body: "Keep the product open to every affiliate, or approve each application yourself. Give your best partners their own rate.",
      },
      {
        title: "Watch every order split",
        body: "Each sale shows VAT, the Affix fee, the commission and what you keep. Commissions clear on their own or wait for your review.",
      },
    ],
    cta: "Start selling",
    href: "/sign-up?intent=vendor",
    variant: "ink" as const,
  },
  {
    side: "For affiliates",
    icon: Link2,
    title: "Earn on products you would recommend anyway.",
    steps: [
      { title: "Open a promoting workspace", body: "Create a free account and choose Promote. You get your own handle." },
      {
        title: "Pick products",
        body: "Browse the marketplace by category and commission, then take a smart link or a ready-made banner.",
      },
      {
        title: "Share your links",
        body: "One link per campaign, so you can see which post, video or newsletter brought the clicks and the sales.",
      },
      {
        title: "Get paid",
        body: "A commission is pending during the refund window, then yours to withdraw. Invite other affiliates and earn a bonus on theirs too.",
      },
    ],
    cta: "Start promoting",
    href: "/sign-up?intent=affiliate",
    variant: "spring" as const,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-affix">
        <SectionHeading
          eyebrow="How it works"
          title="Two ways in. Four steps each."
          lead="Whether you make the product or recommend it, you are set up in an afternoon. One account can do both."
        />

        <div className="mt-14 grid gap-4 sm:mt-16 lg:grid-cols-2 lg:gap-5">
          {sides.map((s, i) => (
            <Reveal key={s.side} delay={i * 0.08}>
              <article className="flex h-full flex-col rounded-[28px] bg-card p-6 ring-1 ring-line sm:p-9">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-spring">
                    <s.icon size={18} />
                  </span>
                  <p className="label-mono text-leaf-700">{s.side}</p>
                </div>
                <h3 className="font-display tracking-heading mt-6 max-w-[20ch] text-[clamp(1.6rem,2.6vw,2.2rem)] font-bold leading-[1.06] text-ink">
                  {s.title}
                </h3>

                <ol className="mt-8 flex-1 space-y-6">
                  {s.steps.map((step, n) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="font-mono tabular grid h-8 w-8 shrink-0 place-items-center rounded-full bg-spring/30 text-[0.8rem] font-semibold text-leaf-700">
                        {n + 1}
                      </span>
                      <div>
                        <p className="text-[1.02rem] font-semibold text-ink">{step.title}</p>
                        <p className="mt-1 max-w-[46ch] text-[0.95rem] leading-relaxed text-muted">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-9">
                  <Button href={s.href} variant={s.variant} size="lg">
                    {s.cta}
                    <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-0.5" />
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
