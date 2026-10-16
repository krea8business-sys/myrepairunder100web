import { adminRoute } from "@/server/admin-api";
import { listBookings, parseFilters } from "@/server/admin-queries";
import { audit } from "@/server/audit";
import { STATUS_META } from "@/lib/status";

/** Neutralise spreadsheet formula injection and quote CSV fields. */
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const GET = adminRoute("MANAGER", async (req, admin) => {
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const { rows } = await listBookings(parseFilters(sp), { all: true });
  const header = ["Booking ID", "Created (IST)", "Status", "Cancel requested", "Customer", "Mobile", "Email", "Address", "Pincode", "City", "Date", "Slot", "Services", "Estimated total", "Final amount", "Payment status", "Technician"];
  const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const lines = rows.map(({ b, tech, services }) =>
    [
      b.code, fmt.format(b.createdAt), STATUS_META[b.status].label, b.cancelRequested ? "Yes" : "", b.customerName, b.customerMobile, b.customerEmail,
      [b.houseNo, b.street, b.landmark].filter(Boolean).join(", "), b.pincode, b.city, b.scheduledDate, b.slotLabel, services, b.estimatedTotal, b.finalAmount, b.paymentStatus, tech,
    ].map(cell).join(","),
  );
  await audit(admin, "booking.export", "booking", null, { count: rows.length });
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
