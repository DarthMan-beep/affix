import { z } from "zod";
import { BANNER_SIZE_VALUES } from "./creative-options";
import { COUNTRY_CODES } from "./money";
import { CATEGORIES, PRODUCT_IMAGES } from "./product-options";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

const password = z
  .string()
  .min(10, { error: "Use at least 10 characters." })
  .max(128, { error: "Use at most 128 characters." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
  remember: z.literal("on").optional(),
  next: z.string().optional(),
});

export const intents = ["vendor", "affiliate", "both"] as const;
export type Intent = (typeof intents)[number];

export const signUpSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }).max(80),
  email,
  password,
  intent: z.enum(intents, { error: "Choose how you'll use Affix." }),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { error: "This reset link is incomplete." }),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    error: "The passwords don't match.",
    path: ["confirm"],
  });

/** Only same-site relative paths are allowed as post-sign-in destinations. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

/* ---------------------------------------------------------------- products */

const AMOUNT = /^\d{1,6}([.,]\d{1,2})?$/;

/** "49", "49.9" or "49,90" → cents. Returns null when it isn't an amount. */
export function parseEuros(value: string): number | null {
  const v = value.trim();
  if (!AMOUNT.test(v)) return null;
  return Math.round(Number.parseFloat(v.replace(",", ".")) * 100);
}

const wholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, { error: message })
    .transform(Number)
    .refine((n) => n >= min && n <= max, { error: message });

export const productSchema = z
  .object({
    title: z.string().trim().min(3, { error: "Give the product a title." }).max(80, { error: "Use at most 80 characters." }),
    category: z.enum(CATEGORIES, { error: "Choose a category." }),
    description: z.string().trim().max(2000, { error: "Use at most 2,000 characters." }),
    price: z.string().trim(),
    commissionType: z.enum(["percent", "fixed"], { error: "Choose how affiliates are paid." }),
    commissionPercent: z.string().trim(),
    commissionFixed: z.string().trim(),
    cookieDays: wholeNumber(1, 90, "Choose between 1 and 90 days."),
    refundDays: wholeNumber(0, 90, "Choose between 0 and 90 days."),
    image: z.union([z.enum(PRODUCT_IMAGES), z.literal("")]),
    approval: z.enum(["open", "application"], { error: "Choose who can promote this product." }),
    commissionApproval: z.enum(["auto", "manual"], { error: "Choose how commissions are approved." }),
    intent: z.enum(["draft", "publish"]),
  })
  .superRefine((v, ctx) => {
    const price = parseEuros(v.price);
    if (price === null || price < 100 || price > 10_000_00) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price between €1 and €10,000." });
    }
    if (v.commissionType === "percent") {
      const pct = Number(v.commissionPercent.replace(",", "."));
      if (v.commissionPercent === "" || !Number.isFinite(pct) || pct < 0 || pct > 90) {
        ctx.addIssue({ code: "custom", path: ["commissionPercent"], message: "Enter a percentage from 0 to 90." });
      }
    } else if (parseEuros(v.commissionFixed) === null) {
      ctx.addIssue({ code: "custom", path: ["commissionFixed"], message: "Enter an amount like 20 or 19.50." });
    }
  });

/* ---------------------------------------------------------------- checkout */

export const checkoutSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(2, { error: "Enter your name." }).max(80),
  email,
  country: z.enum(COUNTRY_CODES, { error: "Choose your country." }),
});

/* ----------------------------------------------------------------- payouts */

const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export const payoutMethodSchema = z
  .object({
    type: z.enum(["bank", "paypal", "wise"], { error: "Choose a payout method." }),
    holder: z.string().trim().min(2, { error: "Enter the account holder's name." }).max(80),
    details: z.string().trim().min(1, { error: "This field is required." }).max(120),
  })
  .superRefine((v, ctx) => {
    if (v.type === "bank") {
      if (!IBAN.test(v.details.replace(/\s+/g, "").toUpperCase())) {
        ctx.addIssue({ code: "custom", path: ["details"], message: "Enter a valid IBAN, e.g. DE00 0000 0000 0000 0000 00." });
      }
    } else if (!z.email().safeParse(v.details.toLowerCase()).success) {
      ctx.addIssue({ code: "custom", path: ["details"], message: "Enter the email address of the account." });
    }
  });

/* ------------------------------------------------------------------- links */

const utm = z
  .string()
  .trim()
  .max(60, { error: "Use at most 60 characters." })
  .regex(/^[\w .-]*$/, { error: "Use letters, numbers, spaces, dots, dashes and underscores." });

export const campaignLinkSchema = z.object({
  productId: z.uuid({ error: "Choose a product." }),
  campaign: z
    .string()
    .trim()
    .min(2, { error: "Name the campaign, e.g. instagram-bio." })
    .max(40, { error: "Use at most 40 characters." })
    .regex(/[a-zA-Z0-9]/, { error: "Use letters or numbers." }),
  utmSource: utm,
  utmMedium: utm,
  utmCampaign: utm,
});

export const applicationSchema = z.object({
  message: z.string().trim().max(500, { error: "Use at most 500 characters." }),
});

/* --------------------------------------------------------------- creatives */

export const creativeSchema = z
  .object({
    productId: z.uuid({ error: "Choose a product." }),
    kind: z.enum(["banner", "text"]),
    title: z.string().trim().min(2, { error: "Give it a name." }).max(60, { error: "Use at most 60 characters." }),
    size: z.union([z.enum(BANNER_SIZE_VALUES), z.literal("")]),
    image: z.union([z.enum(PRODUCT_IMAGES), z.literal("")]),
    headline: z.string().trim().max(60, { error: "Use at most 60 characters." }),
    body: z.string().trim().max(800, { error: "Use at most 800 characters." }),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "banner" && v.size === "") {
      ctx.addIssue({ code: "custom", path: ["size"], message: "Choose a banner size." });
    }
    if (v.kind === "text" && v.body.length < 10) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "Write the text affiliates can use." });
    }
  });
