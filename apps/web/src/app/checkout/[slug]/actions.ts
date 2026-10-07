"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSelfReferral } from "@affix/auth/permissions";
import { affiliateRate, and, commission, db, eq, order, product, referralBonus } from "@affix/db";
import { getActor } from "@/lib/dal";
import { countryByCode, splitCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { referralBonusFor } from "@/lib/referrals";
import { VISITOR_COOKIE, findAttribution, isVisitorId } from "@/lib/tracking";
import { checkoutSchema } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/actions";

/*
 * Demo checkout: creates the order and its money split exactly as a real sale
 * would, but takes no payment. No card details are asked for or stored.
 */

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const reference = (prefix: string) =>
  `${prefix}-${[...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join("")}`;

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { slug, name, email, country } = parsed.data;

  const p = await db.query.product.findFirst({
    where: and(eq(product.slug, slug), eq(product.status, "published")),
  });
  if (!p) return { error: "This product is no longer for sale.", values };

  const vat = countryByCode(country)!;
  const buyer = await getActor();

  // The affiliate link this visitor clicked for this product within its cookie
  // window: the last or the first one, whichever the platform is set to.
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  const { attribution: model } = await getSettings();
  let attribution = isVisitorId(visitorId) ? await findAttribution(visitorId, p.id, p.cookieDays, model) : null;
  let selfReferralAffiliateId: string | null = null;
  if (
    attribution &&
    isSelfReferral(
      { userId: attribution.affiliateUserId, email: attribution.affiliateEmail },
      { userId: buyer?.userId ?? null, email },
    )
  ) {
    // No commission on your own purchases; the attempt is kept for staff to see.
    selfReferralAffiliateId = attribution.affiliateId;
    attribution = null;
  }

  // A custom rate the vendor agreed with this affiliate replaces the product's standard commission.
  const customRate = attribution
    ? await db.query.affiliateRate.findFirst({
        where: and(eq(affiliateRate.productId, p.id), eq(affiliateRate.affiliateId, attribution.affiliateId)),
      })
    : undefined;
  const split = splitCents(p.priceCents, vat.vatBps, attribution ? (customRate ?? p) : null);
  const manual = p.commissionApproval === "manual";
  const number = reference("AFX");
  const now = new Date();
  // If another affiliate invited this one, they earn a bonus on the commission, out of Affix's fee.
  const bonus =
    attribution && split.affiliateCents > 0
      ? await referralBonusFor(
          { userId: attribution.affiliateUserId },
          { commissionCents: split.affiliateCents, feeCents: split.feeCents },
          now,
        )
      : null;

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(order)
      .values({
        number,
        productId: p.id,
        vendorId: p.vendorId,
        buyerName: name,
        buyerEmail: email,
        buyerCountry: country,
        buyerUserId: buyer?.userId ?? null,
        grossCents: split.grossCents,
        vatBps: vat.vatBps,
        vatCents: split.vatCents,
        netCents: split.netCents,
        feeCents: split.feeCents,
        affiliateCents: split.affiliateCents,
        vendorCents: split.vendorCents,
        clickId: attribution?.clickId ?? null,
        linkId: attribution?.linkId ?? null,
        affiliateId: attribution?.affiliateId ?? null,
        selfReferralAffiliateId,
      })
      .returning({ id: order.id });

    if (attribution && split.affiliateCents > 0) {
      const availableAt = new Date(now.getTime() + p.refundDays * 24 * 60 * 60 * 1000);
      const [earned] = await tx
        .insert(commission)
        .values({
          orderId: created.id,
          affiliateId: attribution.affiliateId,
          productId: p.id,
          amountCents: split.affiliateCents,
          // Held for the refund window; a window of 0 days approves at once,
          // unless the vendor reviews this product's commissions by hand.
          status: p.refundDays === 0 && !manual ? "approved" : "pending",
          availableAt,
          approvedAt: p.refundDays === 0 && !manual ? now : null,
          manualReview: manual,
        })
        .returning({ id: commission.id });
      if (bonus) await tx.insert(referralBonus).values({ ...bonus, commissionId: earned.id });
    }
  });

  revalidatePath("/dashboard", "layout");
  redirect(`/order/${number}`);
}
