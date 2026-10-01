import type { Metadata } from "next";
import { Geist, Geist_Mono, Parkinsans } from "next/font/google";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { MotionProvider } from "@/components/ui/motion-provider";
import "./globals.css";

// Headline face. Round geometric forms in the spirit of the Quinea Round
// brief; swap this import to change it (the CSS variable name stays put).
const display = Parkinsans({
  variable: "--font-parkinsans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  // Next has no metric overrides for this face; use a plain system fallback.
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const sans = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Affix — Affiliate marketing, fixed.",
  description:
    "Sell digital products through a checkout that converts, grow a network of affiliates who sell for you, and pay every commission within seconds of the sale.",
  keywords: [
    "affiliate marketing",
    "affiliate platform",
    "digital products",
    "instant payouts",
    "merchant of record",
  ],
  openGraph: {
    title: "Affix — Affiliate marketing, fixed.",
    description:
      "Checkout, tracking, VAT and commissions paid out in 2.4 seconds. The affiliate platform for digital products.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}
    >
      <body className="min-h-dvh bg-paper text-ink">
        <SmoothScroll />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
