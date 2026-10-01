/*
 * Illustrative content for the landing page. Figures are example data for a
 * university project and are internally consistent (commission is calculated
 * on the net price after VAT; see src/lib/split.ts).
 */

export type Product = {
  title: string;
  vendor: string;
  category: string;
  price: number;
  commission: number; // share of net price, 0–1
  epc: number; // earnings per click, €
  image: string;
};

export const products: Product[] = [
  { title: "Pilates Foundations", vendor: "Lena Hoffmann", category: "Fitness", price: 149, commission: 0.4, epc: 3.12, image: "/images/product-pilates.jpg" },
  { title: "Sourdough at Home", vendor: "Jonas Berg", category: "Food", price: 89, commission: 0.3, epc: 1.86, image: "/images/product-sourdough.jpg" },
  { title: "Portrait Light Masterclass", vendor: "Theo Martin", category: "Photography", price: 199, commission: 0.35, epc: 2.74, image: "/images/product-camera.jpg" },
  { title: "The Paid Ads Playbook", vendor: "Sofia Reyes", category: "Marketing", price: 249, commission: 0.5, epc: 4.4, image: "/images/product-marketing.jpg" },
  { title: "Home Barista", vendor: "Luca Romano", category: "Food", price: 59, commission: 0.3, epc: 1.22, image: "/images/product-espresso.jpg" },
  { title: "Watercolor Botanicals", vendor: "Inès Dubois", category: "Art", price: 79, commission: 0.35, epc: 1.48, image: "/images/product-watercolor.jpg" },
  { title: "Spanish in 90 Days", vendor: "Carmen Vidal", category: "Languages", price: 129, commission: 0.4, epc: 2.3, image: "/images/product-seville.jpg" },
  { title: "Strength for Runners", vendor: "Nils Eriksen", category: "Fitness", price: 69, commission: 0.3, epc: 1.35, image: "/images/product-runners.jpg" },
  { title: "Guitar from Zero", vendor: "Sam Okafor", category: "Music", price: 99, commission: 0.35, epc: 1.92, image: "/images/product-guitar.jpg" },
  { title: "Plant-Based Kitchen", vendor: "Mira Kapoor", category: "Food", price: 49, commission: 0.3, epc: 0.96, image: "/images/product-salad.jpg" },
];

export const euro = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

export type Story = {
  name: string;
  role: string;
  city: string;
  side: "Vendor" | "Affiliate";
  quote: string;
  metric: string;
  metricLabel: string;
  image: string;
};

export const stories: Story[] = [
  {
    name: "Lena Hoffmann",
    role: "Pilates instructor",
    city: "Hamburg",
    side: "Vendor",
    quote:
      "I used to chase affiliates for invoices every month. Now 214 of them sell my course, and I never think about payouts.",
    metric: "€212k",
    metricLabel: "in affiliate sales in her first year",
    image: "/images/story-lena.jpg",
  },
  {
    name: "Arjun Mehta",
    role: "Personal finance educator",
    city: "Berlin",
    side: "Affiliate",
    quote:
      "I only recommend courses I have taken myself. The commission is in my account before the buyer finishes the first lesson.",
    metric: "€4,870",
    metricLabel: "in commissions last month",
    image: "/images/story-arjun.jpg",
  },
  {
    name: "Jonas Berg",
    role: "Baker and course creator",
    city: "Copenhagen",
    side: "Vendor",
    quote:
      "Moving my sourdough course took an afternoon. VAT for nineteen countries is simply handled.",
    metric: "31%",
    metricLabel: "of his revenue now comes from order bumps",
    image: "/images/story-jonas.jpg",
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: "What does it mean that Affix is the Merchant of Record?",
    a: "Affix is the legal seller in every transaction. We charge the buyer, calculate and remit VAT in each country, issue compliant invoices and handle refunds and chargebacks. You receive your share as a single payout, with none of the tax filings.",
  },
  {
    q: "How can commissions pay out within seconds?",
    a: "Once a payment clears our risk checks, the split is calculated and the affiliate's share is sent over instant bank rails (SEPA Instant in the EU) or to a debit card. The median time from payment to payout over the last 90 days was 2.4 seconds.",
  },
  {
    q: "What does Affix cost?",
    a: "4.9% + €1 per successful sale, taken from the vendor's share. There is no monthly fee, no setup fee and nothing to pay while you are not selling. Affiliates never pay anything. Volume pricing starts at €50k in monthly sales.",
  },
  {
    q: "Can I bring my own affiliates?",
    a: "Yes. Invite partners with a private link, set individual commission rates per affiliate or per product, and decide whether your product also appears in the public marketplace.",
  },
  {
    q: "What can I sell on Affix?",
    a: "Online courses, memberships, coaching programmes, e-books, templates, software licences and event tickets. Everything is delivered automatically after purchase, including access to the built-in member area.",
  },
  {
    q: "How does tracking work without third-party cookies?",
    a: "Every smart link is resolved on our servers, and the click is matched to the purchase with a first-party identifier. Attribution survives ad blockers, private browsing and a switch from phone to laptop, for up to 180 days.",
  },
];
