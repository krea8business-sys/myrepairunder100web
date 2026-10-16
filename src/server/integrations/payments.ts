/**
 * Payment gateway interface (Razorpay). NOT active: the booking flow is "pay after service".
 * When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are provided, implement order creation and
 * server-side signature verification here before ever marking a booking PAID_ONLINE.
 */
export function paymentsConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
export const PAYMENT_INTEGRATION_STATUS = "Online payments are not integrated. Bookings are pay-after-service.";
