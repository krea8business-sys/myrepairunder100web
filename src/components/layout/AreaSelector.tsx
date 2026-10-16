"use client";
import { CheckCircle2, ChevronDown, LocateFixed, MapPin, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const PIN_KEY = "mru_pincode";

type Result = { serviceable: boolean; message: string; locality: string | null };

export function AreaSelector({ label, cta }: { label: string; cta: string }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem(PIN_KEY);
      if (p) {
        setSaved(p);
        setPin(p);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const [locating, setLocating] = useState(false);

  function detect() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser. Please type your pincode.");
      return;
    }
    setError(null);
    setResult(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/geocode/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }),
          });
          const data = await res.json();
          const found = data?.result?.pincode as string | undefined;
          if (!res.ok || !found) throw new Error("We couldn't find a pincode for your location. Please type it.");
          setPin(found);
          await runCheck(found);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setError(err.code === 1 ? "Location permission was denied. Please type your pincode." : "Couldn't get your location. Please type your pincode.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  async function check(e: React.FormEvent) {
    e.preventDefault();
    await runCheck(pin);
  }

  async function runCheck(pin: string) {
    setError(null);
    setResult(null);
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setError("Enter a valid 6-digit pincode");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/serviceability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pincode: pin }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not check right now");
      setResult(data);
      try {
        localStorage.setItem(PIN_KEY, pin);
      } catch {}
      setSaved(pin);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-navy-50"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MapPin className="h-5 w-5 shrink-0 text-brand-700" />
        <span className="leading-tight">
          <span className="block text-[13px] font-bold text-navy-900">{label}</span>
          <span className="block text-xs text-ink-muted">{saved ? `Pincode ${saved}` : cta}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-ink-muted" />
      </button>
      {open && (
        <div role="dialog" aria-label="Check service availability" className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,340px)] animate-fade-up rounded-2xl border border-line bg-white p-4 shadow-lift">
          <form onSubmit={check} className="flex gap-2">
            <label htmlFor="area-pin" className="sr-only">
              Pincode
            </label>
            <input
              id="area-pin"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter pincode"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong px-3 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
            <Button type="submit" loading={loading} className="h-11">
              Check
            </Button>
          </form>
          <button type="button" onClick={detect} disabled={locating} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-brand-700 hover:underline disabled:opacity-60" data-testid="area-detect">
            <LocateFixed className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} /> {locating ? "Detecting your location…" : "Use my current location"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {result && (
            <div className={`mt-3 flex gap-2 rounded-xl p-3 text-sm ${result.serviceable ? "bg-success-50 text-success-700" : "bg-amber-50 text-amber-800"}`}>
              {result.serviceable ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{result.message}</span>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-muted">
            Based on our configured service areas.{" "}
            <Link href="/areas" className="font-semibold text-brand-700 hover:underline" onClick={() => setOpen(false)}>
              See all areas
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
