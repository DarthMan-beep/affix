"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { FormAlert } from "@/components/auth/form-kit";
import { Select, TextInput } from "@/components/dashboard/form";
import type { FormState } from "@/app/(auth)/actions";
import { saveSettings } from "../actions";

export type SettingsValues = {
  minPayout: string;
  payoutSchedule: string;
  attribution: "last_click" | "first_click";
  defaultCommission: string;
  defaultCookieDays: string;
  defaultRefundDays: string;
  referralBonus: string;
  referralMonths: string;
};

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-[24px] bg-card p-6 ring-1 ring-line sm:p-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-display tracking-heading text-[1.2rem] font-bold text-ink">{title}</h2>
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">{note}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-[0.95rem] font-semibold text-cream transition-colors hover:bg-forest-700 disabled:cursor-wait disabled:opacity-80"
    >
      {pending && <LoaderCircle size={17} className="animate-spin" />} Save settings
    </button>
  );
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettings, undefined);
  const v = { ...initial, ...state?.values } as SettingsValues;
  const e = state?.fieldErrors ?? {};
  const [attribution, setAttribution] = useState(v.attribution);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      {Object.keys(e).length > 0 && <FormAlert>Some fields need another look.</FormAlert>}

      <Section title="Payouts" note="When affiliates can withdraw, and how often you process their requests.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            label="Minimum payout"
            name="minPayout"
            defaultValue={v.minPayout}
            error={e.minPayout}
            inputMode="decimal"
            prefix="€"
            hint="Affiliates can request a payout once this much is available."
          />
          <Select
            label="Payouts are processed"
            name="payoutSchedule"
            defaultValue={v.payoutSchedule}
            error={e.payoutSchedule}
            options={[
              { value: "on_request", label: "As they come in" },
              { value: "weekly", label: "Once a week" },
              { value: "monthly", label: "Once a month" },
            ]}
            hint="Shown to affiliates. You still mark each payout as sent yourself."
          />
        </div>
      </Section>

      <Section title="Attribution" note="When a buyer clicked the links of several affiliates before buying, who earns the sale.">
        <fieldset>
          <legend className="sr-only">Which click earns the sale</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "last_click", label: "The last click", note: "Whoever sent the buyer most recently" },
                { value: "first_click", label: "The first click", note: "Whoever introduced the buyer" },
              ] as const
            ).map((o) => {
              const active = attribution === o.value;
              return (
                <label
                  key={o.value}
                  className={`relative cursor-pointer rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] ${
                    active ? "border-ink bg-card ring-1 ring-ink" : "border-line bg-card/60 hover:border-ink/30"
                  } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring/50`}
                >
                  <input
                    type="radio"
                    name="attribution"
                    value={o.value}
                    checked={active}
                    onChange={() => setAttribution(o.value)}
                    className="sr-only"
                  />
                  <span className="block text-[0.9rem] font-semibold text-ink">{o.label}</span>
                  <span className="block text-[0.78rem] leading-tight text-muted">{o.note}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      <Section title="New products" note="What the product editor starts with. Vendors can change each value for their own product.">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextInput label="Commission" name="defaultCommission" defaultValue={v.defaultCommission} error={e.defaultCommission} inputMode="numeric" suffix="%" />
          <TextInput label="Cookie duration" name="defaultCookieDays" defaultValue={v.defaultCookieDays} error={e.defaultCookieDays} inputMode="numeric" suffix="days" />
          <TextInput label="Refund window" name="defaultRefundDays" defaultValue={v.defaultRefundDays} error={e.defaultRefundDays} inputMode="numeric" suffix="days" />
        </div>
      </Section>

      <Section
        title="Referral program"
        note="What an affiliate earns for inviting another affiliate. Affix pays it out of its own fee, never the vendor."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            label="Bonus on their commissions"
            name="referralBonus"
            defaultValue={v.referralBonus}
            error={e.referralBonus}
            inputMode="numeric"
            suffix="%"
            hint="0 switches the program off for new sales."
          />
          <TextInput
            label="Runs for"
            name="referralMonths"
            defaultValue={v.referralMonths}
            error={e.referralMonths}
            inputMode="numeric"
            suffix="months"
            hint="Counted from the day the invited account signed up."
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <Save />
      </div>
    </form>
  );
}
