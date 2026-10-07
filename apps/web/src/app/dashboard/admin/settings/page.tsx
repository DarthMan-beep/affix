import { requireActor } from "@/lib/dal";
import { adminNavFor } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { can } from "@affix/auth/permissions";
import { Notice, PageHeader } from "@/components/dashboard/ui";
import { AdminOnly } from "@/components/dashboard/admin-only";
import { SubNav } from "@/components/dashboard/subnav";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const actor = await requireActor("/dashboard/admin/settings");
  if (!can.changeSettings(actor)) return <AdminOnly />;
  const settings = await getSettings();
  const { saved } = await searchParams;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="The rules every vendor and affiliate on Affix works under."
      />

      <SubNav label="Admin" items={await adminNavFor(actor)} />

      {saved && <Notice tone="success" title="Settings saved. They apply from now on." />}

      <SettingsForm
        key={JSON.stringify(settings)}
        initial={{
          minPayout: (settings.minPayoutCents / 100).toFixed(2),
          payoutSchedule: settings.payoutSchedule,
          attribution: settings.attribution,
          defaultCommission: String(settings.defaultCommissionBps / 100),
          defaultCookieDays: String(settings.defaultCookieDays),
          defaultRefundDays: String(settings.defaultRefundDays),
          referralBonus: String(settings.referralBonusBps / 100),
          referralMonths: String(settings.referralMonths),
        }}
      />
    </div>
  );
}
