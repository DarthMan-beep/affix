import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { PageHeader } from "@/components/dashboard/ui";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const actor = await requireActor("/dashboard/selling/new");

  if (!actor.vendor) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Sell your products" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/dashboard/selling" className="inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> Products
      </Link>
      <PageHeader
        eyebrow={`Selling · /${actor.vendor.slug}`}
        title="New product"
        description="Set the price and what affiliates earn. You can save a draft and publish later."
      />
      <ProductForm
        initial={{
          title: "",
          category: "",
          description: "",
          price: "",
          commissionType: "percent",
          commissionPercent: "30",
          commissionFixed: "",
          cookieDays: "30",
          refundDays: "14",
          image: "",
        }}
      />
    </div>
  );
}
