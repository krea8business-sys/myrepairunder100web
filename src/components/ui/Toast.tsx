"use client";
import { clsx } from "clsx";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; tone: Tone; message: string };
const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { id, tone, message }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite" role="status">
        {items.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lift ring-1",
              t.tone === "success" && "bg-navy-950 text-white ring-navy-900",
              t.tone === "error" && "bg-white text-red-700 ring-red-200",
              t.tone === "info" && "bg-white text-navy-900 ring-line",
            )}
          >
            {t.tone === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success-500" /> : t.tone === "error" ? <XCircle className="h-5 w-5 shrink-0" /> : <Info className="h-5 w-5 shrink-0 text-brand-700" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))} aria-label="Dismiss" className="rounded p-0.5 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
