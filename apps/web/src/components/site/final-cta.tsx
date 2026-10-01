import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuillocheBand, GuillocheRosette } from "@/components/ui/guilloche";
import { AffixSymbol } from "@/components/ui/logo";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  return (
    <section id="start" className="scroll-mt-24 px-2 pb-3 sm:px-3">
      <Reveal>
        <div className="grain relative isolate overflow-hidden rounded-[28px] bg-forest-900 px-6 py-20 sm:rounded-[36px] sm:px-12 sm:py-28">
          <GuillocheRosette className="animate-rotate-slow pointer-events-none absolute -right-40 top-1/2 -z-10 w-[46rem] -translate-y-1/2 text-leaf/[0.12] sm:-right-24 lg:right-[-6rem]" />
          <GuillocheBand className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 text-leaf/[0.12]" />
          <div className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-leaf/15 blur-[120px]" />

          <div className="container-affix relative px-0">
            <AffixSymbol className="h-12 w-auto text-leaf" />
            <h2 className="font-display tracking-display mt-8 max-w-[14ch] text-[clamp(2.8rem,6.4vw,5.6rem)] font-bold leading-[0.95] text-cream">
              Your next sale could pay out in <span className="text-spring">2.4 seconds.</span>
            </h2>
            <p className="mt-6 max-w-[38rem] text-[1.1rem] leading-relaxed text-cream/70">
              Create your account in two minutes. List a product today, or pick one
              from the marketplace and share your first link.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button href="/sign-up?intent=vendor" size="lg">
                Start selling
                <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-0.5" />
              </Button>
              <Button href="/sign-up?intent=affiliate" variant="glass" size="lg">
                Join as an affiliate
              </Button>
            </div>
            <p className="mt-6 text-[0.85rem] text-cream/50">
              Free to start · No monthly fees · Cancel anytime
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
