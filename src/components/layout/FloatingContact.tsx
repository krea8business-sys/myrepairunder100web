"use client";
import { Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-store";

export function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

/** Floating WhatsApp + Call buttons on every customer page (only when numbers are configured). */
export function FloatingContact({ whatsappHref, telHref }: { whatsappHref: string | null; telHref: string | null }) {
  const path = usePathname();
  const { count, hydrated } = useCart();
  if (path.startsWith("/checkout") || path === "/cart" || (!whatsappHref && !telHref)) return null;
  // lift above the mobile "View cart" bar when it is showing
  const lifted = hydrated && count > 0 && (path.startsWith("/services") || path.startsWith("/areas"));
  return (
    <div className={`fixed right-3 z-40 flex flex-col gap-3 md:right-6 md:bottom-6 ${lifted ? "bottom-[140px] md:bottom-24" : "bottom-[84px]"}`}>
      {telHref && (
        <a
          href={telHref}
          className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lift ring-4 ring-white transition hover:scale-105 hover:bg-brand-700"
          aria-label="Call us"
          title="Call us"
          data-testid="floating-call"
        >
          <Phone className="h-5 w-5" />
        </a>
      )}
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lift ring-4 ring-white transition hover:scale-105"
          aria-label="Chat with us on WhatsApp"
          title="Chat on WhatsApp"
          data-testid="floating-whatsapp"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
