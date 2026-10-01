"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://affix.to/${code}`;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-left transition-colors hover:border-ink/30"
      aria-label={`Copy link ${url}`}
    >
      <span className="font-mono truncate text-[0.8rem] text-ink">affix.to/{code}</span>
      {copied ? (
        <Check size={14} className="shrink-0 text-leaf-700" />
      ) : (
        <Copy size={14} className="shrink-0 text-muted group-hover:text-ink" />
      )}
    </button>
  );
}
