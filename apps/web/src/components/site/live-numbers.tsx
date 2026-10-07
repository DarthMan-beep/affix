import { Reveal } from "@/components/ui/reveal";
import { euro } from "@/lib/content";
import { getLandingLive } from "@/lib/catalog";

const number = new Intl.NumberFormat("en-IE");

/** Platform totals read from the database on every visit. Hidden if it can't be reached. */
export async function LiveNumbers() {
  const live = await getLandingLive();
  if (!live) return null;
  const { products, affiliates, sales, commissionCents } = live.numbers;

  const stats = [
    { value: number.format(products), label: "products for sale" },
    { value: number.format(affiliates), label: "affiliates promoting them" },
    { value: number.format(sales), label: "sales through Affix" },
    { value: euro(commissionCents / 100, 0), label: "in commissions earned" },
  ];

  return (
    <section aria-label="Live numbers" className="container-affix pb-4 sm:pb-6">
      <Reveal>
        <div className="grain relative isolate overflow-hidden rounded-[28px] bg-forest-900 px-6 py-8 sm:px-10 sm:py-10">
          <p className="label-mono inline-flex items-center gap-2.5 text-spring">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-spring" />
            Live on this demo
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-cream/10">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <dt className="mt-2 text-[0.92rem] text-cream/65">{s.label}</dt>
                <dd className="font-display tracking-heading tabular text-[clamp(2.2rem,4.4vw,3.5rem)] font-bold leading-none text-cream">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </section>
  );
}
