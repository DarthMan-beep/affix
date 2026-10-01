import { z } from "zod";

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
