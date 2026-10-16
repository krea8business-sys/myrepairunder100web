"use client";
import { clsx } from "clsx";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, CalendarDays, Check, CheckCircle2, Home, Loader2, LocateFixed, MapPin, Pencil, ShoppingBag, User, XCircle, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cart, useCart } from "@/components/cart/cart-store";
import { PriceSummary } from "@/components/cart/PriceSummary";
import { useQuote } from "@/components/cart/useQuote";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextArea, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics";
import { formatDateLabel, formatINR, formatMobile } from "@/lib/format";
import type { DayAvailability } from "@/lib/slots";
import { addressSchema, customerSchema, fieldErrors, scheduleSchema } from "@/lib/validation";
import { clearDraft, loadDraft, saveDraft, type Draft } from "./draft";

const STEPS = [
  { key: "details", label: "Your details", icon: User },
  { key: "address", label: "Address", icon: MapPin },
  { key: "schedule", label: "Date & time", icon: CalendarDays },
  { key: "review", label: "Review", icon: Check },
] as const;

type Errors = Record<string, string>;
type Svc = { status: "idle" | "checking" | "ok" | "no" | "error"; message?: string; checkedPin?: string; unsupported?: string[] };

export function Checkout() {
  const { lines, hydrated } = useCart();
  const { quote, loading: quoteLoading, error: quoteError, retry: retryQuote, visitFeeIsDemo } = useQuote(lines, hydrated);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [svc, setSvc] = useState<Svc>({ status: "idle" });
  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ status: "idle" | "locating" | "done" | "error"; message?: string }>({ status: "idle" });
  const [geoSupported, setGeoSupported] = useState(false);
  const submittingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    setDraft(loadDraft());
    setGeoSupported(typeof navigator !== "undefined" && "geolocation" in navigator);
  }, []);

  const update = useCallback((fn: (d: Draft) => Draft) => {
    setDraft((d) => {
      if (!d) return d;
      const next = fn(d);
      saveDraft(next);
      return next;
    });
  }, []);

  const step = draft?.step ?? 0;
  const goto = (s: number) => {
    update((d) => ({ ...d, step: s }));
    setTimeout(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 30);
  };

  const categoryIds = useMemo(() => [...new Set(lines.map((l) => l.categoryId))], [lines]);

  const loadSlots = useCallback(async () => {
    setSlotsError(null);
    setDays(null);
    try {
      const res = await fetch("/api/slots", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDays(data.days);
    } catch (e) {
      setSlotsError((e as Error).message || "Couldn't load available slots.");
    }
  }, []);

  useEffect(() => {
    if (step === 2 || step === 3) loadSlots();
  }, [step, loadSlots]);

  // Auto-fetch location when the customer reaches the address step with an empty address (once per session).
  useEffect(() => {
    if (step !== 1 || !geoSupported || !draft) return;
    const a = draft.address;
    if (a.street || a.houseNo || a.latitude != null) return;
    try {
      if (sessionStorage.getItem("mru_geo_auto")) return;
      sessionStorage.setItem("mru_geo_auto", "1");
    } catch {}
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, geoSupported, draft === null]);

  // If the stored slot is no longer available, clear it.
  useEffect(() => {
    if (!days || !draft) return;
    const { date, slotId, asap } = draft.schedule;
    if (!date) return;
    const d = days.find((x) => x.date === date);
    const valid = d && !d.closed && (asap ? d.asapAvailable : d.slots.some((s) => s.id === slotId && s.available));
    if (!valid && (slotId || asap)) update((dr) => ({ ...dr, schedule: { ...dr.schedule, slotId: null, asap: false, slotLabel: "" } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function checkPincode(pincode: string): Promise<boolean> {
    if (!/^[1-9]\d{5}$/.test(pincode)) return false;
    setSvc({ status: "checking" });
    try {
      const res = await fetch("/api/serviceability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pincode, categoryIds }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSvc({ status: data.serviceable ? "ok" : "no", message: data.message, checkedPin: pincode, unsupported: data.unsupportedCategoryIds });
      if (data.serviceable && data.city) update((d) => ({ ...d, address: { ...d.address, city: d.address.city || data.city, state: d.address.state || data.state } }));
      return data.serviceable;
    } catch (e) {
      setSvc({ status: "error", message: (e as Error).message || "Couldn't check pincode" });
      return false;
    }
  }

  function validateStep(s: number): boolean {
    if (!draft) return false;
    let r;
    if (s === 0) r = customerSchema.safeParse(draft.customer);
    else if (s === 1) r = addressSchema.safeParse({ ...draft.address, landmark: draft.address.landmark || undefined, instructions: draft.address.instructions || undefined });
    else if (s === 2) r = scheduleSchema.safeParse({ date: draft.schedule.date, slotId: draft.schedule.slotId, asap: draft.schedule.asap });
    else return true;
    if (!r.success) {
      const prefix = s === 0 ? "customer." : s === 1 ? "address." : "schedule.";
      const fe = fieldErrors(r.error);
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [prefix + k, v])));
      setTimeout(() => (document.querySelector("[aria-invalid=true]") as HTMLElement | null)?.focus(), 30);
      return false;
    }
    setErrors({});
    return true;
  }

  async function next() {
    if (!draft) return;
    if (!validateStep(step)) return;
    if (step === 1) {
      const okPin = svc.status === "ok" && svc.checkedPin === draft.address.pincode ? true : await checkPincode(draft.address.pincode);
      if (!okPin) {
        setErrors({ "address.pincode": "We can't book this pincode online yet." });
        return;
      }
    }
    if (step === 0) track("checkout_details_completed");
    goto(Math.min(3, step + 1));
  }

  async function locateMe() {
    if (!navigator.geolocation) return;
    setGeo({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        update((d) => ({ ...d, address: { ...d.address, latitude: lat, longitude: lng } }));
        try {
          const res = await fetch("/api/geocode/reverse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lng }) });
          const data = await res.json();
          if (res.ok && data.configured && data.result) {
            const g = data.result;
            update((d) => ({
              ...d,
              address: {
                ...d.address,
                street: d.address.street || [g.street, g.locality].filter(Boolean).join(", "),
                city: g.city || d.address.city,
                state: g.state || d.address.state,
                pincode: g.pincode || d.address.pincode,
              },
            }));
            const place = [g.locality, g.city, g.pincode].filter(Boolean).join(", ");
            setGeo({ status: "done", message: `Location detected${place ? `: ${place}` : ""}. Please add your house / flat number and check the details.` });
            if (g.pincode) checkPincode(g.pincode);
          } else {
            setGeo({ status: "done", message: "Location saved for the technician. We couldn't look up the street address — please type it below." });
          }
        } catch {
          setGeo({ status: "done", message: "Location saved for the technician. We couldn't look up the street address — please type it below." });
        }
      },
      (err) => setGeo({ status: "error", message: err.code === 1 ? "Location permission was denied. Please enter your address manually." : "Couldn't get your location. Please enter your address manually." }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function submit() {
    if (!draft || submittingRef.current) return;
    for (const s of [0, 1, 2]) {
      if (!validateStep(s)) {
        goto(s);
        return;
      }
    }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: draft.idempotencyKey,
          customer: { name: draft.customer.name, mobile: draft.customer.mobile, email: draft.customer.email || undefined },
          address: {
            ...draft.address,
            landmark: draft.address.landmark || undefined,
            instructions: draft.address.instructions || undefined,
            latitude: draft.address.latitude ?? undefined,
            longitude: draft.address.longitude ?? undefined,
          },
          schedule: { date: draft.schedule.date, slotId: draft.schedule.asap ? null : draft.schedule.slotId, asap: draft.schedule.asap },
          items: lines.map((l) => ({ serviceId: l.serviceId, quantity: l.quantity })),
          note: draft.note || undefined,
          website: "",
        }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {}
      if (res.ok && typeof data.code === "string") {
        track("booking_confirmed", { items: lines.length, value: quote?.total ?? 0 });
        cart.clear(); // only after the server confirmed the booking exists
        clearDraft();
        router.replace(`/booking/${data.code}?new=1`);
        return;
      }
      const msg = (data.error as string) || "We couldn't place your booking. Please try again.";
      if (res.status === 422 && data.fields) {
        const f = data.fields as Errors;
        setErrors(f);
        const first = Object.keys(f)[0] ?? "";
        goto(first.startsWith("customer") ? 0 : first.startsWith("address") ? 1 : first.startsWith("schedule") ? 2 : 3);
        toast(msg, "error");
      } else if (data.code === "SERVICES_UNAVAILABLE") {
        cart.removeMany((data.unavailableServiceIds as string[]) ?? []);
        setSubmitError(msg);
      } else if (data.code === "NOT_SERVICEABLE") {
        setSvc({ status: "no", message: msg, checkedPin: draft.address.pincode });
        setErrors({ "address.pincode": msg });
        goto(1);
      } else if (data.code === "SLOT_UNAVAILABLE") {
        update((d) => ({ ...d, schedule: { ...d.schedule, slotId: null, asap: false, slotLabel: "" } }));
        toast(msg, "error");
        goto(2);
      } else {
        setSubmitError(msg);
      }
    } catch {
      setSubmitError("Network problem — your booking was not confirmed. Your details are saved; please check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!hydrated || !draft) {
    return (
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState icon={<ShoppingBag className="h-7 w-7" />} title="Your cart is empty" body="Add at least one service before booking." action={<ButtonLink href="/services">Browse services</ButtonLink>} />
      </div>
    );
  }

  const e = (k: string) => errors[k];
  const setC = (k: keyof Draft["customer"], v: string) => update((d) => ({ ...d, customer: { ...d.customer, [k]: v } }));
  const setA = <K extends keyof Draft["address"]>(k: K, v: Draft["address"][K]) => update((d) => ({ ...d, address: { ...d.address, [k]: v } }));
  const selectedDay = days?.find((d) => d.date === draft.schedule.date);

  return (
    <div className="mt-6 grid gap-6 pb-28 lg:grid-cols-[1fr_360px] lg:pb-0">
      <div>
        {/* Stepper */}
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Checkout steps">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && goto(i)}
                  className={clsx("flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center text-[11px] font-semibold sm:flex-row sm:text-left sm:text-sm", active ? "text-navy-900" : done ? "text-success-700 hover:bg-success-50" : "text-ink-soft")}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full ring-2", active ? "bg-navy-900 text-white ring-navy-900" : done ? "bg-success-500 text-white ring-success-500" : "bg-white ring-line-strong")}>
                    {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </span>
                  <span>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="card p-5 sm:p-7">
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
            {step === 0 && "Your contact details"}
            {step === 1 && "Where should we come?"}
            {step === 2 && "Choose a preferred date & time"}
            {step === 3 && "Review your booking"}
          </h2>

          {step === 0 && (
            <form
              className="mt-5 grid gap-4"
              onSubmit={(ev) => {
                ev.preventDefault();
                next();
              }}
              noValidate
            >
              <p className="text-sm text-ink-muted">No account or OTP needed. We&apos;ll use your mobile number to contact you about this booking.</p>
              <TextField label="Full name" name="name" autoComplete="name" value={draft.customer.name} onChange={(ev) => setC("name", ev.target.value)} error={e("customer.name")} required maxLength={80} />
              <TextField
                label="Mobile number"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                value={draft.customer.mobile}
                onChange={(ev) => setC("mobile", ev.target.value.replace(/[^\d+\s-]/g, "").slice(0, 16))}
                error={e("customer.mobile")}
                hint="Indian mobile number. You'll need it with your booking ID to track the booking."
                required
              />
              <TextField label="Email address" name="email" type="email" inputMode="email" autoComplete="email" optional value={draft.customer.email} onChange={(ev) => setC("email", ev.target.value)} error={e("customer.email")} hint="We'll email booking updates if email is enabled." />
              <button type="submit" className="hidden" />
            </form>
          )}

          {step === 1 && (
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                next();
              }}
              noValidate
            >
              {geoSupported && (
                <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:col-span-2 sm:flex-row sm:items-center" aria-live="polite" data-testid="geo-box">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm">
                    {geo.status === "locating" ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
                  </span>
                  <p className={clsx("flex-1 text-sm", geo.status === "error" ? "text-amber-800" : "text-navy-800")} data-testid="geo-message">
                    {geo.status === "locating"
                      ? "Detecting your location…"
                      : geo.message ?? "Fill your address automatically from your current location."}
                  </p>
                  <Button type="button" variant="outline" size="sm" className="bg-white" onClick={locateMe} disabled={geo.status === "locating"} data-testid="geo-button">
                    {geo.status === "idle" ? "Detect my location" : "Detect again"}
                  </Button>
                </div>
              )}
              <TextField label="House / flat number" autoComplete="address-line1" value={draft.address.houseNo} onChange={(ev) => setA("houseNo", ev.target.value)} error={e("address.houseNo")} placeholder="e.g. H-12, 2nd floor" />
              <TextField label="Building, street or locality" autoComplete="address-line2" value={draft.address.street} onChange={(ev) => setA("street", ev.target.value)} error={e("address.street")} placeholder="e.g. Gali No. 5, Sant Nagar" />
              <TextField label="Landmark" optional value={draft.address.landmark} onChange={(ev) => setA("landmark", ev.target.value)} error={e("address.landmark")} placeholder="Near…" />
              <TextField
                label="Pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={draft.address.pincode}
                onChange={(ev) => {
                  const v = ev.target.value.replace(/\D/g, "").slice(0, 6);
                  setA("pincode", v);
                  setSvc({ status: "idle" });
                  setErrors(({ "address.pincode": _drop, ...rest }) => rest);
                  if (v.length === 6) checkPincode(v);
                }}
                error={e("address.pincode")}
                data-testid="pincode"
              />
              <TextField label="City" autoComplete="address-level2" value={draft.address.city} onChange={(ev) => setA("city", ev.target.value)} error={e("address.city")} list="ncr-cities" />
              <TextField label="State" autoComplete="address-level1" value={draft.address.state} onChange={(ev) => setA("state", ev.target.value)} error={e("address.state")} list="ncr-states" />
              <datalist id="ncr-cities">
                {["Delhi", "New Delhi", "Gurugram", "Noida", "Greater Noida", "Ghaziabad", "Faridabad"].map((c) => <option key={c} value={c} />)}
              </datalist>
              <datalist id="ncr-states">
                {["Delhi", "Haryana", "Uttar Pradesh"].map((c) => <option key={c} value={c} />)}
              </datalist>

              <div className="sm:col-span-2" aria-live="polite">
                {svc.status === "checking" && (
                  <p className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking service availability…
                  </p>
                )}
                {svc.status === "ok" && (
                  <p className="flex items-start gap-2 rounded-xl bg-success-50 p-3 text-sm text-success-700" data-testid="svc-ok">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {svc.message}
                  </p>
                )}
                {(svc.status === "no" || svc.status === "error") && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" data-testid="svc-no">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      {svc.message}
                      {svc.unsupported && svc.unsupported.length > 0 && svc.unsupported.length < categoryIds.length && (
                        <p className="mt-1">Not available here: {lines.filter((l) => svc.unsupported!.includes(l.categoryId)).map((l) => l.name).join(", ")}. Remove them from your cart to continue.</p>
                      )}
                      <Link href="/support" className="mt-1 block font-semibold underline">Contact support</Link>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-ink-soft">Serviceability is checked against our configured pincodes; it isn&apos;t a verification of your exact address.</p>
              </div>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-semibold text-navy-900">Address type</legend>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["HOME", "Home", Home],
                    ["OFFICE", "Office", Building2],
                    ["OTHER", "Other", MapPin],
                  ] as const).map(([v, label, Icon]) => (
                    <label key={v} className={clsx("inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition has-[:focus-visible]:shadow-focus", draft.address.addressType === v ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong text-navy-800 hover:bg-navy-50")}>
                      <input type="radio" name="addressType" value={v} checked={draft.address.addressType === v} onChange={() => setA("addressType", v)} className="sr-only" />
                      <Icon className="h-4 w-4" /> {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <TextArea className="sm:col-span-2" label="Instructions for the technician" optional value={draft.address.instructions} onChange={(ev) => setA("instructions", ev.target.value)} maxLength={300} placeholder="e.g. Call before arriving, 3rd floor, no lift" />
              <button type="submit" className="hidden" />
            </form>
          )}

          {step === 2 && (
            <div className="mt-5">
              <p className="text-sm text-ink-muted">Times are in India Standard Time (IST). This is a <strong>requested</strong> slot — we&apos;ll confirm it after checking technician availability.</p>
              {slotsError ? (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {slotsError}{" "}
                  <Button size="sm" variant="outline" onClick={loadSlots} className="ml-2">Retry</Button>
                </div>
              ) : !days ? (
                <div className="mt-5 flex gap-2">
                  {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-20" />)}
                </div>
              ) : (
                <>
                  <h3 className="mt-5 text-sm font-bold text-navy-900">Date</h3>
                  <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Service date">
                    {days.map((d) => {
                      const sel = draft.schedule.date === d.date;
                      const any = !d.closed && (d.asapAvailable || d.slots.some((s) => s.available));
                      const [, , dd] = d.date.split("-");
                      return (
                        <button
                          key={d.date}
                          type="button"
                          role="radio"
                          aria-checked={sel}
                          disabled={!any}
                          onClick={() => update((dr) => ({ ...dr, schedule: { date: d.date, slotId: null, asap: false, slotLabel: "" } }))}
                          className={clsx("flex w-[76px] shrink-0 flex-col items-center rounded-2xl border py-2.5 transition disabled:cursor-not-allowed disabled:opacity-45", sel ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong bg-white text-navy-900 hover:border-navy-400")}
                          data-testid="date-option"
                        >
                          <span className="text-[11px] font-semibold uppercase">{d.isToday ? "Today" : formatDateLabel(d.date, { withYear: false }).split(",")[0]}</span>
                          <span className="text-xl font-extrabold">{Number(dd)}</span>
                          <span className="text-[11px]">{d.closed ? "Closed" : any ? formatDateLabel(d.date, { withYear: false }).split(" ").slice(-1)[0] : "Full"}</span>
                        </button>
                      );
                    })}
                  </div>
                  {e("schedule.date") && <p className="mt-1 text-sm text-red-600">{e("schedule.date")}</p>}

                  {selectedDay && (
                    <>
                      <h3 className="mt-5 text-sm font-bold text-navy-900">Time slot</h3>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Time slot">
                        {selectedDay.asapAvailable && (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={draft.schedule.asap}
                            onClick={() => update((dr) => ({ ...dr, schedule: { ...dr.schedule, asap: true, slotId: null, slotLabel: "ASAP — earliest available" } }))}
                            className={clsx("flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition sm:col-span-2", draft.schedule.asap ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong hover:border-navy-400")}
                          >
                            <Zap className="h-5 w-5 shrink-0" />
                            <span>
                              <span className="block font-bold">ASAP — earliest available</span>
                              <span className={clsx("block text-xs", draft.schedule.asap ? "text-navy-200" : "text-ink-muted")}>We&apos;ll call to confirm the earliest time we can reach you today.</span>
                            </span>
                          </button>
                        )}
                        {selectedDay.slots.filter((s) => s.reason !== "past").map((s) => {
                          const sel = draft.schedule.slotId === s.id && !draft.schedule.asap;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              role="radio"
                              aria-checked={sel}
                              disabled={!s.available}
                              onClick={() => update((dr) => ({ ...dr, schedule: { ...dr.schedule, slotId: s.id, asap: false, slotLabel: s.label } }))}
                              className={clsx("flex items-center justify-between rounded-xl border px-4 py-3 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-45", sel ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong hover:border-navy-400")}
                              data-testid="slot-option"
                            >
                              {s.label}
                              <span className={clsx("text-xs font-medium", sel ? "text-navy-200" : "text-ink-muted")}>{s.available ? "" : s.reason === "full" ? "Full" : "Unavailable"}</span>
                            </button>
                          );
                        })}
                        {selectedDay.slots.filter((s) => s.reason !== "past").length === 0 && !selectedDay.asapAvailable && <p className="text-sm text-ink-muted">No more slots today. Please choose another date.</p>}
                      </div>
                      {e("schedule.slotId") && <p className="mt-2 text-sm text-red-600">{e("schedule.slotId")}</p>}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 space-y-5">
              <ReviewBlock title="Contact" onEdit={() => goto(0)}>
                <p className="font-semibold text-navy-900">{draft.customer.name}</p>
                <p>{formatMobile(draft.customer.mobile)}</p>
                {draft.customer.email && <p>{draft.customer.email}</p>}
              </ReviewBlock>
              <ReviewBlock title="Service address" onEdit={() => goto(1)}>
                <p>
                  {[draft.address.houseNo, draft.address.street, draft.address.landmark && `Near ${draft.address.landmark}`].filter(Boolean).join(", ")}
                </p>
                <p>
                  {draft.address.city}, {draft.address.state} – {draft.address.pincode} · {draft.address.addressType.charAt(0) + draft.address.addressType.slice(1).toLowerCase()}
                </p>
                {draft.address.instructions && <p className="mt-1 text-ink-soft">“{draft.address.instructions}”</p>}
              </ReviewBlock>
              <ReviewBlock title="Requested date & time" onEdit={() => goto(2)}>
                <p className="font-semibold text-navy-900">
                  {draft.schedule.date ? formatDateLabel(draft.schedule.date) : "—"} · {draft.schedule.slotLabel || "—"}
                </p>
                <p className="text-xs">Subject to confirmation by our team.</p>
              </ReviewBlock>
              <ReviewBlock title="Services" onEdit={() => router.push("/cart")} editLabel="Edit cart">
                <ul className="space-y-1">
                  {lines.map((l) => (
                    <li key={l.serviceId}>
                      {l.name} {l.quantity > 1 && `× ${l.quantity}`} <span className="text-ink-soft">· {l.categoryName}</span>
                    </li>
                  ))}
                </ul>
              </ReviewBlock>
              <div>
                <TextArea label="Note for the technician" optional value={draft.note} maxLength={500} onChange={(ev) => update((d) => ({ ...d, note: ev.target.value }))} />
              </div>
              <div className="lg:hidden">{quote && <PriceSummary quote={quote} visitFeeIsDemo={visitFeeIsDemo} />}</div>
              <p className="text-xs text-ink-muted">
                By confirming, you agree to our <Link href="/policies/terms" className="underline">terms</Link>, <Link href="/policies/cancellation" className="underline">cancellation policy</Link> and{" "}
                <Link href="/policies/privacy" className="underline">privacy policy</Link>. No payment is taken now.
              </p>
              {submitError && (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {submitError}
                </div>
              )}
            </div>
          )}

          {/* Desktop actions */}
          <div className="mt-8 hidden items-center justify-between gap-3 lg:flex">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => goto(step - 1)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Link href="/cart" className="text-sm font-semibold text-brand-700 hover:underline">← Back to cart</Link>
            )}
            {step < 3 ? (
              <Button size="lg" onClick={next} data-testid="continue">
                Continue <ArrowRight className="h-5 w-5" />
              </Button>
            ) : (
              <Button size="lg" variant="success" onClick={submit} loading={submitting} disabled={!quote || quoteLoading} data-testid="confirm-booking">
                {submitting ? "Confirming…" : "Confirm Booking"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="card p-5">
          <h2 className="text-lg font-bold">Booking summary</h2>
          <div className="mt-4">
            {quoteError ? (
              <div className="text-sm text-red-700">
                {quoteError} <Button size="sm" variant="outline" onClick={retryQuote}>Retry</Button>
              </div>
            ) : quote ? (
              <PriceSummary quote={quote} visitFeeIsDemo={visitFeeIsDemo} />
            ) : (
              <Skeleton className="h-40" />
            )}
          </div>
        </div>
      </aside>

      {/* Mobile sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step > 0 ? (
            <Button variant="outline" size="lg" className="px-4" onClick={() => goto(step - 1)} disabled={submitting} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">Estimated</p>
              <p className="font-extrabold text-navy-900">{quote ? formatINR(quote.total) : "…"}</p>
            </div>
          )}
          {step < 3 ? (
            <Button size="lg" className="flex-1" onClick={next} data-testid="continue-mobile">
              Continue <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="lg" variant="success" className="flex-1" onClick={submit} loading={submitting} disabled={!quote || quoteLoading} data-testid="confirm-booking-mobile">
              {submitting ? "Confirming…" : "Confirm Booking"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewBlock({ title, children, onEdit, editLabel = "Edit" }: { title: string; children: React.ReactNode; onEdit: () => void; editLabel?: string }) {
  return (
    <section className="rounded-xl border border-line p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">
          <Pencil className="h-3.5 w-3.5" /> {editLabel}
        </button>
      </div>
      <div className="text-sm text-ink-muted">{children}</div>
    </section>
  );
}
