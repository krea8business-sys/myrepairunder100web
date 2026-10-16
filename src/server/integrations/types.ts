export type SendResult = { status: "sent" | "skipped" | "failed"; detail?: string };

export type BookingNotice = {
  event: "booking.created" | "booking.status_changed" | "booking.cancel_requested";
  code: string;
  status: string;
  statusLabel: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string | null;
  scheduledDate: string;
  slotLabel: string;
  services: { name: string; quantity: number }[];
  estimatedTotal: number;
  pincode: string;
  city: string;
  trackUrl: string;
};
