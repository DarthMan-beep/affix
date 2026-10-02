import type { NextRequest } from "next/server";
import { getActor } from "@/lib/dal";
import { getAnalytics } from "@/lib/analytics";
import { dayKey, parseRange } from "@/lib/range";

/** The analytics "day by day" table as a CSV file, for the same date range as the page. */
export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor) return new Response("Sign in to export your analytics.", { status: 401 });

  const q = request.nextUrl.searchParams;
  const range = parseRange({
    range: q.get("range") ?? undefined,
    from: q.get("from") ?? undefined,
    to: q.get("to") ?? undefined,
  });
  const data = await getAnalytics(actor, range);
  if (!data) return new Response("Not found", { status: 404 });

  const euros = (cents: number) => (cents / 100).toFixed(2);
  const rows = [
    ["date", "clicks", "unique_clicks", "sales", "pending", "approved", "sales_value_eur", "earned_eur"],
    ...data.series.map((d) => [
      d.date,
      d.clicks,
      d.uniqueClicks,
      d.sales,
      d.pending,
      d.approved,
      euros(d.revenueCents),
      euros(d.earningsCents),
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="affix-analytics-${dayKey(range.from)}-to-${dayKey(range.to)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
