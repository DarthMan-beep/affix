import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin } from "better-auth/plugins";
import { account, db, session, user, verification } from "@affix/db";
import { sendEmail } from "./email";

/**
 * Shared Better Auth configuration. `index.ts` adds the Next.js cookie plugin
 * for the web app; scripts (the seed) use these options as they are.
 * Secret and base URL come from BETTER_AUTH_SECRET / BETTER_AUTH_URL.
 */
export const authOptions = {
  appName: "Affix",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
    // Sign-in works before verification; the dashboard nudges people to verify.
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Affix password",
        action: "Reset password",
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email for Affix",
        action: "Verify email",
        url,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
} satisfies BetterAuthOptions;
