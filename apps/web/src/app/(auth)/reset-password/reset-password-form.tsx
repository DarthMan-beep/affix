"use client";

import { useActionState } from "react";
import { resetPassword, type FormState } from "../actions";
import { FormAlert, PasswordField, SubmitButton } from "@/components/auth/form-kit";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);

  return (
    <form action={action} className="mt-9 space-y-5" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      {state?.fieldErrors?.token && <FormAlert>{state.fieldErrors.token[0]}</FormAlert>}
      <input type="hidden" name="token" value={token} />
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        error={state?.fieldErrors?.password}
      />
      <PasswordField
        label="Repeat new password"
        name="confirm"
        autoComplete="new-password"
        error={state?.fieldErrors?.confirm}
      />
      <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
