import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password · Affix" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to sign in
      </Link>
      <h1 className="font-display tracking-heading mt-6 text-[2.5rem] font-bold leading-[1.02] text-ink">
        Reset your password
      </h1>
      <p className="mt-3 text-[1rem] leading-relaxed text-muted">
        Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
