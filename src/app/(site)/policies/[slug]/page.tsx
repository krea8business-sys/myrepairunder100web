import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/server/settings";

const POLICIES = {
  service: { title: "Service policy", field: "servicePolicy" },
  cancellation: { title: "Cancellation policy", field: "cancellationPolicy" },
  warranty: { title: "Warranty policy", field: "warrantyPolicy" },
  privacy: { title: "Privacy policy", field: "privacyPolicy" },
  terms: { title: "Terms of service", field: "termsOfService" },
} as const;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = POLICIES[slug as keyof typeof POLICIES];
  return p ? { title: p.title, alternates: { canonical: `/policies/${slug}` } } : { title: "Not found" };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const p = POLICIES[slug as keyof typeof POLICIES];
  if (!p) notFound();
  const s = await getSettings();
  const text = (s[p.field] as string) || "This policy hasn't been published yet.";
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold">{p.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{s.businessName} · Last updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(s.updatedAt)}</p>
      <div className="prose-policy mt-8">{text.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
      {slug === "cancellation" && <p className="mt-4 rounded-xl bg-navy-50 p-4 text-sm">Online cancellation requests are accepted up to <strong>{s.cancellationCutoffHours} hours</strong> before the requested slot.</p>}
    </div>
  );
}
