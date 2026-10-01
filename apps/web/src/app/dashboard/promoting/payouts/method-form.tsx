"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Landmark, LoaderCircle, Mail, Plus } from "lucide-react";
import { FormAlert } from "@/components/auth/form-kit";
import { TextInput } from "@/components/dashboard/form";
import type { FormState } from "@/app/(auth)/actions";
import { addPayoutMethod } from "../actions";

const types = [
  { value: "bank", label: "Bank transfer", note: "IBAN", icon: Landmark },
  { value: "paypal", label: "PayPal", note: "Account email", icon: Mail },
  { value: "wise", label: "Wise", note: "Account email", icon: Mail },
] as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700 disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Save method
    </button>
  );
}

export function MethodForm({ holder }: { holder: string }) {
  const [state, action] = useActionState<FormState, FormData>(addPayoutMethod, undefined);
  const [type, setType] = useState<(typeof types)[number]["value"]>(
    (state?.values?.type as (typeof types)[number]["value"]) || "bank",
  );
  const bank = type === "bank";

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      <fieldset>
        <legend className="text-[0.88rem] font-medium text-ink">Send my payouts by</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {types.map((o) => {
            const active = type === o.value;
            return (
              <label
                key={o.value}
                className={`relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition-[border-color,background-color] ${
                  active ? "border-ink bg-card ring-1 ring-ink" : "border-line bg-card/60 hover:border-ink/30"
                } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring/50`}
              >
                <input
                  type="radio"
                  name="type"
                  value={o.value}
                  checked={active}
                  onChange={() => setType(o.value)}
                  className="sr-only"
                />
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-ink text-spring" : "bg-ink/[0.06] text-ink"}`}>
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

      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          label="Account holder"
          name="holder"
          autoComplete="name"
          defaultValue={state?.values?.holder ?? holder}
          error={state?.fieldErrors?.holder}
        />
        <TextInput
          key={type}
          label={bank ? "IBAN" : "Account email"}
          name="details"
          type={bank ? "text" : "email"}
          inputMode={bank ? "text" : "email"}
          autoComplete="off"
          placeholder={bank ? "DE00 0000 0000 0000 0000 00" : "you@example.com"}
          error={state?.fieldErrors?.details}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.8rem] leading-relaxed text-muted-2">
          Demo project: payouts are simulated. Use made-up details, not a real account.
        </p>
        <Submit />
      </div>
    </form>
  );
}
