/*
 * Transactional email. No provider is configured yet, so messages are printed
 * to the server terminal. Swap the body of `sendEmail` for Resend, Postmark,
 * etc. when real delivery is needed; the call sites stay the same.
 */

type Email = {
  to: string;
  subject: string;
  /** Button label in a real template, e.g. "Verify email". */
  action: string;
  url: string;
};

export async function sendEmail({ to, subject, action, url }: Email) {
  const line = "─".repeat(64);
  console.info(
    [
      "",
      `┌${line}`,
      `│ ✉  ${subject}`,
      `│ to:     ${to}`,
      `│ ${action}: ${url}`,
      `└${line}`,
      "",
    ].join("\n"),
  );
}
