"use client";

import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "../actions";
import { Field, FormAlert, SubmitButton } from "@/components/auth/form-kit";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, undefined);

  if (state?.done) {
    return (
      <div className="mt-9 space-y-4">
        <FormAlert tone="success">
          If an account exists for <strong>{state.values?.email}</strong>, a reset link is on its way.
          It expires in one hour.
        </FormAlert>
        {process.env.NODE_ENV !== "production" && (
          <p className="text-[0.84rem] leading-relaxed text-muted">
            Development: no email service is connected yet, so the link is printed in the terminal
            running <span className="font-mono text-ink">npm run dev</span>.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="mt-9 space-y-5" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state?.values?.email}
        error={state?.fieldErrors?.email}
      />
      <SubmitButton pendingLabel="Sending link…">Send reset link</SubmitButton>
    </form>
  );
}
