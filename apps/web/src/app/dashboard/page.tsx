import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { isAdmin } from "@affix/auth/permissions";
import { requireActor } from "@/lib/dal";
import { getPromoting, getSelling } from "@/lib/data";
import { Chip, Notice, PageHeader, Panel, formatNumber } from "@/components/dashboard/ui";
import { WorkspaceCard } from "@/components/dashboard/workspace";
import { resendVerification } from "./actions";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; verified?: string; sent?: string }>;
}) {
  const actor = await requireActor();
  const { welcome, verified, sent } = await searchParams;
  const [selling, promoting] = await Promise.all([getSelling(actor), getPromoting(actor)]);

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const firstName = actor.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={welcome ? `Welcome to Affix, ${firstName}` : `Welcome back, ${firstName}`}
        description="One account for selling and promoting. Open either workspace whenever you need it."
      />

      <div className="space-y-3">
        {welcome && (
          <Notice tone="success" title="Your account is ready">
            You&apos;re signed in. Set up the workspaces you need below.
          </Notice>
        )}
        {verified && actor.emailVerified && <Notice tone="success" title="Email verified. Thank you!" />}
        {!actor.emailVerified && (
          <Notice
            tone="warning"
            title="Verify your email address"
            action={
              <form action={resendVerification}>
                <button
                  type="submit"
                  className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-ink px-4 text-[0.85rem] font-semibold text-cream hover:bg-forest-700"
                >
                  Resend link
                </button>
              </form>
            }
          >
            {sent
              ? `A new link is on its way to ${actor.email}.`
              : `We sent a link to ${actor.email}. You'll need a verified email before your first payout.`}
            {process.env.NODE_ENV !== "production" && " (Development: the link is printed in the dev-server terminal.)"}
          </Notice>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <WorkspaceCard
          kind="selling"
          active={selling !== null}
          stats={[
            { label: "Products", value: formatNumber(selling?.length ?? 0) },
            { label: "Affiliate links", value: formatNumber(sum(selling?.map((p) => p.links) ?? [])) },
            { label: "Clicks", value: formatNumber(sum(selling?.map((p) => p.clicks) ?? [])) },
          ]}
        />
        <WorkspaceCard
          kind="promoting"
          active={promoting !== null}
          stats={[
            { label: "Links", value: formatNumber(promoting?.links.length ?? 0) },
            { label: "Clicks", value: formatNumber(sum(promoting?.links.map((l) => l.clicks) ?? [])) },
            { label: "Available", value: formatNumber(promoting?.available.length ?? 0) },
          ]}
        />
      </div>

      <Panel>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Account</h2>
            <dl className="mt-3 grid gap-x-10 gap-y-2 text-[0.92rem] sm:grid-cols-[auto_1fr]">
              <dt className="text-muted">Email</dt>
              <dd className="flex flex-wrap items-center gap-2 text-ink">
                {actor.email}
                {actor.emailVerified ? <Chip tone="green">Verified</Chip> : <Chip tone="amber">Unverified</Chip>}
              </dd>
              <dt className="text-muted">Access</dt>
              <dd className="flex flex-wrap gap-1.5">
                {isAdmin(actor) && <Chip tone="ink">Admin</Chip>}
                {actor.vendor && <Chip tone="green">Vendor · /{actor.vendor.slug}</Chip>}
                {actor.affiliate && <Chip tone="green">Affiliate · @{actor.affiliate.handle}</Chip>}
                {!actor.vendor && !actor.affiliate && !isAdmin(actor) && <Chip>Member</Chip>}
              </dd>
            </dl>
          </div>
          {isAdmin(actor) && (
            <Link
              href="/dashboard/admin"
              className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream hover:bg-forest-700 sm:self-center"
            >
              <ShieldCheck size={16} /> Admin console <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}
