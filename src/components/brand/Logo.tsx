import Image from "next/image";
import Link from "next/link";
import mark from "../../../public/brand/logo-mark.png";

/**
 * Brand logo: the orange running-technician mark + "MyRepairUnder100" wordmark.
 * If an admin uploads a different logo in Settings (logoUrl), that image is used instead.
 */
export function Logo({ logoUrl, name = "MyRepairUnder100", className = "", invert = false }: { logoUrl?: string | null; name?: string; className?: string; invert?: boolean }) {
  const isDefaultName = name === "MyRepairUnder100";
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center gap-2 rounded-lg ${className}`} aria-label={`${name} — home`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-10 w-auto max-w-[64px] object-contain" />
      ) : (
        <Image src={mark} alt="" priority className="h-10 w-auto" sizes="52px" />
      )}
      <span className={`text-[15px] font-extrabold leading-none tracking-tight min-[400px]:text-[18px] ${invert ? "text-white" : "text-navy-900"}`}>
        {isDefaultName ? (
          <>
            MyRepair<span className={invert ? "text-brand-400" : "text-brand-600"}>Under100</span>
          </>
        ) : (
          name
        )}
      </span>
    </Link>
  );
}
