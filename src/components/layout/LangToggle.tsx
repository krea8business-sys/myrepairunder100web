"use client";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const next = lang === "en" ? "hi" : "en";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      className="grid h-11 min-w-10 place-items-center rounded-xl px-1.5 text-sm font-bold text-navy-800 hover:bg-navy-50"
      aria-label={lang === "en" ? "हिंदी में देखें" : "View in English"}
      title={lang === "en" ? "हिंदी" : "English"}
    >
      {lang === "en" ? "हिं" : "EN"}
    </button>
  );
}
