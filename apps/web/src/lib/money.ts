import { FEE_FIXED, FEE_RATE } from "./split";

/*
 * Money maths for real orders, in integer cents (the landing page's
 * illustrative calculator in split.ts works in euros). Same pricing:
 * 4.9% + €1 on the gross amount; commission is paid on the net price.
 */

/** Countries the demo checkout sells to, with their VAT in basis points. */
export const VAT_COUNTRIES = [
  { code: "DE", name: "Germany", vatBps: 1900 },
  { code: "AT", name: "Austria", vatBps: 2000 },
  { code: "FR", name: "France", vatBps: 2000 },
  { code: "NL", name: "Netherlands", vatBps: 2100 },
  { code: "ES", name: "Spain", vatBps: 2100 },
  { code: "IT", name: "Italy", vatBps: 2200 },
  { code: "IE", name: "Ireland", vatBps: 2300 },
  { code: "SE", name: "Sweden", vatBps: 2500 },
] as const;

export const COUNTRY_CODES = VAT_COUNTRIES.map((c) => c.code);
export const HIGHEST_VAT_BPS = Math.max(...VAT_COUNTRIES.map((c) => c.vatBps));
export const countryByCode = (code: string) => VAT_COUNTRIES.find((c) => c.code === code) ?? null;

export type CommissionTerms = {
  commissionType: "percent" | "fixed";
  commissionBps: number;
  commissionFixedCents: number;
};

export type SplitCents = {
  grossCents: number;
  vatCents: number;
  netCents: number;
  feeCents: number;
  affiliateCents: number;
  vendorCents: number;
};

/** Where every cent of a sale goes. `terms` is null for a sale without an affiliate. */
export function splitCents(grossCents: number, vatBps: number, terms: CommissionTerms | null): SplitCents {
  const netCents = Math.round((grossCents * 10_000) / (10_000 + vatBps));
  const vatCents = grossCents - netCents;
  const feeCents = Math.round(grossCents * FEE_RATE) + FEE_FIXED * 100;
  const wanted = !terms
    ? 0
    : terms.commissionType === "fixed"
      ? terms.commissionFixedCents
      : Math.round((netCents * terms.commissionBps) / 10_000);
  // A commission can never exceed what is left after the fee.
  const affiliateCents = Math.max(0, Math.min(wanted, netCents - feeCents));
  const vendorCents = netCents - feeCents - affiliateCents;
  return { grossCents, vatCents, netCents, feeCents, affiliateCents, vendorCents };
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

/** "30%" or "€20.00 per sale". */
export const commissionLabel = (t: CommissionTerms) =>
  t.commissionType === "fixed"
    ? `${eur.format(t.commissionFixedCents / 100)} per sale`
    : `${Math.round(t.commissionBps) / 100}%`;
