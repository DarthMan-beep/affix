import { auth } from "@affix/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth's endpoints: /api/auth/sign-in/email, /api/auth/verify-email, …
export const { GET, POST } = toNextJsHandler(auth);
