"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Lock } from "lucide-react";
import { FormAlert } from "@/components/auth/form-kit";
import { Select, TextInput } from "@/components/dashboard/form";
import { VAT_COUNTRIES, splitCents } from "@/lib/money";
import type { FormState } from "@/app/(auth)/actions";
import { placeOrder } from "./actions";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

function PayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-spring px-7 text-[1rem] font-semibold text-ink shadow-[0_10px_30px_-12px_rgb(125_239_161/0.8)] transition-[transform,background-color] duration-300 hover:bg-spring-300 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? <LoaderCircle size={18} className="animate-spin" /> : <Lock size={16} />}
      {pending ? "Placing your order…" : label}
    </button>
  );
}

export function CheckoutForm({
  slug,
  priceCents,
  defaults,
}: {
  slug: string;
  priceCents: number;
  defaults: { name: string; email: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(placeOrder, undefined);
  const [country, setCountry] = useState(state?.values?.country ?? "");
  const vat = VAT_COUNTRIES.find((c) => c.code === country);
  const split = vat ? splitCents(priceCents, vat.vatBps, null) : null;

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="slug" value={slug} />
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      <TextInput
        label="Full name"
        name="name"
        autoComplete="name"
        defaultValue={state?.values?.name ?? defaults.name}
        error={state?.fieldErrors?.name}
      />
      <TextInput
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={state?.values?.email ?? defaults.email}
        error={state?.fieldErrors?.email}
        hint="Your order is saved under this address."
      />
      <div onChange={(e) => e.target instanceof HTMLSelectElement && setCountry(e.target.value)}>
        <Select
          label="Country"
          name="country"
          defaultValue={country}
          error={state?.fieldErrors?.country}
          placeholder="Choose your country"
          options={VAT_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
          hint="Sets the VAT that is included in the price."
        />
      </div>

      <dl className="space-y-2 border-t border-line pt-5 text-[0.92rem]">
        <div className="flex justify-between text-muted">
          <dt>Price before VAT</dt>
          <dd className="font-mono tabular">{split ? eur.format(split.netCents / 100) : "—"}</dd>
        </div>
        <div className="flex justify-between text-muted">
          <dt>VAT{vat ? ` (${vat.name}, ${vat.vatBps / 100}%)` : ""}</dt>
          <dd className="font-mono tabular">{split ? eur.format(split.vatCents / 100) : "—"}</dd>
        </div>
        <div className="flex justify-between pt-1 text-[1.05rem] font-semibold text-ink">
          <dt>Total</dt>
          <dd className="font-mono tabular">{eur.format(priceCents / 100)}</dd>
        </div>
      </dl>

      <PayButton label={`Pay ${eur.format(priceCents / 100)}`} />
      <p className="text-center text-[0.8rem] leading-relaxed text-muted-2">
        Demo checkout: no card is needed and nothing is charged.
      </p>
    </form>
  );
}
