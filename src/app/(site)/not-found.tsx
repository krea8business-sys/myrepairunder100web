import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-page max-w-xl py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-extrabold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-ink-muted">The service may have been renamed or is no longer offered.</p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/services">Browse services</ButtonLink>
        <ButtonLink href="/" variant="outline">Home</ButtonLink>
      </div>
    </div>
  );
}
