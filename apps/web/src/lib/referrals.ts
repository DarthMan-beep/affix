import "server-only";

import { cookies } from "next/headers";
import { can, referralActive, referralBonusCents, referralEndsAt, type Actor } from "@affix/auth/permissions";
import { affiliate, and, commission, db, desc, eq, payout, referral, referralBonus, user } from "@affix/db";
import { getSettings } from "@/lib/settings";

/*
 * Referral program. An affiliate shares an invite link (/join/<handle>); an
 * account created through it is tied to them in `referral`. For a set number
 * of months, every commission the invited affiliate earns also earns the
 * inviter a bonus (`referral_bonus`). Affix pays the bonus out of its own fee:
 * the vendor's and the invited affiliate's amounts never change.
 */

/** Remembers the invite link a visitor opened until they create their account. */
export const REFERRAL_COOKIE = "affix_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const HANDLE = /^[a-z0-9][a-z0-9-]{0,48}$/;
export const isHandle = (value: string | undefined): value is string => !!value && HANDLE.test(value);

/** The affiliate behind an invite link, if they may invite. */
export async function findInviter(handle: string) {
  if (!isHandle(handle)) return null;
  const [row] = await db
    .select({ id: affiliate.id, handle: affiliate.handle, userId: affiliate.userId, name: user.name })
    .from(affiliate)
    .innerJoin(user, eq(user.id, affiliate.userId))
    .where(and(eq(affiliate.handle, handle), eq(affiliate.suspended, false)))
    .limit(1);
  return row ?? null;
}

/** Who invited the visitor about to sign up, for the note on the sign-up page. */
export async function pendingInviter() {
  const handle = (await cookies()).get(REFERRAL_COOKIE)?.value;
  return isHandle(handle) ? findInviter(handle) : null;
}

/**
 * Tie a freshly created account to the affiliate whose invite link it came
 * through. Called once, right after sign-up; the cookie is then dropped.
 */
export async function recordReferral(newUserId: string) {
  const jar = await cookies();
  const handle = jar.get(REFERRAL_COOKIE)?.value;
  if (!handle) return;
  jar.delete(REFERRAL_COOKIE);

  const inviter = await findInviter(handle);
  if (!inviter || inviter.userId === newUserId) return;
  await db
    .insert(referral)
    .values({ inviterId: inviter.id, invitedUserId: newUserId })
    .onConflictDoNothing({ target: referral.invitedUserId });
}

/**
 * The bonus a commission of this affiliate earns their inviter right now, or
 * null: nobody invited them, the bonus period is over, the inviter is
 * suspended, or the program is switched off.
 */
export async function referralBonusFor(
  earner: { userId: string },
  sale: { commissionCents: number; feeCents: number },
  at: Date = new Date(),
) {
  const { referralBonusBps, referralMonths } = await getSettings();
  if (referralBonusBps === 0) return null;

  const [found] = await db
    .select({ referralId: referral.id, inviterId: referral.inviterId, invitedAt: referral.createdAt })
    .from(referral)
    .innerJoin(affiliate, eq(affiliate.id, referral.inviterId))
    .where(and(eq(referral.invitedUserId, earner.userId), eq(affiliate.suspended, false)))
    .limit(1);
  if (!found || !referralActive(found.invitedAt, referralMonths, at)) return null;

  const amountCents = referralBonusCents(sale, referralBonusBps);
  return amountCents > 0 ? { referralId: found.referralId, inviterId: found.inviterId, amountCents } : null;
}

export type InviteeStatus = "not_promoting" | "no_sales" | "earning" | "ended";

/** Everything on the Referrals tab: the invite link, who joined, what it earned. */
export async function getReferrals(actor: Actor) {
  if (!actor.affiliate) return null;
  const me = actor.affiliate.id;
  const settings = await getSettings();

  const [invited, bonuses] = await Promise.all([
    db
      .select({
        id: referral.id,
        joinedAt: referral.createdAt,
        name: user.name,
        handle: affiliate.handle,
      })
      .from(referral)
      .innerJoin(user, eq(user.id, referral.invitedUserId))
      .leftJoin(affiliate, eq(affiliate.userId, referral.invitedUserId))
      .where(eq(referral.inviterId, me))
      .orderBy(desc(referral.createdAt)),
    db
      .select({
        referralId: referralBonus.referralId,
        amountCents: referralBonus.amountCents,
        commissionStatus: commission.status,
        payoutStatus: payout.status,
      })
      .from(referralBonus)
      .innerJoin(commission, eq(commission.id, referralBonus.commissionId))
      .leftJoin(payout, eq(payout.id, referralBonus.payoutId))
      .where(eq(referralBonus.inviterId, me)),
  ]);

  const now = new Date();
  const invitees = invited.map((r) => {
    const own = bonuses.filter((b) => b.referralId === r.id);
    // A bonus that already went into a payout stays earned whatever happens to the sale later.
    const counts = own.filter((b) => b.payoutStatus || b.commissionStatus === "pending" || b.commissionStatus === "approved");
    const pendingCents = counts
      .filter((b) => !b.payoutStatus && b.commissionStatus === "pending")
      .reduce((s, b) => s + b.amountCents, 0);
    const earnedCents = counts.reduce((s, b) => s + b.amountCents, 0) - pendingCents;
    const endsAt = referralEndsAt(r.joinedAt, settings.referralMonths);
    const status: InviteeStatus =
      endsAt <= now ? "ended" : !r.handle ? "not_promoting" : counts.length === 0 ? "no_sales" : "earning";
    return { ...r, endsAt, sales: counts.length, pendingCents, earnedCents, status };
  });

  return {
    handle: actor.affiliate.handle,
    canInvite: can.inviteAffiliates(actor),
    bonusBps: settings.referralBonusBps,
    months: settings.referralMonths,
    invitees,
    totals: {
      invited: invitees.length,
      earning: invitees.filter((i) => i.status === "earning").length,
      pendingCents: invitees.reduce((s, i) => s + i.pendingCents, 0),
      earnedCents: invitees.reduce((s, i) => s + i.earnedCents, 0),
    },
  };
}
