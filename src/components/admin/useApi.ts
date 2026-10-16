"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/Toast";

export type ApiResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string>; data?: Record<string, unknown> };

/** Small fetch helper for admin mutations: JSON, toasts, refresh. */
export function useApi() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const call = useCallback(
    async <T = Record<string, unknown>>(method: string, url: string, body?: unknown, opts: { success?: string; refresh?: boolean } = {}): Promise<ApiResult<T>> => {
      setPending(true);
      try {
        const res = await fetch(url, {
          method,
          headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
          body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast("Your session has expired. Please sign in again.", "error");
          router.push("/admin/login");
          return { ok: false, error: "Not signed in" };
        }
        if (!res.ok) {
          const fieldMsg = data.fields ? Object.entries(data.fields as Record<string, string>).map(([k, v]) => `${k}: ${v}`)[0] : null;
          toast(fieldMsg ? `${data.error} (${fieldMsg})` : data.error || "Something went wrong", "error");
          return { ok: false, error: data.error, fields: data.fields, data };
        }
        if (opts.success) toast(opts.success);
        if (opts.refresh !== false) router.refresh();
        return { ok: true, data };
      } catch {
        toast("Network error — please try again.", "error");
        return { ok: false, error: "Network error" };
      } finally {
        setPending(false);
      }
    },
    [router, toast],
  );
  return { call, pending };
}
