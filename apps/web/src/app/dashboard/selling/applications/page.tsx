import { Check, X } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getApplications } from "@/lib/analytics";
import { sellingNav } from "@/lib/dashboard-nav";
import { Chip, PageHeader, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { decideApplication } from "../actions";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const states = {
  pending: { label: "Waiting", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "neutral" },
} as const;

export default async function ApplicationsPage() {
  const actor = await requireActor("/dashboard/selling/applications");
  const applications = await getApplications(actor);

  if (!applications) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Applications" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  const pending = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Selling · /${actor.vendor!.slug}`}
        title="Applications"
        description="Affiliates who asked to promote a product you set to “Approved affiliates”. Approve one and they can create links for it."
      />

      <SubNav
        label="Selling"
        items={sellingNav.map((i) => (i.href.endsWith("/applications") ? { ...i, count: pending } : i))}
      />

      {applications.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No applications yet. To review affiliates before they promote a product, edit it and choose “Approved
          affiliates” under Who can promote.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[52rem] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Affiliate</th>
                <th className="px-4 py-3.5 font-medium">Product</th>
                <th className="px-4 py-3.5 font-medium">Message</th>
                <th className="px-4 py-3.5 font-medium">Applied</th>
                <th className="px-6 py-3.5 text-right font-medium">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {applications.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-4">
                    <span className="block font-semibold text-ink">{a.affiliateName}</span>
                    <span className="block text-[0.78rem] text-muted">
                      @{a.affiliateHandle} · {formatNumber(a.affiliateSales)} {a.affiliateSales === 1 ? "sale" : "sales"} on Affix
                    </span>
                  </td>
                  <td className="px-4 py-4 text-ink">{a.productTitle}</td>
                  <td className="max-w-[18rem] px-4 py-4 text-[0.85rem] leading-snug text-muted">
                    {a.message ?? <span className="text-muted-2">No message</span>}
                  </td>
                  <td className="font-mono tabular whitespace-nowrap px-4 py-4 text-[0.82rem] text-muted">
                    {day.format(a.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    {a.status === "pending" ? (
                      <div className="flex justify-end gap-1.5">
                        <form action={decideApplication.bind(null, a.id, "approved")}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-[0.8rem] font-semibold text-cream hover:bg-forest-700"
                          >
                            <Check size={13} strokeWidth={3} /> Approve
                          </button>
                        </form>
                        <form action={decideApplication.bind(null, a.id, "rejected")}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-muted ring-1 ring-inset ring-ink/15 hover:text-ink hover:ring-ink/40"
                          >
                            <X size={13} /> Reject
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <Chip tone={states[a.status].tone}>{states[a.status].label}</Chip>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
