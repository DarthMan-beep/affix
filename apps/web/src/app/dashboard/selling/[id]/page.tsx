import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, ExternalLink } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getProductForEdit } from "@/lib/data";
import { Chip, PageHeader } from "@/components/dashboard/ui";
import { archiveProduct } from "../actions";
import { ProductForm } from "../product-form";

const euros = (cents: number) => (cents / 100).toFixed(2);

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor(`/dashboard/selling/${id}`);
  const p = await getProductForEdit(actor, id);
  if (!p) notFound();

  return (
    <div className="space-y-8">
      <Link href="/dashboard/selling/products" className="inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> Products
      </Link>
      <PageHeader
        eyebrow="Selling · Edit product"
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Chip tone={p.status === "published" ? "green" : "neutral"}>
              {p.status === "published" ? "Published" : p.status === "draft" ? "Draft" : "Archived"}
            </Chip>
            <span className="font-mono text-[0.85rem]">/p/{p.slug}</span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {p.status === "published" && (
              <Link
                href={`/p/${p.slug}`}
                target="_blank"
                className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.88rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 hover:bg-ink/[0.03] hover:ring-ink/40"
              >
                <ExternalLink size={15} /> View page
              </Link>
            )}
            {p.status !== "archived" && (
              <form action={archiveProduct.bind(null, p.id)}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.88rem] font-semibold text-muted ring-1 ring-inset ring-ink/15 hover:bg-ink/[0.03] hover:text-ink hover:ring-ink/40"
                >
                  <Archive size={15} /> Archive
                </button>
              </form>
            )}
          </div>
        }
      />
      <ProductForm
        published={p.status === "published"}
        initial={{
          id: p.id,
          title: p.title,
          category: p.category,
          description: p.description ?? "",
          price: euros(p.priceCents),
          commissionType: p.commissionType,
          commissionPercent: String(p.commissionBps / 100),
          commissionFixed: p.commissionFixedCents ? euros(p.commissionFixedCents) : "",
          cookieDays: String(p.cookieDays),
          refundDays: String(p.refundDays),
          approval: p.approval,
          commissionApproval: p.commissionApproval,
          image: p.imageUrl ?? "",
        }}
      />
    </div>
  );
}
