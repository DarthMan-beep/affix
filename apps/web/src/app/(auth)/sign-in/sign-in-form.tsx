"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type FormState } from "../actions";
import { Field, FormAlert, PasswordField, SubmitButton } from "@/components/auth/form-kit";

export function SignInForm({ next, passwordReset }: { next?: string; passwordReset: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);

  return (
    <form action={action} className="mt-9 space-y-5" noValidate>
      {passwordReset && !state && (
        <FormAlert tone="success">Your password was updated. Sign in with the new one.</FormAlert>
      )}
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state?.values?.email}
        error={state?.fieldErrors?.email}
      />
      <PasswordField
        error={state?.fieldErrors?.password}
        aside={
          <Link href="/forgot-password" className="text-[0.84rem] font-medium text-leaf-700 hover:text-ink">
            Forgot password?
          </Link>
        }
      />

      <label className="flex cursor-pointer items-center gap-2.5 text-[0.9rem] text-muted">
        <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-[#0e2a1e]" />
        Keep me signed in on this device
      </label>

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
