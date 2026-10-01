"use client";

import { useActionState, useState } from "react";
import { Link2, Store, Waypoints } from "lucide-react";
import { signUp, type FormState } from "../actions";
import { Field, FormAlert, PasswordField, SubmitButton } from "@/components/auth/form-kit";
import type { Intent } from "@/lib/validation";

const options: { value: Intent; label: string; note: string; icon: typeof Store }[] = [
  { value: "vendor", label: "Sell", note: "My own products", icon: Store },
  { value: "affiliate", label: "Promote", note: "Earn commission", icon: Link2 },
  { value: "both", label: "Both", note: "Sell and promote", icon: Waypoints },
];

export function SignUpForm({ initialIntent }: { initialIntent: Intent }) {
  const [state, action] = useActionState<FormState, FormData>(signUp, undefined);
  const [intent, setIntent] = useState<Intent>((state?.values?.intent as Intent) || initialIntent);

  return (
    <form action={action} className="mt-9 space-y-5" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      <fieldset>
        <legend className="text-[0.88rem] font-medium text-ink">I want to</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {options.map((o) => {
            const active = intent === o.value;
            return (
              <label
                key={o.value}
                className={`relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition-[border-color,background-color,box-shadow] ${
                  active
                    ? "border-ink bg-card shadow-[0_8px_24px_-14px_rgb(14_42_30/0.45)] ring-1 ring-ink"
                    : "border-line bg-card/60 hover:border-ink/30"
                } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring/50`}
              >
                <input
                  type="radio"
                  name="intent"
                  value={o.value}
                  checked={active}
                  onChange={() => setIntent(o.value)}
                  className="sr-only"
                />
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg ${
                    active ? "bg-ink text-spring" : "bg-ink/[0.06] text-ink"
                  }`}
                >
                  <o.icon size={16} />
                </span>
                <span>
                  <span className="block text-[0.9rem] font-semibold text-ink">{o.label}</span>
                  <span className="block text-[0.74rem] leading-tight text-muted">{o.note}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Full name"
        name="name"
        autoComplete="name"
        placeholder="Maya Kowalski"
        defaultValue={state?.values?.name}
        error={state?.fieldErrors?.name}
      />
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
        autoComplete="new-password"
        hint="At least 10 characters."
        error={state?.fieldErrors?.password}
      />

      <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>
    </form>
  );
}
