"use client";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page max-w-xl py-20 text-center">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">Please try again. If you were booking, your cart and details are saved in this browser.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">Home</ButtonLink>
      </div>
    </div>
  );
}
