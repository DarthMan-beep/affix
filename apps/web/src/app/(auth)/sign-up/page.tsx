import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { pendingInviter } from "@/lib/referrals";
import { intents, type Intent } from "@/lib/validation";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account · Affix" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  if (await getSession()) redirect("/dashboard");
  const inviter = await pendingInviter();
  const initialIntent: Intent = (intents as readonly string[]).includes(intent ?? "")
    ? (intent as Intent)
    : "vendor";

  return (
    <>
      <p className="label-mono text-leaf-700">Free to start</p>
      <h1 className="font-display tracking-heading mt-4 text-[2.5rem] font-bold leading-[1.02] text-ink">
        Create your account
      </h1>
      <p className="mt-3 text-[1rem] text-muted">
        Already on Affix?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-ink underline decoration-leaf decoration-2 underline-offset-4 hover:decoration-ink"
        >
          Sign in
        </Link>
      </p>

      {inviter && (
        <p className="mt-6 rounded-2xl bg-spring/20 px-4 py-3 text-[0.9rem] text-leaf-700">
          <span className="font-semibold">{inviter.name}</span> (@{inviter.handle}) invited you to Affix.
        </p>
      )}

      <SignUpForm initialIntent={initialIntent} />

      <p className="mt-6 text-[0.8rem] leading-relaxed text-muted-2">
        By creating an account you agree to the Terms and Privacy Policy. You can open the other
        workspace later from your dashboard.
      </p>
    </>
  );
}
