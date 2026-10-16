"use client";
import { clsx } from "clsx";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";

export const inputClass =
  "block w-full rounded-xl border bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-soft transition focus:outline-none focus:ring-4 disabled:bg-slate-50";

export function fieldStateClass(error?: string) {
  return error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-line-strong focus:border-brand-500 focus:ring-brand-100";
}

type FieldProps = { label: string; error?: string; hint?: ReactNode; optional?: boolean; children?: ReactNode };

export const TextField = forwardRef<HTMLInputElement, ComponentProps<"input"> & FieldProps>(function TextField(
  { label, error, hint, optional, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-navy-900">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-soft">Optional</span>}
      </label>
      <input
        ref={ref}
        id={fid}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={clsx(inputClass, fieldStateClass(error))}
        {...props}
      />
      {error ? (
        <p id={`${fid}-err`} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function TextArea({ label, error, hint, optional, className, id, ...props }: ComponentProps<"textarea"> & FieldProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-navy-900">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-soft">Optional</span>}
      </label>
      <textarea id={fid} aria-invalid={Boolean(error) || undefined} className={clsx(inputClass, fieldStateClass(error), "min-h-[88px] resize-y")} {...props} />
      {error ? <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p> : hint ? <p className="mt-1.5 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
