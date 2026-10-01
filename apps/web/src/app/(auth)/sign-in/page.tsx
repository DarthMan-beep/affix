import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { safeNext } from "@/lib/validation";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Affix" };

const DEMO_ACCOUNTS = [
  ["jonas@affix.dev", "Vendor and affiliate"],
  ["maya@affix.dev", "Affiliate"],
  ["admin@affix.dev", "Platform admin"],
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  if (await getSession()) redirect(safeNext(next));

  return (
    <>
      <p className="label-mono text-leaf-700">Welcome back</p>
      <h1 className="font-display tracking-heading mt-4 text-[2.5rem] font-bold leading-[1.02] text-ink">
        Sign in to Affix
      </h1>
      <p className="mt-3 text-[1rem] text-muted">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-ink underline decoration-leaf decoration-2 underline-offset-4 hover:decoration-ink"
        >
          Create an account
        </Link>
      </p>

      <SignInForm next={next} passwordReset={reset === "1"} />

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 px-4 py-3.5">
          <p className="label-mono text-[0.62rem] text-muted-2">Demo accounts · development only</p>
          <ul className="mt-2 space-y-1 text-[0.82rem]">
            {DEMO_ACCOUNTS.map(([email, role]) => (
              <li key={email} className="flex justify-between gap-3">
                <span className="font-mono text-ink">{email}</span>
                <span className="text-muted">{role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.78rem] text-muted">
            Password for all: <span className="font-mono text-ink">affix-demo-2026</span>
          </p>
        </div>
      )}
    </>
  );
}
