"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSelfReferral } from "@affix/auth/permissions";
import { and, commission, db, eq, order, product } from "@affix/db";
import { getActor } from "@/lib/dal";
import { countryByCode, splitCents } from "@/lib/money";
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

  // Last affiliate link this visitor clicked for this product, within its cookie window.
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  let attribution = isVisitorId(visitorId) ? await findAttribution(visitorId, p.id, p.cookieDays) : null;
  if (
    attribution &&
    isSelfReferral(
      { userId: attribution.affiliateUserId, email: attribution.affiliateEmail },
      { userId: buyer?.userId ?? null, email },
    )
  ) {
    attribution = null; // no commission on your own purchases
  }

  const split = splitCents(p.priceCents, vat.vatBps, attribution ? p : null);
  const number = reference("AFX");
  const now = new Date();

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
      })
      .returning({ id: order.id });

    if (attribution && split.affiliateCents > 0) {
      const availableAt = new Date(now.getTime() + p.refundDays * 24 * 60 * 60 * 1000);
      await tx.insert(commission).values({
        orderId: created.id,
        affiliateId: attribution.affiliateId,
        productId: p.id,
        amountCents: split.affiliateCents,
        // Held for the refund window; a window of 0 days approves at once.
        status: p.refundDays === 0 ? "approved" : "pending",
        availableAt,
        approvedAt: p.refundDays === 0 ? now : null,
      });
    }
  });

  revalidatePath("/dashboard", "layout");
  redirect(`/order/${number}`);
}
