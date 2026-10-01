/** Affix pricing: 4.9% + €1 per sale, charged on the gross amount. */
export const FEE_RATE = 0.049;
export const FEE_FIXED = 1;

export type Split = {
  gross: number;
  net: number;
  vat: number;
  fee: number;
  affiliate: number;
  vendor: number;
};

/** Where every euro of a sale goes. Commission is paid on the net price. */
export function splitSale(gross: number, vatRate: number, commission: number): Split {
  const net = gross / (1 + vatRate);
  const vat = gross - net;
  const fee = gross * FEE_RATE + FEE_FIXED;
  const affiliate = net * commission;
  const vendor = net - fee - affiliate;
  return { gross, net, vat, fee, affiliate, vendor };
}
