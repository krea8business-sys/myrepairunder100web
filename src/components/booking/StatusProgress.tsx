import { clsx } from "clsx";
import { Check } from "lucide-react";
import { PROGRESS_STEPS, STATUS_META, type Status } from "@/lib/status";

export function StatusProgress({ status }: { status: Status }) {
  const idx = PROGRESS_STEPS.indexOf(status);
  return (
    <ol className="mt-5 space-y-0" aria-label="Booking progress">
      {PROGRESS_STEPS.map((s, i) => {
        const done = i < idx || status === "COMPLETED";
        const current = i === idx && status !== "COMPLETED";
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", done ? "bg-success-500 text-white" : current ? "bg-navy-900 text-white ring-4 ring-navy-100" : "bg-navy-50 text-ink-soft ring-1 ring-line-strong")}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {i < PROGRESS_STEPS.length - 1 && <span className={clsx("my-0.5 w-0.5 flex-1 min-h-4", done ? "bg-success-500" : "bg-line")} />}
            </div>
            <p className={clsx("pb-3 text-sm", current ? "font-bold text-navy-900" : done ? "text-navy-800" : "text-ink-soft")} aria-current={current ? "step" : undefined}>
              {STATUS_META[s].label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
