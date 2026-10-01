"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@affix/auth";
import { can } from "@affix/auth/permissions";
import { affiliateLink, db, eq, product } from "@affix/db";
import { requireActor } from "@/lib/dal";
import { openAffiliateWorkspace, openVendorWorkspace } from "@/lib/workspaces";

/*
 * Every action re-verifies the session and applies the permission rules:
 * Server Actions are public endpoints, whatever the UI shows or hides.
 */

export async function startSelling() {
  const actor = await requireActor("/dashboard/selling");
  if (can.becomeVendor(actor)) await openVendorWorkspace(actor.userId, actor.name);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/selling");
}

export async function startPromoting() {
  const actor = await requireActor("/dashboard/promoting");
  if (can.becomeAffiliate(actor)) await openAffiliateWorkspace(actor.userId, actor.name);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/promoting");
}

const productId = z.uuid();

export async function createLink(rawProductId: string) {
  const actor = await requireActor("/dashboard/promoting");
  const id = productId.safeParse(rawProductId);
  if (!id.success || !actor.affiliate) return;

  const target = await db.query.product.findFirst({
    where: eq(product.id, id.data),
    columns: { id: true, slug: true, vendorId: true, status: true },
  });
  // Unknown product, unpublished, or the actor's own product: refuse quietly.
  if (!target || !can.promoteProduct(actor, target)) return;

  await db
    .insert(affiliateLink)
    .values({
      affiliateId: actor.affiliate.id,
      productId: target.id,
      code: `${actor.affiliate.handle}/${target.slug}`,
    })
    .onConflictDoNothing();
  revalidatePath("/dashboard/promoting");
}

export async function resendVerification() {
  const actor = await requireActor();
  if (!actor.emailVerified) {
    await auth.api.sendVerificationEmail({
      body: { email: actor.email, callbackURL: "/dashboard?verified=1" },
      headers: await headers(),
    });
  }
  redirect("/dashboard?sent=1");
}
