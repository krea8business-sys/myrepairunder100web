"use client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { trackSchema } from "@/lib/validation";

export function TrackForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<{ code?: string; mobile?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = trackSchema.safeParse({ code, mobile });
    if (!parsed.success) {
      const f: Record<string, string> = {};
      for (const i of parsed.error.issues) f[String(i.path[0])] ??= i.message;
      setErrors(f);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lookup failed. Please try again.");
      router.push(`/booking/${data.code}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <TextField label="Booking ID" placeholder="MRU-XXXXXXXX" autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))} error={errors.code} data-testid="track-code" />
      <TextField label="Mobile number" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value.slice(0, 16))} error={errors.mobile} data-testid="track-mobile" />
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" loading={loading}>
        <Search className="h-5 w-5" /> Find my booking
      </Button>
      <p className="text-xs text-ink-muted">For your privacy, booking details are shown only when both the booking ID and mobile number match.</p>
    </form>
  );
}
