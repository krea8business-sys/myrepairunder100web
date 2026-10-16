import { Clock, Stethoscope } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCart";
import { Price } from "@/components/ui/Price";
import type { Category, Service } from "@/db/schema";
import { formatDuration } from "@/lib/format";
import { toCartable } from "./cartable";
import { Media } from "./Media";

export function ServiceCard({ service, category, showCategory }: { service: Service; category: Category; showCategory?: boolean }) {
  const href = `/services/${category.slug}/${service.slug}`;
  const duration = formatDuration(service.durationMinutes);
  return (
    <article className="card flex gap-4 p-4 transition hover:border-navy-200 sm:p-5" data-testid="service-card">
      <div className="min-w-0 flex-1">
        {showCategory && <p className="mb-1 text-xs font-semibold text-brand-700">{category.shortName}</p>}
        <h3 className="text-[16px] font-bold leading-snug">
          <Link href={href} className="hover:text-brand-700 focus-visible:text-brand-700">
            {service.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{service.shortDescription}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> ~{duration}
            </span>
          )}
          {service.requiresDiagnosis && (
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="h-3.5 w-3.5" /> Final price after inspection
            </span>
          )}
        </div>
        <div className="mt-3">
          <Price priceType={service.priceType} price={service.price} priceIsDemo={service.priceIsDemo} size="sm" />
        </div>
        <Link href={href} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
          View details
        </Link>
      </div>
      <div className="flex w-24 shrink-0 flex-col items-center gap-3 sm:w-28">
        <Link href={href} tabIndex={-1} aria-hidden className="block w-full">
          <Media imageUrl={service.imageUrl} illustration={category.illustration} alt="" className="aspect-square w-full rounded-xl" sizes="112px" />
        </Link>
        <AddToCartButton service={toCartable(service, category)} compact />
      </div>
    </article>
  );
}
