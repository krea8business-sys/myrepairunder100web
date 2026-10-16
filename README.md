# MyRepairUnder100 — appliance repair booking website

Guest booking website and admin dashboard for **MyRepairUnder100**, an AC and home appliance repair business in Delhi NCR.

Customers browse services, add them to a cart, enter their details and address, pick a time slot and confirm. They never need an account, an OTP or a payment. Every booking gets an ID like `MRU-7K3QD9XA`, and customers track it with that ID plus their mobile number. Staff manage bookings, prices, service areas, schedules and technicians from a protected admin panel at `/admin`.

> **Status:** working, tested build with **demo data**. The prices are placeholders and show a **“Demo price”** label. Read **Before going live** below.

**Branding & contact (built in):** orange-and-charcoal theme taken from the company logo (`public/brand/logo-mark.png`, also used for the favicon). Calls go to **+91 78272 01114** and WhatsApp to **+91 92110 10110**. They appear in the header, homepage, a floating call/WhatsApp button on every page, the footer, the support page and booking pages, and can be changed in Admin → Settings. The customer's location is detected automatically on the checkout address step (after the browser asks permission) and from “Use my current location” in the pincode checker.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) · React 19 · TypeScript (strict) |
| Styling | Tailwind CSS 3 · self-hosted Plus Jakarta Sans · lucide icons |
| Database | PostgreSQL 14+ via **Drizzle ORM** (typed schema and SQL migrations) |
| Validation | Zod. The same schemas run on the client and the server |
| Auth (admin) | bcrypt password hashes · signed HttpOnly JWT cookie (`jose`) · role checks against the DB on every request |
| Tests | Vitest (unit and DB integration) · Playwright end-to-end scripts |

**Why Drizzle and not Prisma:** the build environment blocks Prisma's engine-binary download host, so Prisma couldn't be run or tested here. Drizzle is a typed TypeScript ORM with real SQL migrations, needs no native engine and runs on any Node host. The schema is in `src/db/schema.ts`.

---

## Quick start (local)

Requirements: **Node 20.9+** and **PostgreSQL 14+**.

```bash
npm ci
cp .env.example .env            # then edit DATABASE_URL, SESSION_SECRET, HASH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:migrate              # apply SQL migrations in /drizzle
npm run db:seed                 # starter catalogue, sample areas, slots, FAQs, policies, first OWNER admin
npm run dev                     # http://localhost:3000   ·   admin: http://localhost:3000/admin
```

Generate secrets with `openssl rand -hex 32`. `ADMIN_PASSWORD` must be 12 characters or more.

### Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build or serve production (`start` honours `$PORT`) |
| `npm run db:generate` | Create a new SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations (safe to run on every deploy) |
| `npm run db:seed` | Insert any missing starter data. Never overwrites your edits |
| `npm run db:seed -- --reset` | **Dev only.** Wipes bookings, catalogue, areas and settings, then reseeds |
| `ADMIN_NEW_PASSWORD=… npm run admin:create -- you@x.com "Name" OWNER` | Create an admin or reset a password |
| `npm test` | Unit tests. Integration tests also run when `TEST_DATABASE_URL` is set |
| `npm run typecheck` | `tsc --noEmit` |
| `node tests/e2e/customer-journey.mjs` | End-to-end guest journey against a running server (`BASE_URL`) |
| `node tests/e2e/admin-flow.mjs` | End-to-end admin journey (needs `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BOOKING_CODE`) |

---

## Project structure

```
src/
  app/
    (site)/                  Customer website (shared header/footer/mobile nav)
      page.tsx               Homepage
      services/…             All services · category pages · service detail pages
      cart/  checkout/       Cart and 4-step guest checkout
      booking/[code]/        Confirmation + status page (cookie-gated)
      track/                 Booking lookup (ID + mobile)
      areas/…  policies/…  support/
    admin/
      login/                 Admin sign-in
      (panel)/…              Protected dashboard: overview, bookings, catalogue, areas,
                             scheduling, technicians, settings, admin users, audit log
    api/                     Public API (quote, slots, serviceability, bookings, track, cancel, geocode, images)
    api/admin/…              Admin API (every route role-checked)
    sitemap.ts  robots.ts  icon.svg
  components/                UI kit, layout, cart, checkout, booking, catalogue, admin
  db/                        schema.ts (Drizzle), seed-data.ts (editable starter data)
  lib/                       Pure shared logic: pricing, slots, status workflow, validation, time (IST), i18n
  server/                    Server-only: DB queries, booking service, auth, rate limit, audit, integrations/
  middleware.ts              Admin gate + CSRF origin check
drizzle/                     SQL migrations
scripts/                     migrate, seed, create-admin
tests/                       unit/, integration/, e2e/
docs/                        DEPLOYMENT.md, google-sheets-webhook.gs
```

---

## Implemented features

### Customer website (no login anywhere)

- **Homepage.** Hero with the requested headline, the four category cards, popular services, “How it works”, a trust section with no invented stats or ratings, service areas from the database, FAQs from admin settings, and a footer with policies and booking lookup.
- **Header:**
  - Logo you can replace (upload in Settings).
  - **Pincode checker** that checks against your configured areas.
  - Support/WhatsApp button. It uses `wa.me` when a number is configured and otherwise links to `/support`.
  - Track link.
  - Cart icon with a live count.
  - EN/हिं toggle.
- **Sticky mobile bottom nav:** Home · Services · Cart · Track Booking.
- **Category pages:**
  - Banner, description and pricing note.
  - Service cards with add/quantity controls.
  - Links to other categories.
  - Sticky “View cart” bar.
- **Service detail pages:**
  - Description, included and not-included lists.
  - Price type (fixed, starting, inspection, or to be confirmed).
  - Visit fee, spare-parts note, duration, warranty and availability.
  - Quantity selector, related services.
  - An explanation whenever the final price depends on diagnosis.
- **Cart:**
  - Mix services from several categories. Change quantities (clamped to each service's limit) or remove items.
  - Survives page refreshes and stays in sync across tabs.
  - The **price summary comes from the server** (`/api/cart/quote`). Services the admin has disabled are removed automatically, with a notice.
  - Optional technician note.
  - Empty and loading states.
- **Guest checkout in 4 steps:**
  - **Details:** Indian mobile validation that accepts `+91` and `0` prefixes, plus an optional email.
  - **Address:** live **serviceability check**, Home/Office/Other, instructions, and an optional “Use my current location” button. That button attaches coordinates. It autofills the address only if Google Maps is configured, and the page says so honestly.
  - **Date & time:** dates and slots come from the admin schedule. Past, full, blocked and closed slots are hidden or disabled. ASAP is offered when enabled. Times are in IST, and the slot is labelled as a *request*.
  - **Review:** edit any step, see the price breakdown and disclaimers.
- **Submitting a booking:**
  - Double-click safe (idempotency key plus a locked button).
  - Form data is kept in `sessionStorage`, so a refresh or a failed request loses nothing.
  - Useful errors: the step with the problem reopens on a field error, and the date step reopens when a slot fills.
  - The cart is cleared **only after** the server confirms the booking.
- **Confirmation and status page:**
  - Booking ID with a Copy button, services, address, requested slot, estimated charges and next steps.
  - WhatsApp/call support buttons when configured.
  - Progress tracker and a customer-visible timeline.
  - Online **cancellation request** within the configured cutoff.
- **Tracking:**
  - Booking ID **and** mobile must match.
  - Rate-limited by IP and by booking ID, and the error message is the same for a wrong ID or a wrong mobile.
  - Success sets an HttpOnly cookie, so the page survives refreshes.
  - Internal notes, technician phone numbers and other customers' data are never exposed.
- **SEO:**
  - Unique titles and descriptions, canonical URLs and Open Graph tags.
  - `sitemap.xml` from the live catalogue, and `robots.txt` that disallows `/admin`, `/api`, cart, checkout and booking pages.
  - Breadcrumb, Service and LocalBusiness JSON-LD that only uses details you have configured. Demo prices are never published.
  - Semantic headings and descriptive alt text.
  - **Local area pages** (e.g. `/areas/burari`) appear only when an admin publishes an area *and* writes local text for it, so there are no doorway pages.
- **Accessibility:**
  - Skip link, visible focus rings, labelled controls and `aria-live` updates.
  - Keyboard-friendly dialogs and reduced-motion support.
  - Large tap targets and mobile keyboards matched to each field (numeric, tel, email).
  - Tested at 360, 390, 768 and 1280 px wide with no horizontal overflow.

### Admin dashboard (`/admin`)

- **Auth:**
  - bcrypt, plus rate limits on both IP and email for sign-in.
  - HttpOnly `SameSite=Strict` session cookie that lasts 12 hours.
  - Middleware gate, and **every** admin API re-checks the admin in the DB, including the active flag and role.
- **Roles:**
  - **OWNER:** everything.
  - **MANAGER:** catalogue, areas, scheduling, technicians, CSV export and the audit log.
  - **STAFF:** bookings only.
- **Overview:** counts by status, new bookings in the last 24 hours, cancellation requests, a setup checklist and recent bookings.
- **Bookings:**
  - Search by ID, name, mobile or locality. Filter by status, service category, pincode, date range and cancellation requests. Pagination.
  - **CSV export** with protection against spreadsheet formula injection.
- **Booking detail:**
  - Confirm or reject, and move through the status workflow (invalid transitions are refused by the server).
  - Assign a technician, with skill and pincode match hints.
  - Reschedule, with capacity checks and an optional override.
  - Record final service, parts and extra charges.
  - Record payment status by hand. It is clearly labelled as a record, not a payment.
  - Internal notes, and approve or decline cancellation requests.
  - Full activity and audit trail, assignment history and a notification log.
- **Services & prices:**
  - Add, edit, delete or archive categories and services. Items used in past bookings are archived, not deleted.
  - Image upload (JPEG, PNG or WebP up to 2 MB, file type checked from the bytes).
  - Descriptions, inclusions and exclusions, price type, price, “demo price” flag, parts note, diagnosis flag, duration, warranty, quantity limits, Popular and Active toggles, sort order and SEO fields.
- **Service areas:** city, state, locality and pincode; active toggle; which categories each area offers; optional local landing page.
- **Scheduling:**
  - Working days, booking window, minimum lead time, ASAP settings and daily ASAP cap.
  - Slots with **capacity**, plus holidays and blocked slots.
  - Overbooking is prevented on the server with a per-date Postgres advisory lock, tested with 6 simultaneous requests for 2 seats.
- **Technicians:** directory with contact, skills, pincodes, localities, active flag, internal notes, open jobs, assigned bookings and assignment history.
- **Settings (owner only):**
  - Business name, logo, tagline, support phone, WhatsApp, email, hours and address.
  - Visit fee with an optional waiver threshold, and tax (inclusive or exclusive).
  - Cancellation policy and cutoff, payment-method text, and all five policies.
  - FAQs, announcement banner and preview banner.
  - Notification toggles, and a read-only integration status list.
- **Admin users:** add admins, change roles, reset passwords and deactivate accounts. You can't remove the last active owner.
- **Audit log:** every important admin action, with who did it and the details.

### Security and reliability

- All prices are **recalculated on the server** from the catalogue. Totals sent by the browser are ignored.
- Zod validation on the client and the server. A honeypot field stops simple bots, and request bodies have size limits.
- Postgres-backed **rate limits** for booking (per IP and per mobile), tracking, sign-in, serviceability and cancellation. Rate-limit keys are HMAC-hashed, so raw IPs and mobile numbers are never stored.
- CSRF protection: an origin check on every state-changing API call, plus `SameSite` cookies.
- Security headers: CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, and HSTS in production. Admin pages are `noindex` and `no-store`.
- Error boundaries on the client. API errors are generic, with no stack traces or database messages. Logs mask mobile numbers.
- Uploaded images are served with a sandboxing CSP. SVG uploads are refused.
- Transactions are used for booking creation, status changes, area links and technician skills.

---

## Integrations — need credentials before they work

None of these are live. Each one is a clean module in `src/server/integrations/` that turns on only when its environment variables are set. Until then the site works without it, and the notification log records **“Not sent — no channel configured”**. Nothing ever claims a message was sent or a payment was made.

| Integration | Env vars | Notes |
|---|---|---|
| WhatsApp **support button** | Settings → WhatsApp number | No API key needed (`wa.me` link) |
| WhatsApp **notifications** | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME` | Meta Cloud API. Needs an approved template with 3 variables |
| SMS | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | Needs a DLT-registered template (Indian rules) |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Customer updates (if they gave an email) and new-booking alerts to the admin |
| Google Sheets / Zapier / Make | `BOOKING_WEBHOOK_URL`, `BOOKING_WEBHOOK_SECRET` | Signed JSON for every booking event. A ready Apps Script is in `docs/google-sheets-webhook.gs` |
| Auto-fetch location | none needed · optional `GOOGLE_MAPS_API_KEY`, `NOMINATIM_EMAIL` | **On by default** using free OpenStreetMap Nominatim (throttled to 1 req/s and cached, per its usage policy). A Google key improves street-level accuracy. `GEOCODER=none` turns it off |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | **Not implemented.** Only an interface stub exists; see below |
| Google Analytics 4 | `NEXT_PUBLIC_GA_ID` | Page views plus a `booking_confirmed` conversion event with no personal data |

---

## Before going live (checklist)

1. **Prices:** in Admin → Services & prices, set your real prices and untick **“Demo price”** on every service.
2. **Settings:**
   - Check the phone (+91 78272 01114) and WhatsApp (+91 92110 10110) numbers, and add a contact email and support hours.
   - Confirm the visit fee (it starts at ₹0) and untick “Mark fee as demo”.
   - Turn off the **preview banner**.
3. **Policies:** replace the placeholder warranty and terms text, and have the terms and privacy policy reviewed by a legal professional.
4. **Service areas:** the seeded North Delhi pincodes around Burari are **samples**. Check them and add or remove pincodes to match where you actually serve.
5. **Technicians:** replace the two “Demo Technician” records with real people.
6. **Schedule:** set your working days, slot times and how many jobs each slot can take.
7. **Secrets:** set `NEXT_PUBLIC_SITE_URL` to your real domain and use strong `SESSION_SECRET` and `HASH_SECRET` values. After the first admin is created, remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment.

---

## Known limitations

- **No online payments.** The flow is “pay after service”. Admins *record* payment status by hand. Razorpay needs order creation, a checkout widget and server-side signature verification before any booking is marked as paid online.
- **No OTP verification.** As requested, OTP is not required. A configurable OTP step can be added later; it needs an SMS provider.
- **Notifications are not sent** until provider credentials and approved templates are configured.
- **No live technician GPS or automatic dispatch.** Technician management is an admin directory, the foundation for a future technician app.
- **Rescheduling by customers** is done through support. Customers can request cancellation online; staff reschedule from the admin panel.
- **Image storage:** uploads are stored in Postgres, which is fine for a small catalogue. For many or large images, swap `api/admin/upload` and `api/images` for object storage (S3, Cloudflare R2 or Supabase Storage).
- **Hindi:** the i18n layer is in place (`src/lib/i18n.ts`). Navigation, the hero and homepage section headings are translated; other text still shows in English. Add keys to the `hi` dictionary to translate more.
- **Rate limits** use the client IP from `x-forwarded-for`. Make sure your host or proxy sets it correctly. Render, Vercel and Fly all do.
- Customer status updates appear when the page is refreshed (there is a “Refresh status” button). There are no live push updates.
- In about 75 automated page loads of the production build, React logged one recoverable hydration warning (#418) on `/services`. It could not be reproduced in development or in 60 further loads, and the page rendered correctly. Keep an eye on it in your error monitoring.
- No ESLint config is bundled. Type safety is enforced with `tsc --strict`.

See **docs/DEPLOYMENT.md** for the production deployment guide.
