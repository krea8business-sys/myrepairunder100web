"use client";
import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useApi } from "./useApi";

export function ImageUpload({ value, onChange, label = "Image" }: { value: string | null; onChange: (url: string | null) => void; label?: string }) {
  const { call, pending } = useApi();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-16 w-20 rounded-lg border border-line object-cover" />
        ) : (
          <div className="grid h-16 w-20 place-items-center rounded-lg border border-dashed border-line-strong text-xs text-ink-soft">Illustration</div>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) return alert("Image must be 2 MB or smaller.");
            const fd = new FormData();
            fd.append("file", f);
            const r = await call<{ url: string }>("POST", "/api/admin/upload", fd, { success: "Image uploaded", refresh: false });
            if (r.ok) onChange(r.data.url);
          }}
        />
        <Button type="button" size="sm" variant="outline" loading={pending} onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" /> Upload</Button>
        {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}><X className="h-4 w-4" /> Remove</Button>}
      </div>
      <p className="mt-1 text-xs text-ink-muted">JPEG, PNG or WebP, max 2 MB. Without an image the built-in illustration is shown.</p>
    </div>
  );
}
