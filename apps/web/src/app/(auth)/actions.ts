"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError, auth } from "@affix/auth";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  safeNext,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";
import { openAffiliateWorkspace, openVendorWorkspace } from "@/lib/workspaces";

export type FormState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<string, string[]>>;
      values?: Record<string, string>;
      done?: boolean;
    }
  | undefined;

const fields = (formData: FormData) =>
  Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<
    string,
    string
  >;

/** Turn Better Auth errors into copy a person can act on. */
function describe(error: unknown, fallback: string) {
  if (!(error instanceof APIError)) return fallback;
  const code = String(error.body?.code ?? "");
  if (error.status === "TOO_MANY_REQUESTS" || code.includes("RATE_LIMIT")) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (code.includes("INVALID_EMAIL_OR_PASSWORD")) return "That email and password don't match an account.";
  if (code.includes("ALREADY_EXISTS")) return "An account with this email already exists. Sign in instead.";
  if (code.includes("BANNED")) return "This account is suspended. Contact support to restore access.";
  if (code.includes("INVALID_TOKEN") || code.includes("EXPIRED")) {
    return "This reset link has expired or was already used. Request a new one.";
  }
  if (code.includes("PASSWORD_TOO_SHORT")) return "Use at least 10 characters.";
  return error.body?.message ?? fallback;
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = fields(formData);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: { email: values.email ?? "" } };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: parsed.data.remember === "on",
      },
      headers: await headers(),
    });
  } catch (error) {
    return { error: describe(error, "We couldn't sign you in. Try again."), values: { email: parsed.data.email } };
  }

  redirect(safeNext(parsed.data.next));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = fields(formData);
  const parsed = signUpSchema.safeParse(values);
  const keep = { name: values.name ?? "", email: values.email ?? "", intent: values.intent ?? "" };
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: keep };
  }

  const { name, email, password, intent } = parsed.data;
  let userId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password, callbackURL: "/dashboard?verified=1" },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (error) {
    return { error: describe(error, "We couldn't create your account. Try again."), values: keep };
  }

  // One account can do both; open the workspaces they asked for.
  if (intent === "vendor" || intent === "both") await openVendorWorkspace(userId, name);
  if (intent === "affiliate" || intent === "both") await openAffiliateWorkspace(userId, name);

  redirect("/dashboard?welcome=1");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = fields(formData);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: "/reset-password" },
      headers: await headers(),
    });
  } catch (error) {
    // Rate limits are worth reporting; anything else would reveal whether the account exists.
    if (error instanceof APIError && error.status === "TOO_MANY_REQUESTS") {
      return { error: describe(error, ""), values };
    }
  }
  return { done: true, values: { email: parsed.data.email } };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = fields(formData);
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
  } catch (error) {
    return { error: describe(error, "We couldn't update your password. Request a new link.") };
  }
  redirect("/sign-in?reset=1");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
