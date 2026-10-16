import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jakarta = localFont({
  src: "./jakarta.woff2",
  variable: "--font-sans",
  weight: "200 800",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "MyRepairUnder100 — AC & Appliance Repair in Delhi NCR", template: "%s | MyRepairUnder100" },
  description:
    "Book AC service and repair, washing machine, refrigerator and microwave repair at home in Delhi NCR. Transparent pricing, no account needed.",
  applicationName: "MyRepairUnder100",
  openGraph: { type: "website", siteName: "MyRepairUnder100", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FD5E0C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
