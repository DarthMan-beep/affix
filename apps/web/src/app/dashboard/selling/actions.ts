"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can } from "@affix/auth/permissions";
import { and, db, eq, product, productApplication } from "@affix/db";
import { requireActor } from "@/lib/dal";
import { HIGHEST_VAT_BPS, splitCents, type CommissionTerms } from "@/lib/money";
import { parseEuros, productSchema } from "@/lib/validation";
import { slugify } from "@/lib/workspaces";
import type { FormState } from "@/app/(auth)/actions";

/*
 * Product editor actions. As everywhere: re-verify the session, apply the
 * permission rules, validate the input. The form is never trusted.
 */

const fields = (formData: FormData) =>
  Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<
    string,
    string
  >;

const uuid = z.uuid();

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor("/dashboard/selling");
  const values = fields(formData);

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const v = parsed.data;

  const priceCents = parseEuros(v.price)!;
  const terms: CommissionTerms =
    v.commissionType === "percent"
      ? {
          commissionType: "percent",
          commissionBps: Math.round(Number(v.commissionPercent.replace(",", ".")) * 100),
          commissionFixedCents: 0,
        }
      : { commissionType: "fixed", commissionBps: 0, commissionFixedCents: parseEuros(v.commissionFixed)! };

  // The vendor must still earn something in the country with the highest VAT.
  if (splitCents(priceCents, HIGHEST_VAT_BPS, terms).vendorCents <= 0) {
    return {
      fieldErrors: {
        [v.commissionType === "percent" ? "commissionPercent" : "commissionFixed"]: [
          "This leaves you nothing after VAT and the Affix fee. Lower it or raise the price.",
        ],
      },
      values,
    };
  }

  const data = {
    title: v.title,
    category: v.category,
    description: v.description || null,
    priceCents,
    ...terms,
    cookieDays: v.cookieDays,
    refundDays: v.refundDays,
    approval: v.approval,
    imageUrl: v.image || null,
    status: v.intent === "publish" ? ("published" as const) : ("draft" as const),
  };

  const id = uuid.safeParse(values.id);
  if (id.success) {
    const existing = await db.query.product.findFirst({
      where: eq(product.id, id.data),
      columns: { id: true, slug: true, vendorId: true, status: true },
    });
    if (!existing || !can.manageProduct(actor, existing)) {
      return { error: "You can't edit this product.", values };
    }
    // The slug stays as it is: affiliate links already point at it.
    await db.update(product).set(data).where(eq(product.id, existing.id));
    revalidatePath(`/p/${existing.slug}`);
  } else {
    if (!can.createProduct(actor) || !actor.vendor) {
      return { error: "Open your selling workspace before adding products.", values };
    }
    const base = slugify(v.title);
    let created = false;
    for (let attempt = 0; attempt < 6 && !created; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(16).slice(2, 6)}`;
      const rows = await db
        .insert(product)
        .values({ ...data, vendorId: actor.vendor.id, slug })
        .onConflictDoNothing({ target: product.slug })
        .returning({ id: product.id });
      created = rows.length > 0;
    }
    if (!created) return { error: "We couldn't create a link for this title. Try a different title.", values };
  }

  revalidatePath("/dashboard/selling");
  redirect(`/dashboard/selling?saved=${data.status}`);
}

/** Archive a product: it leaves the marketplace and its links stop tracking. */
export async function archiveProduct(rawId: string) {
  const actor = await requireActor("/dashboard/selling");
  const id = uuid.safeParse(rawId);
  if (!id.success) return;
  const existing = await db.query.product.findFirst({
    where: eq(product.id, id.data),
    columns: { id: true, slug: true, vendorId: true, status: true },
  });
  if (!existing || !can.manageProduct(actor, existing)) return;

  await db.update(product).set({ status: "archived" }).where(eq(product.id, existing.id));
  revalidatePath("/dashboard/selling");
  revalidatePath(`/p/${existing.slug}`);
  redirect("/dashboard/selling?saved=archived");
}

/** Approve or reject an affiliate's application to promote one of the vendor's products. */
export async function decideApplication(rawId: string, decision: "approved" | "rejected") {
  const actor = await requireActor("/dashboard/selling/applications");
  const id = uuid.safeParse(rawId);
  if (!id.success) return;

  const [application] = await db
    .select({ id: productApplication.id, vendorId: product.vendorId, status: product.status })
    .from(productApplication)
    .innerJoin(product, eq(product.id, productApplication.productId))
    .where(eq(productApplication.id, id.data))
    .limit(1);
  if (!application || !can.reviewApplication(actor, application)) return;

  // Only a pending application can be decided; a second click changes nothing.
  await db
    .update(productApplication)
    .set({ status: decision, decidedAt: new Date() })
    .where(and(eq(productApplication.id, application.id), eq(productApplication.status, "pending")));
  revalidatePath("/dashboard", "layout");
}
