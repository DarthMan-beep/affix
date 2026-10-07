import { Nav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { PaymentStrip } from "@/components/site/payment-strip";
import { LiveNumbers } from "@/components/site/live-numbers";
import { FixedList } from "@/components/site/fixed-list";
import { Audiences } from "@/components/site/audiences";
import { HowItWorks } from "@/components/site/how-it-works";
import { Journey } from "@/components/site/journey";
import { Toolkit } from "@/components/site/toolkit";
import { Marketplace } from "@/components/site/marketplace";
import { Featured } from "@/components/site/featured";
import { Pricing } from "@/components/site/pricing";
import { Stories } from "@/components/site/stories";
import { Faq } from "@/components/site/faq";
import { FinalCta } from "@/components/site/final-cta";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PaymentStrip />
        <LiveNumbers />
        <FixedList />
        <Audiences />
        <HowItWorks />
        <Journey />
        <Toolkit />
        <Marketplace />
        <Featured />
        <Pricing />
        <Stories />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
