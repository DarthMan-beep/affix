import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Logo } from "@/components/ui/logo";

/** Frame for the buyer-facing pages: product, checkout and order confirmation. */
export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line">
        <div className="container-affix flex h-[72px] items-center justify-between gap-6">
          <Logo sizeClass="h-[28px] w-auto" className="text-ink" />
          <p className="label-mono inline-flex items-center gap-2 text-muted">
            <Lock size={13} /> Secure checkout
          </p>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="container-affix flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-[0.82rem] text-muted-2">
          <span>© 2026 Affix. A university project.</span>
          <span>Sold and delivered through Affix</span>
        </div>
      </footer>
    </div>
  );
}
