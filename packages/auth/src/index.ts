import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authOptions } from "./options";

/** The server-side auth instance for the Next.js app. */
export const auth = betterAuth({
  ...authOptions,
  // nextCookies lets Server Actions set the session cookie. It must stay last.
  plugins: [...authOptions.plugins, nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
export { APIError } from "better-auth/api";
