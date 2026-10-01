import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaskLines, Rise, Settle } from "@/components/ui/rise";
import { HeroFeed, LiveCounter } from "@/components/site/hero-feed";
import { HeroVideo } from "@/components/site/hero-video";

const faces = ["/images/story-lena.jpg", "/images/story-arjun.jpg", "/images/story-jonas.jpg"];

export function Hero() {
  return (
    <section className="px-2 sm:px-3">
      <div className="relative isolate flex min-h-[640px] overflow-hidden rounded-[28px] bg-forest-900 sm:rounded-[36px] lg:h-[calc(100svh-84px)] lg:max-h-[900px] lg:min-h-[700px]">
        <Settle className="absolute inset-0 -z-20">
          <Image
            src="/images/hero.jpg"
            alt="A creator smiling at her phone in a green home studio as a commission arrives"
            fill
            preload
            quality={90}
            sizes="100vw"
            className="object-cover object-[68%_40%] sm:object-[62%_45%]"
          />
          <HeroVideo className="object-cover object-[68%_40%] sm:object-[62%_45%]" />
        </Settle>
        {/* Scrims: forest wash on the left for the headline, depth at the bottom */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(6_19_12/0.78)_0%,rgb(6_19_12/0.5)_34%,rgb(6_19_12/0)_58%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-forest-950/90 via-forest-950/40 to-transparent lg:h-1/2 lg:from-forest-950/70" />

        <div className="container-affix relative flex flex-col justify-end pb-10 pt-28 sm:pb-14 lg:pb-16">
          <Rise delay={0.1}>
            <LiveCounter />
          </Rise>

          <MaskLines
            delay={0.2}
            className="font-display tracking-display mt-6 text-[clamp(3.4rem,8.4vw,7.6rem)] font-bold leading-[0.9] text-cream"
            lines={["Affiliate", "marketing,", <span key="f" className="text-spring">fixed.</span>]}
          />

          <Rise delay={0.65}>
            <p className="mt-7 max-w-[34rem] text-[1.075rem] leading-relaxed text-cream/80 sm:text-[1.15rem]">
              Sell digital products through a checkout that converts, grow a
              network of affiliates who sell for you, and pay every commission
              within seconds of the sale.
            </p>
          </Rise>

          <Rise delay={0.8} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/sign-up?intent=vendor" size="lg">
              Start selling
              <ArrowRight
                size={18}
                className="transition-transform group-hover/btn:translate-x-0.5"
              />
            </Button>
            <Button href="/sign-up?intent=affiliate" variant="glass" size="lg">
              Join as an affiliate
            </Button>
          </Rise>

          <Rise delay={0.95} className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {faces.map((src) => (
                <span
                  key={src}
                  className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-forest-900"
                >
                  <Image src={src} alt="" fill sizes="36px" className="object-cover object-top" />
                </span>
              ))}
            </div>
            <p className="text-sm leading-snug text-cream/75">
              <span className="font-semibold text-cream">12,400 vendors</span> and{" "}
              <span className="font-semibold text-cream">120,000 affiliates</span>
              <br className="sm:hidden" /> sell on Affix
            </p>
          </Rise>
        </div>

        <HeroFeed />
      </div>
    </section>
  );
}
