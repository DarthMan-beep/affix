/*
 * Development seed: demo accounts, vendors, products, affiliate links, and a
 * few weeks of demo activity (clicks, orders, commissions and a payout).
 * Lives in the auth package because users are created through Better Auth's
 * own sign-up API, so passwords are hashed exactly as in production.
 * Safe to re-run: existing rows are left alone.
 *
 *   npm run db:seed
 */
import { betterAuth } from "better-auth";
import {
  affiliate,
  affiliateLink,
  and,
  click,
  closeDb,
  commission,
  db,
  eq,
  inArray,
  isNull,
  order,
  payout,
  payoutMethod,
  product,
  user,
  vendor,
} from "@affix/db";
import { authOptions } from "./options";

// Scripts run outside Next.js: no cookie plugin, and no verification emails.
const auth = betterAuth({
  ...authOptions,
  emailVerification: { ...authOptions.emailVerification, sendOnSignUp: false },
});

export const DEMO_PASSWORD = "affix-demo-2026";

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function ensureUser(name: string, email: string, role: "user" | "admin" = "user") {
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) return existing.id;
  const { user: created } = await auth.api.signUpEmail({
    body: { name, email, password: DEMO_PASSWORD },
  });
  await db.update(user).set({ emailVerified: true, role }).where(eq(user.id, created.id));
  return created.id;
}

async function ensureVendor(userId: string, displayName: string) {
  await db
    .insert(vendor)
    .values({ userId, displayName, slug: slugify(displayName) })
    .onConflictDoNothing({ target: vendor.userId });
  const row = await db.query.vendor.findFirst({ where: eq(vendor.userId, userId) });
  return row!.id;
}

async function ensureAffiliate(userId: string, handle: string) {
  await db.insert(affiliate).values({ userId, handle }).onConflictDoNothing({ target: affiliate.userId });
  const row = await db.query.affiliate.findFirst({ where: eq(affiliate.userId, userId) });
  return row!.id;
}

// Mirrors the marketplace shown on the landing page (apps/web/src/lib/content.ts)
const catalog = [
  { title: "Pilates Foundations", description: "Eight weeks of mat pilates for beginners: short daily sessions that build core strength, posture and control, filmed in Lena's Hamburg studio.", vendor: "Lena Hoffmann", category: "Fitness", price: 149, commission: 0.4, image: "/images/product-pilates.jpg" },
  { title: "Sourdough at Home", description: "From starter to a crackling crust in your own oven. Jonas walks you through every fold, proof and bake, with a schedule that fits a working week.", vendor: "Jonas Berg", category: "Food", price: 89, commission: 0.3, image: "/images/product-sourdough.jpg" },
  { title: "Portrait Light Masterclass", description: "Learn to shape natural and studio light for portraits. Twelve lessons, from a single window to a three-light setup, with raw files to practise on.", vendor: "Theo Martin", category: "Photography", price: 199, commission: 0.35, image: "/images/product-camera.jpg" },
  { title: "The Paid Ads Playbook", description: "A practical system for profitable campaigns on Meta and Google: account structure, creative testing and the numbers that tell you when to scale.", vendor: "Sofia Reyes", category: "Marketing", price: 249, commission: 0.5, image: "/images/product-marketing.jpg" },
  { title: "Home Barista", description: "Dial in espresso and steam silky milk at home. Covers grinders, recipes and latte art basics for any machine.", vendor: "Luca Romano", category: "Food", price: 59, commission: 0.3, image: "/images/product-espresso.jpg" },
  { title: "Watercolor Botanicals", description: "Paint leaves, flowers and loose bouquets in watercolor. Step-by-step projects with printable outlines and a short supply list.", vendor: "Inès Dubois", category: "Art", price: 79, commission: 0.35, image: "/images/product-watercolor.jpg" },
  { title: "Spanish in 90 Days", description: "A daily 20-minute routine that takes you from zero to real conversations, with audio drills recorded in Seville.", vendor: "Carmen Vidal", category: "Languages", price: 129, commission: 0.4, image: "/images/product-seville.jpg" },
  { title: "Strength for Runners", description: "Two strength sessions a week designed around your running plan, to run faster and stay injury-free. No gym needed.", vendor: "Nils Eriksen", category: "Fitness", price: 69, commission: 0.3, image: "/images/product-runners.jpg" },
  { title: "Guitar from Zero", description: "Your first chords, strumming patterns and five full songs. Made for adults who have never picked up a guitar.", vendor: "Sam Okafor", category: "Music", price: 99, commission: 0.35, image: "/images/product-guitar.jpg" },
  { title: "Plant-Based Kitchen", description: "Thirty weeknight recipes and the techniques behind them: sauces, textures and batch cooking without the fuss.", vendor: "Mira Kapoor", category: "Food", price: 49, commission: 0.3, image: "/images/product-salad.jpg" },
];

// Affiliates and their links (clicks match the landing-page examples)
const affiliates = [
  {
    name: "Maya Kowalski",
    handle: "maya",
    links: [
      { product: "Sourdough at Home", clicks: 1284 },
      { product: "Pilates Foundations", clicks: 612 },
      { product: "Home Barista", clicks: 240 },
    ],
  },
  {
    name: "Arjun Mehta",
    handle: "arjun",
    links: [
      { product: "The Paid Ads Playbook", clicks: 903 },
      { product: "Spanish in 90 Days", clicks: 377 },
    ],
  },
  // Jonas sells his own course and also promotes a colleague's: one account, both roles.
  { name: "Jonas Berg", handle: "jonas", links: [{ product: "Home Barista", clicks: 58 }] },
];

const emailFor = (name: string) => `${slugify(name.split(" ")[0])}@affix.dev`;

/* ------------------------------------------------------------ demo activity */

// Sales over the last two months. `via` is the affiliate handle (null = direct sale).
const sales: { product: string; via: string | null; daysAgo: number[] }[] = [
  { product: "Sourdough at Home", via: "maya", daysAgo: [58, 51, 44, 33, 27, 21, 16, 9, 4, 1] },
  { product: "Pilates Foundations", via: "maya", daysAgo: [47, 30, 18, 6] },
  { product: "Home Barista", via: "maya", daysAgo: [38, 12] },
  { product: "The Paid Ads Playbook", via: "arjun", daysAgo: [25, 10, 3] },
  { product: "Spanish in 90 Days", via: "arjun", daysAgo: [20, 2] },
  { product: "Home Barista", via: "jonas", daysAgo: [7] },
  { product: "Sourdough at Home", via: null, daysAgo: [15, 5] },
  { product: "Pilates Foundations", via: null, daysAgo: [22] },
];

const buyers = [
  { name: "Hanna Vogel", country: "DE", vatBps: 1900 },
  { name: "Pierre Lambert", country: "FR", vatBps: 2000 },
  { name: "Sanne de Vries", country: "NL", vatBps: 2100 },
  { name: "Marco Bianchi", country: "IT", vatBps: 2200 },
  { name: "Elin Lindqvist", country: "SE", vatBps: 2500 },
  { name: "Lucía Navarro", country: "ES", vatBps: 2100 },
  { name: "Tobias Gruber", country: "AT", vatBps: 2000 },
  { name: "Aoife Byrne", country: "IE", vatBps: 2300 },
];
const sources = ["https://www.instagram.com/", "https://www.youtube.com/", "https://t.co/", null];
const devices = ["mobile", "desktop", "mobile", "tablet"] as const;

const DAY = 24 * 60 * 60 * 1000;
// Maya's commissions older than this were already paid out in the demo.
const PAID_OUT_BEFORE_DAYS = 40;

/** Same maths as apps/web/src/lib/money.ts: 4.9% + €1 fee, commission on the net price. */
function split(grossCents: number, vatBps: number, commissionBps: number | null) {
  const netCents = Math.round((grossCents * 10_000) / (10_000 + vatBps));
  const feeCents = Math.round(grossCents * 0.049) + 100;
  const affiliateCents =
    commissionBps === null ? 0 : Math.min(Math.round((netCents * commissionBps) / 10_000), netCents - feeCents);
  return {
    grossCents,
    vatBps,
    vatCents: grossCents - netCents,
    netCents,
    feeCents,
    affiliateCents,
    vendorCents: netCents - feeCents - affiliateCents,
  };
}

/** Clicks, orders, commissions, payout methods and one completed payout. Runs once. */
async function seedActivity() {
  if ((await db.$count(order)) > 0) return;

  const now = Date.now();
  let n = 0;
  for (const sale of sales) {
    const p = await db.query.product.findFirst({ where: eq(product.title, sale.product) });
    if (!p) continue;
    const link = sale.via
      ? await db.query.affiliateLink.findFirst({
          where: eq(affiliateLink.code, `${sale.via}/${p.slug}`),
        })
      : undefined;

    for (const daysAgo of sale.daysAgo) {
      n += 1;
      const buyer = buyers[n % buyers.length];
      const createdAt = new Date(now - daysAgo * DAY - (n % 9) * 60 * 60 * 1000);
      const money = split(p.priceCents, buyer.vatBps, link ? p.commissionBps : null);

      let clickId: string | null = null;
      if (link) {
        const [c] = await db
          .insert(click)
          .values({
            linkId: link.id,
            affiliateId: link.affiliateId,
            productId: p.id,
            visitorId: crypto.randomUUID(),
            device: devices[n % devices.length],
            browser: n % 3 === 0 ? "Safari" : "Chrome",
            referrer: sources[n % sources.length],
            country: buyer.country,
            createdAt: new Date(createdAt.getTime() - 2 * 60 * 60 * 1000),
          })
          .returning({ id: click.id });
        clickId = c.id;
      }

      const [o] = await db
        .insert(order)
        .values({
          number: `AFX-DEMO${String(n).padStart(4, "0")}`,
          productId: p.id,
          vendorId: p.vendorId,
          buyerName: buyer.name,
          buyerEmail: `${slugify(buyer.name)}@example.com`,
          buyerCountry: buyer.country,
          ...money,
          clickId,
          linkId: link?.id ?? null,
          affiliateId: link?.affiliateId ?? null,
          createdAt,
        })
        .returning({ id: order.id });

      if (link && money.affiliateCents > 0) {
        const availableAt = new Date(createdAt.getTime() + p.refundDays * DAY);
        const approved = availableAt.getTime() <= now;
        await db.insert(commission).values({
          orderId: o.id,
          affiliateId: link.affiliateId,
          productId: p.id,
          amountCents: money.affiliateCents,
          status: approved ? "approved" : "pending",
          availableAt,
          approvedAt: approved ? availableAt : null,
          createdAt,
        });
      }
    }
  }

  // Maya has a payout method and one payout already completed; the rest of her
  // approved balance is waiting to be withdrawn. (Made-up test IBAN.)
  const maya = await db.query.affiliate.findFirst({ where: eq(affiliate.handle, "maya") });
  if (maya) {
    await db.insert(payoutMethod).values({
      affiliateId: maya.id,
      type: "bank",
      holder: "Maya Kowalski",
      details: "DE00000000000000000000",
      isDefault: true,
    });

    const cutoff = now - PAID_OUT_BEFORE_DAYS * DAY;
    const old = (
      await db.query.commission.findMany({
        where: and(eq(commission.affiliateId, maya.id), eq(commission.status, "approved")),
      })
    ).filter((c) => c.createdAt.getTime() < cutoff);

    if (old.length > 0) {
      const paidAt = new Date(now - 35 * DAY);
      const [po] = await db
        .insert(payout)
        .values({
          reference: "PO-DEMO0001",
          affiliateId: maya.id,
          amountCents: old.reduce((s, c) => s + c.amountCents, 0),
          methodType: "bank",
          methodHolder: "Maya Kowalski",
          methodDetails: "DE00000000000000000000",
          status: "completed",
          requestedAt: new Date(paidAt.getTime() - 2 * DAY),
          sentAt: new Date(paidAt.getTime() - DAY),
          completedAt: paidAt,
        })
        .returning({ id: payout.id });
      await db
        .update(commission)
        .set({ payoutId: po.id })
        .where(inArray(commission.id, old.map((c) => c.id)));
    }
  }
}

async function main() {
  console.info("Seeding Affix…");

  await ensureUser("Affix Admin", "admin@affix.dev", "admin");

  const productIds = new Map<string, string>();
  for (const item of catalog) {
    const userId = await ensureUser(item.vendor, emailFor(item.vendor));
    const vendorId = await ensureVendor(userId, item.vendor);
    const slug = slugify(item.title);
    await db
      .insert(product)
      .values({
        vendorId,
        slug,
        title: item.title,
        description: item.description,
        category: item.category,
        priceCents: Math.round(item.price * 100),
        commissionBps: Math.round(item.commission * 10_000),
        imageUrl: item.image,
        status: "published",
      })
      .onConflictDoNothing({ target: product.slug });
    // Products seeded before descriptions existed get theirs filled in.
    await db
      .update(product)
      .set({ description: item.description })
      .where(and(eq(product.slug, slug), isNull(product.description)));
    const row = await db.query.product.findFirst({ where: eq(product.slug, slug) });
    productIds.set(item.title, row!.id);
  }

  for (const a of affiliates) {
    const userId = await ensureUser(a.name, emailFor(a.name));
    const affiliateId = await ensureAffiliate(userId, a.handle);
    for (const link of a.links) {
      await db
        .insert(affiliateLink)
        .values({
          affiliateId,
          productId: productIds.get(link.product)!,
          code: `${a.handle}/${slugify(link.product)}`,
          clicks: link.clicks,
        })
        .onConflictDoNothing();
    }
  }

  await seedActivity();

  const [users, products, links, orders] = await Promise.all([
    db.$count(user),
    db.$count(product),
    db.$count(affiliateLink),
    db.$count(order),
  ]);
  console.info(`Done: ${users} users, ${products} products, ${links} affiliate links, ${orders} orders.\n`);
  console.info(`Demo accounts (password for all: ${DEMO_PASSWORD})`);
  console.info("  admin@affix.dev   platform admin");
  console.info("  jonas@affix.dev   vendor + affiliate");
  console.info("  lena@affix.dev    vendor");
  console.info("  maya@affix.dev    affiliate");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
