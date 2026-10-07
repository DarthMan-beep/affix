"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Check, LoaderCircle } from "lucide-react";
import { FormAlert } from "@/components/auth/form-kit";
import { Select, TextArea, TextInput } from "@/components/dashboard/form";
import { CATEGORIES, PRODUCT_IMAGES } from "@/lib/product-options";
import type { FormState } from "@/app/(auth)/actions";
import { saveProduct } from "./actions";

export type ProductFormValues = {
  id?: string;
  title: string;
  category: string;
  description: string;
  price: string;
  commissionType: "percent" | "fixed";
  commissionPercent: string;
  commissionFixed: string;
  cookieDays: string;
  refundDays: string;
  approval: "open" | "application";
  commissionApproval: "auto" | "manual";
  image: string;
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

function Buttons({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[0.95rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 transition-colors hover:bg-ink/[0.03] hover:ring-ink/40 disabled:cursor-wait disabled:opacity-70"
      >
        {published ? "Unpublish and save as draft" : "Save as draft"}
      </button>
      <button
        type="submit"
        name="intent"
        value="publish"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-[0.95rem] font-semibold text-cream transition-colors hover:bg-forest-700 disabled:cursor-wait disabled:opacity-80"
      >
        {pending && <LoaderCircle size={17} className="animate-spin" />}
        {published ? "Save changes" : "Save and publish"}
      </button>
    </div>
  );
}

export function ProductForm({ initial, published = false }: { initial: ProductFormValues; published?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveProduct, undefined);
  const v = { ...initial, ...state?.values } as ProductFormValues;
  const e = state?.fieldErrors ?? {};
  const [type, setType] = useState<"percent" | "fixed">(v.commissionType);
  const [image, setImage] = useState(v.image);
  const [approval, setApproval] = useState<"open" | "application">(v.approval);
  const [review, setReview] = useState<"auto" | "manual">(v.commissionApproval);

  return (
    <form action={action} className="space-y-4" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      {Object.keys(e).length > 0 && <FormAlert>Some fields need another look.</FormAlert>}

      <Section title="The product" note="What buyers see on the product page and affiliates see in the marketplace.">
        <TextInput label="Title" name="title" defaultValue={v.title} error={e.title} placeholder="Sourdough at Home" maxLength={80} />
        <Select
          label="Category"
          name="category"
          defaultValue={v.category}
          error={e.category}
          placeholder="Choose a category"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <TextArea
          label="Description"
          name="description"
          defaultValue={v.description}
          error={e.description}
          hint="Optional. A few sentences about what the buyer gets."
          maxLength={2000}
        />
      </Section>

      <Section title="Price and commission" note="Buyers pay the price including VAT. Affiliates earn their commission on every sale they bring in.">
        <TextInput
          label="Price"
          name="price"
          defaultValue={v.price}
          error={e.price}
          inputMode="decimal"
          prefix="€"
          suffix="incl. VAT"
          placeholder="89.00"
        />

        <fieldset>
          <legend className="text-[0.88rem] font-medium text-ink">Affiliates earn</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                { value: "percent", label: "A percentage", note: "Of the price before VAT" },
                { value: "fixed", label: "A fixed amount", note: "The same on every sale" },
              ] as const
            ).map((o) => {
              const active = type === o.value;
              return (
                <label
                  key={o.value}
                  className={`relative cursor-pointer rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] ${
                    active ? "border-ink bg-card ring-1 ring-ink" : "border-line bg-card/60 hover:border-ink/30"
                  } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring/50`}
                >
                  <input
                    type="radio"
                    name="commissionType"
                    value={o.value}
                    checked={active}
                    onChange={() => setType(o.value)}
                    className="sr-only"
                  />
                  <span className="block text-[0.9rem] font-semibold text-ink">{o.label}</span>
                  <span className="block text-[0.78rem] leading-tight text-muted">{o.note}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className={type === "percent" ? "" : "hidden"}>
          <TextInput
            label="Commission"
            name="commissionPercent"
            defaultValue={v.commissionPercent}
            error={e.commissionPercent}
            inputMode="decimal"
            suffix="%"
            placeholder="30"
            required={false}
            hint="Up to 90%."
          />
        </div>
        <div className={type === "fixed" ? "" : "hidden"}>
          <TextInput
            label="Commission per sale"
            name="commissionFixed"
            defaultValue={v.commissionFixed}
            error={e.commissionFixed}
            inputMode="decimal"
            prefix="€"
            placeholder="20.00"
            required={false}
          />
        </div>
      </Section>

      <Section title="Tracking and refunds" note="How long a click counts, and how long a commission waits before it can be paid out.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            label="Cookie duration"
            name="cookieDays"
            defaultValue={v.cookieDays}
            error={e.cookieDays}
            inputMode="numeric"
            suffix="days"
            hint="A sale within this time after a click earns the affiliate a commission."
          />
          <TextInput
            label="Refund window"
            name="refundDays"
            defaultValue={v.refundDays}
            error={e.refundDays}
            inputMode="numeric"
            suffix="days"
            hint="Commissions stay pending this long. 0 approves them at once."
          />
        </div>
      </Section>

      <Section title="Approving commissions" note="Let commissions clear on their own when the refund window ends, or check each sale yourself first.">
        <fieldset>
          <legend className="sr-only">How commissions are approved</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "auto", label: "Automatically", note: "When the refund window ends" },
                { value: "manual", label: "I review each one", note: "Nothing is approved until you do" },
              ] as const
            ).map((o) => {
              const active = review === o.value;
              return (
                <label
                  key={o.value}
                  className={`relative cursor-pointer rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] ${
                    active ? "border-ink bg-card ring-1 ring-ink" : "border-line bg-card/60 hover:border-ink/30"
                  } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring/50`}
                >
                  <input
                    type="radio"
                    name="commissionApproval"
                    value={o.value}
                    checked={active}
                    onChange={() => setReview(o.value)}
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

      <Section title="Who can promote" note="Open your product to every affiliate, or review each one before they get a link.">
        <fieldset>
          <legend className="sr-only">Who can promote this product</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "open", label: "Any affiliate", note: "Links are available at once" },
                { value: "application", label: "Approved affiliates", note: "You review each application" },
              ] as const
            ).map((o) => {
              const active = approval === o.value;
              return (
                <label
                  key={o.value}
                  className={`relative cursor-pointer rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] ${
                    active ? "border-ink bg-card ring-1 ring-ink" : "border-line bg-card/60 hover:border-ink/30"
                  } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring/50`}
                >
                  <input
                    type="radio"
                    name="approval"
                    value={o.value}
                    checked={active}
                    onChange={() => setApproval(o.value)}
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

      <Section title="Cover image" note="Shown on the product page and in the marketplace.">
        <fieldset>
          <legend className="sr-only">Cover image</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PRODUCT_IMAGES.map((src) => {
              const active = image === src;
              return (
                <label
                  key={src}
                  className={`relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-xl ring-1 transition-shadow ${
                    active ? "ring-2 ring-ink" : "ring-line hover:ring-ink/40"
                  } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring`}
                >
                  <input
                    type="radio"
                    name="image"
                    value={src}
                    checked={active}
                    onChange={() => setImage(src)}
                    className="sr-only"
                    aria-label={`Cover ${src.replace("/images/product-", "").replace(".jpg", "")}`}
                  />
                  <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                  {active && (
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-spring text-ink">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          {image === "" && <input type="hidden" name="image" value="" />}
        </fieldset>
      </Section>

      <Buttons published={published} />
    </form>
  );
}
