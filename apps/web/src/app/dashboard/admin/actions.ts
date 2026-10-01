"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can } from "@affix/auth/permissions";
import { and, commission, db, eq, inArray, payout } from "@affix/db";
import { requireActor } from "@/lib/dal";

/*
 * Payout processing for staff. Simulated: "sent" and "completed" are status
 * changes an admin makes after paying by hand; nothing is transferred here.
 * Each update names the status it expects, so a double click can't skip a step.
 */

const PAGE = "/dashboard/admin/payouts";
const uuid = z.uuid();

async function adminPayoutId(rawId: string) {
  const actor = await requireActor(PAGE);
  if (!can.processPayouts(actor)) return null;
  const id = uuid.safeParse(rawId);
  return id.success ? id.data : null;
}

export async function markPayoutSent(rawId: string) {
  const id = await adminPayoutId(rawId);
  if (!id) return;
  await db
    .update(payout)
    .set({ status: "sent", sentAt: new Date() })
    .where(and(eq(payout.id, id), eq(payout.status, "requested")));
  revalidatePath("/dashboard", "layout");
}

export async function markPayoutCompleted(rawId: string) {
  const id = await adminPayoutId(rawId);
  if (!id) return;
  await db
    .update(payout)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(payout.id, id), eq(payout.status, "sent")));
  revalidatePath("/dashboard", "layout");
}

/** Reject a payout: its commissions return to the affiliate's available balance. */
export async function rejectPayout(rawId: string) {
  const id = await adminPayoutId(rawId);
  if (!id) return;
  await db.transaction(async (tx) => {
    const rejected = await tx
      .update(payout)
      .set({ status: "rejected", note: "Rejected by Affix. The amount is back in your balance." })
      .where(and(eq(payout.id, id), inArray(payout.status, ["requested", "sent"])))
      .returning({ id: payout.id });
    if (rejected.length > 0) {
      await tx.update(commission).set({ payoutId: null }).where(eq(commission.payoutId, id));
    }
  });
  revalidatePath("/dashboard", "layout");
}
