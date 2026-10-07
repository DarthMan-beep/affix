import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE, findInviter } from "@/lib/referrals";

/**
 * An affiliate's invite link, /join/<handle>. Remembers who invited the
 * visitor in a first-party cookie and sends them to the sign-up page; the
 * referral itself is recorded when the account is created.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const inviter = await findInviter(handle.toLowerCase());

  if (inviter) {
    (await cookies()).set(REFERRAL_COOKIE, inviter.handle, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  // Relative on purpose: behind a proxy, request.url holds the server's own
  // address (e.g. 0.0.0.0:3000), not the one the visitor used.
  redirect("/sign-up?intent=affiliate");
}
