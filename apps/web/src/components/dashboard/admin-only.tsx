import Link from "next/link";
import { ShieldAlert } from "lucide-react";

/** Shown in place of an admin page to anyone who isn't platform staff. */
export function AdminOnly() {
  return (
    <section className="mx-auto mt-16 max-w-md text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-spring">
        <ShieldAlert size={24} />
      </span>
      <h1 className="font-display tracking-heading mt-6 text-[2rem] font-bold text-ink">Admins only</h1>
      <p className="mt-3 text-[1rem] leading-relaxed text-muted">
        This area is for Affix staff. If you think you should have access, ask an admin to add the admin role to
        your account.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[0.92rem] font-semibold text-cream hover:bg-forest-700"
      >
        Back to overview
      </Link>
    </section>
  );
}
