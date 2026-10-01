import { Nav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { PaymentStrip } from "@/components/site/payment-strip";
import { FixedList } from "@/components/site/fixed-list";
import { Audiences } from "@/components/site/audiences";
import { Journey } from "@/components/site/journey";
import { Toolkit } from "@/components/site/toolkit";
import { Marketplace } from "@/components/site/marketplace";
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
        <FixedList />
        <Audiences />
        <Journey />
        <Toolkit />
        <Marketplace />
        <Pricing />
        <Stories />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
