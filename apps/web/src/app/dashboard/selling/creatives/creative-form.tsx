"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Check, ImageIcon, LoaderCircle, Plus, Type } from "lucide-react";
import { FormAlert } from "@/components/auth/form-kit";
import { Select, TextArea, TextInput } from "@/components/dashboard/form";
import { BANNER_SIZES, LINK_PLACEHOLDER } from "@/lib/creative-options";
import { PRODUCT_IMAGES } from "@/lib/product-options";
import type { FormState } from "@/app/(auth)/actions";
import { createCreative } from "../actions";

const kinds = [
  { value: "banner", label: "Banner", note: "An image in a standard ad size", icon: ImageIcon },
  { value: "text", label: "Ready-made text", note: "A post or email affiliates can copy", icon: Type },
] as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700 disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Add creative
    </button>
  );
}

export function CreativeForm({ products }: { products: { id: string; title: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createCreative, undefined);
  const v = state?.values ?? {};
  const e = state?.fieldErrors ?? {};
  const [kind, setKind] = useState<"banner" | "text">(v.kind === "text" ? "text" : "banner");
  const [image, setImage] = useState(v.image ?? "");

  if (products.length === 0) {
    return <p className="text-[0.92rem] text-muted">Add a product first, then you can make creatives for it.</p>;
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      <fieldset>
        <legend className="sr-only">Kind of creative</legend>
        <div className="grid grid-cols-2 gap-2">
          {kinds.map((o) => {
            const active = kind === o.value;
            return (
              <label
                key={o.value}
                className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-[border-color,background-color] ${
                  active ? "border-ink bg-card ring-1 ring-ink" : "border-line bg-card/60 hover:border-ink/30"
                } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring/50`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={o.value}
                  checked={active}
                  onChange={() => setKind(o.value)}
                  className="sr-only"
                />
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-ink text-spring" : "bg-ink/[0.06] text-ink"}`}>
                  <o.icon size={16} />
                </span>
                <span>
                  <span className="block text-[0.9rem] font-semibold text-ink">{o.label}</span>
                  <span className="block text-[0.78rem] leading-tight text-muted">{o.note}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Product"
          name="productId"
          defaultValue={v.productId}
          error={e.productId}
          placeholder="Choose a product"
          options={products.map((p) => ({ value: p.id, label: p.title }))}
        />
        <TextInput
          label="Name"
          name="title"
          defaultValue={v.title}
          error={e.title}
          placeholder={kind === "banner" ? "Autumn banner" : "Instagram caption"}
          maxLength={60}
          hint="Only you and your affiliates see this."
        />
      </div>

      <div className={kind === "banner" ? "space-y-5" : "hidden"}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Size"
            name="size"
            defaultValue={v.size}
            error={e.size}
            required={false}
            placeholder="Choose a size"
            options={BANNER_SIZES.map((s) => ({ value: s.value, label: `${s.label} · ${s.width} × ${s.height}` }))}
          />
          <TextInput
            label="Headline"
            name="headline"
            defaultValue={v.headline}
            error={e.headline}
            required={false}
            maxLength={60}
            placeholder="Bake your first loaf this weekend"
            hint="Optional. Without one, the banner shows the product's title."
          />
        </div>
        <fieldset>
          <legend className="text-[0.88rem] font-medium text-ink">Picture</legend>
          <p className="mt-1 text-[0.8rem] text-muted">Leave it unselected to use the product&apos;s cover image.</p>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {PRODUCT_IMAGES.map((src) => {
              const active = image === src;
              return (
                <label
                  key={src}
                  className={`relative block aspect-square cursor-pointer overflow-hidden rounded-xl ring-1 transition-shadow ${
                    active ? "ring-2 ring-ink" : "ring-line hover:ring-ink/40"
                  } has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-spring`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => setImage(active ? "" : src)}
                    className="sr-only"
                    aria-label={`Picture ${src.replace("/images/product-", "").replace(".jpg", "")}`}
                  />
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                  {active && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-spring text-ink">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <input type="hidden" name="image" value={image} />
        </fieldset>
      </div>

      <div className={kind === "text" ? "" : "hidden"}>
        <TextArea
          label="Text"
          name="body"
          defaultValue={v.body}
          error={e.body}
          rows={5}
          maxLength={800}
          placeholder={`I finally learned to bake real sourdough with this course. Here's the one I took: ${LINK_PLACEHOLDER}`}
          hint={`Write ${LINK_PLACEHOLDER} where the affiliate's own link should go. Without it, the link is added at the end.`}
        />
      </div>

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
