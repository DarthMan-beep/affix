"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** A small button that copies `text` to the clipboard and confirms it. */
export function CopyText({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 transition-colors hover:ring-ink/40"
    >
      {copied ? <Check size={13} className="text-leaf-700" /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
