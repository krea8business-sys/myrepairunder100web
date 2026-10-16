"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy Booking ID" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = value;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-50 px-3 text-sm font-semibold text-navy-800 hover:bg-navy-100"
      aria-label={label}
    >
      {copied ? <Check className="h-4 w-4 text-success-600" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : label}
    </button>
  );
}
