import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedAreas } from "@/server/areas";

export const metadata: Metadata = {
  title: "Service areas — Delhi NCR",
  description: "Localities and pincodes in Delhi NCR where you can book AC, washing machine, fridge and microwave repair online.",
  alternates: { canonical: "/areas" },
};

export default async function AreasPage() {
  const areas = await getPublishedAreas();
  const byCity = new Map<string, typeof areas>();
  for (const a of areas) byCity.set(a.city, [...(byCity.get(a.city) ?? []), a]);
  return (
    <div className="container-page max-w-4xl py-12">
      <h1 className="text-3xl font-extrabold">Where we serve</h1>
      <p className="mt-2 text-ink-muted">We take bookings online for the pincodes below. If yours isn&apos;t listed, we may not be able to reach you yet — contact support to check.</p>
      {[...byCity.entries()].map(([city, list]) => (
        <section key={city} className="mt-8">
          <h2 className="text-xl font-bold">{city}</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-50 text-xs uppercase tracking-wider text-ink-soft"><tr><th className="px-4 py-3">Locality</th><th className="px-4 py-3">Pincode</th><th className="px-4 py-3">State</th></tr></thead>
              <tbody className="divide-y divide-line">
                {list.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-semibold">
                      {a.publishPage ? <Link href={`/areas/${a.slug}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><MapPin className="h-3.5 w-3.5" />{a.locality}</Link> : a.locality}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{a.pincode}</td>
                    <td className="px-4 py-3 text-ink-muted">{a.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {areas.length === 0 && <p className="mt-8 text-ink-muted">Service areas haven&apos;t been published yet.</p>}
    </div>
  );
}
