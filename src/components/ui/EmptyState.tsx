import type { ReactNode } from "react";

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">{icon}</div>}
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      {body && <div className="mt-1.5 max-w-md text-sm text-ink-muted">{body}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
