import type { Metadata } from "next";
import Link from "next/link";
import { FormAlert } from "@/components/auth/form-kit";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password · Affix" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const invalid = !token || Boolean(error);

  return (
    <>
      <h1 className="font-display tracking-heading text-[2.5rem] font-bold leading-[1.02] text-ink">
        Choose a new password
      </h1>
      {invalid ? (
        <div className="mt-8 space-y-5">
          <FormAlert>This reset link has expired or was already used.</FormAlert>
          <Link
            href="/forgot-password"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-[0.98rem] font-semibold text-cream hover:bg-forest-700"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[1rem] leading-relaxed text-muted">
            Use at least 10 characters. You&apos;ll be signed out on other devices.
          </p>
          <ResetPasswordForm token={token} />
        </>
      )}
    </>
  );
}
