import type { Settings } from "@/db/schema";

function JsonLd({ data }: { data: object }) {
  // JSON.stringify + escaping "<" prevents script injection from admin-entered text.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** LocalBusiness structured data using ONLY configured details (no invented ratings/addresses). */
export function LocalBusinessJsonLd({ settings, cities }: { settings: Settings; cities: string[] }) {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return null;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: settings.businessName,
    url,
    description: settings.tagline,
    areaServed: cities.map((c) => ({ "@type": "City", name: c })),
  };
  if (settings.supportPhone) data.telephone = settings.supportPhone;
  if (settings.contactEmail) data.email = settings.contactEmail;
  if (settings.logoUrl) data.logo = settings.logoUrl.startsWith("http") ? settings.logoUrl : `${url}${settings.logoUrl}`;
  if (settings.businessAddress) data.address = { "@type": "PostalAddress", streetAddress: settings.businessAddress, addressCountry: "IN" };
  return <JsonLd data={data} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${url}${it.path}` })),
      }}
    />
  );
}

export function ServiceJsonLd({ name, description, path, price, settings }: { name: string; description: string; path: string; price: number | null; settings: Settings }) {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return null;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: `${url}${path}`,
    provider: { "@type": "HomeAndConstructionBusiness", name: settings.businessName, url },
    areaServed: "Delhi NCR",
  };
  if (price != null) data.offers = { "@type": "Offer", priceCurrency: "INR", price };
  return <JsonLd data={data} />;
}
