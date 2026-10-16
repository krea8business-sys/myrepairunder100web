/** Booking status workflow — single source of truth for labels and allowed transitions. */

export const BOOKING_STATUSES = [
  "RECEIVED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type Status = (typeof BOOKING_STATUSES)[number];

export const STATUS_META: Record<Status, { label: string; customer: string; tone: "blue" | "amber" | "green" | "red" | "slate" | "indigo" }> = {
  RECEIVED: { label: "Booking Received", customer: "We've received your request. Our team will review it shortly.", tone: "blue" },
  PENDING_CONFIRMATION: {
    label: "Pending Confirmation",
    customer: "We're checking technician availability and will confirm your slot soon.",
    tone: "amber",
  },
  CONFIRMED: { label: "Confirmed", customer: "Your appointment is confirmed.", tone: "indigo" },
  TECHNICIAN_ASSIGNED: { label: "Technician Assigned", customer: "A technician has been assigned to your booking.", tone: "indigo" },
  EN_ROUTE: { label: "Technician En Route", customer: "Your technician is on the way.", tone: "indigo" },
  IN_PROGRESS: { label: "Service In Progress", customer: "Your service is in progress.", tone: "indigo" },
  COMPLETED: { label: "Completed", customer: "Service completed. Thank you for choosing us!", tone: "green" },
  CANCELLED: { label: "Cancelled", customer: "This booking has been cancelled.", tone: "red" },
};

/** Allowed transitions. Admins can always cancel a non-final booking. */
const TRANSITIONS: Record<Status, Status[]> = {
  RECEIVED: ["PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED"],
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["TECHNICIAN_ASSIGNED", "PENDING_CONFIRMATION", "CANCELLED"],
  TECHNICIAN_ASSIGNED: ["EN_ROUTE", "CONFIRMED", "IN_PROGRESS", "CANCELLED"],
  EN_ROUTE: ["IN_PROGRESS", "TECHNICIAN_ASSIGNED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedTransitions(from: Status): Status[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: Status, to: Status): boolean {
  return allowedTransitions(from).includes(to);
}

export function isFinal(s: Status): boolean {
  return s === "COMPLETED" || s === "CANCELLED";
}

/** Statuses that occupy slot capacity. */
export const CAPACITY_STATUSES: Status[] = BOOKING_STATUSES.filter((s) => s !== "CANCELLED");

/** Customer-facing progress steps (cancelled shown separately). */
export const PROGRESS_STEPS: Status[] = [
  "RECEIVED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "COMPLETED",
];

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  NOT_RECORDED: "Not recorded",
  PENDING: "Payment pending",
  PAID_CASH: "Paid — cash",
  PAID_UPI: "Paid — UPI",
  PAID_ONLINE: "Paid — online",
  PARTIALLY_PAID: "Partially paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
};
