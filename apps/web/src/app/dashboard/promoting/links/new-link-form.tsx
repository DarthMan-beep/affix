"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Link2, LoaderCircle } from "lucide-react";
import { FormAlert } from "@/components/auth/form-kit";
import { Select, TextInput } from "@/components/dashboard/form";
import type { FormState } from "@/app/(auth)/actions";
import { createCampaignLink } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700 disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Link2 size={16} />} Create link
    </button>
  );
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function NewLinkForm({ products }: { products: { id: string; title: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createCampaignLink, undefined);
  const v = state?.values ?? {};
  const e = state?.fieldErrors ?? {};
  const [campaign, setCampaign] = useState(v.campaign ?? "");

  if (products.length === 0) {
    return (
      <p className="text-[0.92rem] text-muted">
        Pick a product in the marketplace first. Once you have its main link, you can add campaign links here.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <FormAlert>{state.error}</FormAlert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Product"
          name="productId"
          defaultValue={v.productId}
          error={e.productId}
          placeholder="Choose a product"
          options={products.map((p) => ({ value: p.id, label: p.title }))}
        />
        <div onChange={(ev) => ev.target instanceof HTMLInputElement && setCampaign(ev.target.value)}>
          <TextInput
            label="Campaign name"
            name="campaign"
            defaultValue={v.campaign}
            error={e.campaign}
            placeholder="instagram-bio"
            maxLength={40}
            hint={
              slug(campaign)
                ? `Your link will end in /${slug(campaign)}`
                : "Where you'll share it, e.g. instagram-bio or youtube-review."
            }
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-[0.88rem] font-medium text-ink">UTM tags (optional)</legend>
        <p className="mt-1 text-[0.8rem] text-muted">
          Added to the product page address, so analytics tools can tell your campaigns apart.
        </p>
        <div className="mt-3 grid gap-5 sm:grid-cols-3">
          <TextInput label="Source" name="utmSource" defaultValue={v.utmSource} error={e.utmSource} placeholder="instagram" required={false} maxLength={60} />
          <TextInput label="Medium" name="utmMedium" defaultValue={v.utmMedium} error={e.utmMedium} placeholder="social" required={false} maxLength={60} />
          <TextInput label="Campaign" name="utmCampaign" defaultValue={v.utmCampaign} error={e.utmCampaign} placeholder="autumn-launch" required={false} maxLength={60} />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
