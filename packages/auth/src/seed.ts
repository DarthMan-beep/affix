/*
 * Development seed: demo accounts, vendors, products and affiliate links.
 * Lives in the auth package because users are created through Better Auth's
 * own sign-up API, so passwords are hashed exactly as in production.
 * Safe to re-run: existing rows are left alone.
 *
 *   npm run db:seed
 */
import { betterAuth } from "better-auth";
import { affiliate, affiliateLink, closeDb, db, eq, product, user, vendor } from "@affix/db";
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
  { title: "Pilates Foundations", vendor: "Lena Hoffmann", category: "Fitness", price: 149, commission: 0.4, image: "/images/product-pilates.jpg" },
  { title: "Sourdough at Home", vendor: "Jonas Berg", category: "Food", price: 89, commission: 0.3, image: "/images/product-sourdough.jpg" },
  { title: "Portrait Light Masterclass", vendor: "Theo Martin", category: "Photography", price: 199, commission: 0.35, image: "/images/product-camera.jpg" },
  { title: "The Paid Ads Playbook", vendor: "Sofia Reyes", category: "Marketing", price: 249, commission: 0.5, image: "/images/product-marketing.jpg" },
  { title: "Home Barista", vendor: "Luca Romano", category: "Food", price: 59, commission: 0.3, image: "/images/product-espresso.jpg" },
  { title: "Watercolor Botanicals", vendor: "Inès Dubois", category: "Art", price: 79, commission: 0.35, image: "/images/product-watercolor.jpg" },
  { title: "Spanish in 90 Days", vendor: "Carmen Vidal", category: "Languages", price: 129, commission: 0.4, image: "/images/product-seville.jpg" },
  { title: "Strength for Runners", vendor: "Nils Eriksen", category: "Fitness", price: 69, commission: 0.3, image: "/images/product-runners.jpg" },
  { title: "Guitar from Zero", vendor: "Sam Okafor", category: "Music", price: 99, commission: 0.35, image: "/images/product-guitar.jpg" },
  { title: "Plant-Based Kitchen", vendor: "Mira Kapoor", category: "Food", price: 49, commission: 0.3, image: "/images/product-salad.jpg" },
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
        category: item.category,
        priceCents: Math.round(item.price * 100),
        commissionBps: Math.round(item.commission * 10_000),
        imageUrl: item.image,
        status: "published",
      })
      .onConflictDoNothing({ target: product.slug });
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

  const [users, products, links] = await Promise.all([
    db.$count(user),
    db.$count(product),
    db.$count(affiliateLink),
  ]);
  console.info(`Done: ${users} users, ${products} products, ${links} affiliate links.\n`);
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
