"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** The affiliate's invite link, shown as the affix.to short form; copies the address that works on this site. */
export function InviteLink({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);
  const display = `affix.to/join/${handle}`;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/join/${handle}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-paper px-4 py-3.5 text-left transition-colors hover:border-ink/30 sm:w-auto sm:min-w-[22rem]"
      aria-label={`Copy invite link ${display}`}
    >
      <span className="font-mono truncate text-[0.95rem] text-ink">{display}</span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[0.8rem] font-semibold text-cream transition-colors group-hover:bg-forest-700">
        {copied ? <Check size={13} className="text-spring" /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy link"}
      </span>
    </button>
  );
}
