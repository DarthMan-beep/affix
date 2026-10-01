import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh flex-col px-5 sm:px-10 lg:px-14 xl:px-20">
        <header className="flex h-[76px] items-center justify-between">
          <Logo sizeClass="h-[28px] w-auto" className="text-ink" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.88rem] font-medium text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            <ArrowLeft size={15} /> Back to site
          </Link>
        </header>

        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[25rem] lg:mx-0">{children}</div>
        </main>

        <footer className="flex flex-wrap gap-x-5 gap-y-1 py-6 text-[0.8rem] text-muted-2">
          <span>© 2026 Affix</span>
          <Link href="#" className="hover:text-ink">Privacy</Link>
          <Link href="#" className="hover:text-ink">Terms</Link>
        </footer>
      </div>

      {/* Editorial panel, desktop only */}
      <aside className="hidden p-3 lg:block">
        <div className="relative isolate flex h-full min-h-[40rem] flex-col justify-end overflow-hidden rounded-[32px] bg-forest-900 p-10 xl:p-14">
          <Image
            src="/images/story-lena.jpg"
            alt="Lena Hoffmann, pilates instructor, in her studio"
            fill
            preload
            sizes="50vw"
            quality={90}
            className="-z-20 object-cover object-[50%_20%]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-950/95 via-forest-950/40 to-transparent" />

          <div className="ui-card absolute right-8 top-8 w-[17rem] rounded-2xl p-4 xl:right-12 xl:top-12">
            <div className="flex items-center justify-between">
              <p className="label-mono text-[0.6rem] text-muted-2">Commission payout</p>
              <span className="font-mono inline-flex items-center gap-1 rounded-full bg-spring/30 px-2 py-0.5 text-[0.7rem] font-medium text-leaf-700">
                <Check size={11} strokeWidth={3} /> 2.4s
              </span>
            </div>
            <p className="font-display tracking-heading tabular mt-2 text-[1.75rem] font-bold leading-none text-leaf-700">
              +€50.08
            </p>
            <p className="mt-1.5 text-[0.75rem] text-muted">Pilates Foundations · via @fitwithnoor</p>
          </div>

          <blockquote className="font-display tracking-heading max-w-[30rem] text-[clamp(1.6rem,2.2vw,2.1rem)] font-semibold leading-[1.18] text-cream">
            &ldquo;Now 214 affiliates sell my course, and I never think about payouts.&rdquo;
          </blockquote>
          <p className="mt-5 text-[0.95rem] text-cream/70">
            <span className="font-semibold text-cream">Lena Hoffmann</span> · Pilates instructor, Hamburg
          </p>
        </div>
      </aside>
    </div>
  );
}
