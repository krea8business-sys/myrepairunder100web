import type { Metadata } from "next";
import { TrackForm } from "@/components/booking/TrackForm";

export const metadata: Metadata = {
  title: "Track your booking",
  description: "Check the status of your MyRepairUnder100 booking with your booking ID and mobile number.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <div className="container-page max-w-xl py-12">
      <h1 className="text-3xl font-extrabold">Track your booking</h1>
      <p className="mt-2 text-ink-muted">Enter your booking ID and the mobile number you used when booking.</p>
      <div className="card mt-6 p-6">
        <TrackForm initialCode={typeof code === "string" ? code.slice(0, 12).toUpperCase() : ""} />
      </div>
    </div>
  );
}
