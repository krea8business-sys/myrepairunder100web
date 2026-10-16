/**
 * MyRepairUnder100 — database schema (PostgreSQL, Drizzle ORM).
 * All money values are whole rupees (INR) stored as integers.
 * Migrations are generated into /drizzle with `npm run db:generate`.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const adminRole = pgEnum("admin_role", ["OWNER", "MANAGER", "STAFF"]);
export const priceType = pgEnum("price_type", ["FIXED", "STARTING", "INSPECTION", "QUOTE"]);
export const bookingStatus = pgEnum("booking_status", [
  "RECEIVED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const paymentStatus = pgEnum("payment_status", [
  "NOT_RECORDED",
  "PENDING",
  "PAID_CASH",
  "PAID_UPI",
  "PAID_ONLINE",
  "PARTIALLY_PAID",
  "WAIVED",
  "REFUNDED",
]);
export const addressType = pgEnum("address_type", ["HOME", "OFFICE", "OTHER"]);
export const bookingEventType = pgEnum("booking_event_type", [
  "CREATED",
  "STATUS_CHANGE",
  "NOTE",
  "ASSIGNMENT",
  "RESCHEDULE",
  "CHARGES",
  "PAYMENT",
  "CANCEL_REQUEST",
  "NOTIFICATION",
]);

// ---------------------------------------------------------------------------
// Admin & security
// ---------------------------------------------------------------------------
export const adminUsers = pgTable("admin_users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("STAFF"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    adminId: text("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    adminName: text("admin_name"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

/** Fixed-window rate-limit buckets. Keys are HMAC-hashed — raw IPs are never stored. */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

// ---------------------------------------------------------------------------
// Business settings (single row with id = 'default')
// ---------------------------------------------------------------------------
export type FaqItem = { q: string; a: string };

export const businessSettings = pgTable("business_settings", {
  id: text("id").primaryKey().default("default"),
  businessName: text("business_name").notNull().default("MyRepairUnder100"),
  tagline: text("tagline").notNull().default("AC & home appliance repair in Delhi NCR"),
  logoUrl: text("logo_url"),
  supportPhone: text("support_phone"),
  whatsappNumber: text("whatsapp_number"),
  contactEmail: text("contact_email"),
  businessAddress: text("business_address"),
  supportHours: text("support_hours"),
  // fees & tax
  visitFee: integer("visit_fee").notNull().default(0),
  visitFeeLabel: text("visit_fee_label").notNull().default("Visit / inspection charge"),
  visitFeeWaiverAbove: integer("visit_fee_waiver_above"),
  visitFeeIsDemo: boolean("visit_fee_is_demo").notNull().default(true),
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxPercent: doublePrecision("tax_percent").notNull().default(18),
  taxLabel: text("tax_label").notNull().default("GST"),
  pricesIncludeTax: boolean("prices_include_tax").notNull().default(true),
  // scheduling
  workingDays: integer("working_days").array().notNull().default(sql`ARRAY[1,2,3,4,5,6]`),
  bookingWindowDays: integer("booking_window_days").notNull().default(7),
  minLeadMinutes: integer("min_lead_minutes").notNull().default(120),
  asapEnabled: boolean("asap_enabled").notNull().default(true),
  asapCutoff: text("asap_cutoff").notNull().default("17:00"),
  asapDailyCapacity: integer("asap_daily_capacity").notNull().default(5),
  // cancellation
  allowCancellationRequest: boolean("allow_cancellation_request").notNull().default(true),
  cancellationCutoffHours: integer("cancellation_cutoff_hours").notNull().default(2),
  // policies
  servicePolicy: text("service_policy").notNull().default(""),
  cancellationPolicy: text("cancellation_policy").notNull().default(""),
  warrantyPolicy: text("warranty_policy").notNull().default(""),
  privacyPolicy: text("privacy_policy").notNull().default(""),
  termsOfService: text("terms_of_service").notNull().default(""),
  // payments
  paymentMethods: text("payment_methods")
    .array()
    .notNull()
    .default(sql`ARRAY['Pay after service (cash / UPI to technician)']::text[]`),
  onlinePaymentEnabled: boolean("online_payment_enabled").notNull().default(false),
  // content
  faqs: jsonb("faqs").$type<FaqItem[]>().notNull().default([]),
  announcement: text("announcement"),
  showDemoBanner: boolean("show_demo_banner").notNull().default(true),
  // notification toggles — only fire when env credentials also exist
  notifyCustomerSms: boolean("notify_customer_sms").notNull().default(true),
  notifyCustomerWhatsapp: boolean("notify_customer_whatsapp").notNull().default(true),
  notifyCustomerEmail: boolean("notify_customer_email").notNull().default(true),
  notifyAdminEmail: boolean("notify_admin_email").notNull().default(true),
  notifyWebhook: boolean("notify_webhook").notNull().default(true),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  longDescription: text("long_description").notNull().default(""),
  imageUrl: text("image_url"),
  illustration: text("illustration").notNull().default("generic"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  archived: boolean("archived").notNull().default(false),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const services = pgTable(
  "services",
  {
    id: id(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    priceType: priceType("price_type").notNull().default("QUOTE"),
    price: integer("price"),
    priceIsDemo: boolean("price_is_demo").notNull().default(true),
    inclusions: text("inclusions").array().notNull().default(sql`ARRAY[]::text[]`),
    exclusions: text("exclusions").array().notNull().default(sql`ARRAY[]::text[]`),
    partsExtra: boolean("parts_extra").notNull().default(true),
    requiresDiagnosis: boolean("requires_diagnosis").notNull().default(false),
    durationMinutes: integer("duration_minutes"),
    warrantyDays: integer("warranty_days"),
    warrantyNote: text("warranty_note"),
    allowQuantity: boolean("allow_quantity").notNull().default(true),
    maxQuantity: integer("max_quantity").notNull().default(5),
    popular: boolean("popular").notNull().default(false),
    active: boolean("active").notNull().default(true),
    archived: boolean("archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("service_cat_slug_uq").on(t.categoryId, t.slug), index("service_active_idx").on(t.active, t.archived)],
);

// ---------------------------------------------------------------------------
// Service areas & scheduling
// ---------------------------------------------------------------------------
export const serviceAreas = pgTable(
  "service_areas",
  {
    id: id(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    locality: text("locality").notNull(),
    slug: text("slug").notNull(),
    pincode: text("pincode").notNull(),
    active: boolean("active").notNull().default(true),
    publishPage: boolean("publish_page").notNull().default(false),
    pageIntro: text("page_intro"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("area_pin_loc_uq").on(t.pincode, t.locality),
    index("area_pincode_idx").on(t.pincode),
    index("area_slug_idx").on(t.slug),
  ],
);

/** Which categories an area supports. No rows for an area = all categories supported. */
export const areaCategories = pgTable(
  "area_categories",
  {
    areaId: text("area_id")
      .notNull()
      .references(() => serviceAreas.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.areaId, t.categoryId] })],
);

export const timeSlots = pgTable("time_slots", {
  id: id(),
  label: text("label").notNull(),
  startTime: text("start_time").notNull(), // HH:mm IST
  endTime: text("end_time").notNull(),
  capacity: integer("capacity").notNull().default(3),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Holidays / unavailable periods. slotId null = whole day blocked. */
export const blockedPeriods = pgTable(
  "blocked_periods",
  {
    id: id(),
    date: text("date").notNull(), // YYYY-MM-DD IST
    slotId: text("slot_id").references(() => timeSlots.id, { onDelete: "cascade" }),
    reason: text("reason").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("blocked_date_idx").on(t.date)],
);

// ---------------------------------------------------------------------------
// Technicians
// ---------------------------------------------------------------------------
export const technicians = pgTable("technicians", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  pincodes: text("pincodes").array().notNull().default(sql`ARRAY[]::text[]`),
  localities: text("localities").array().notNull().default(sql`ARRAY[]::text[]`),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const technicianSkills = pgTable(
  "technician_skills",
  {
    technicianId: text("technician_id")
      .notNull()
      .references(() => technicians.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.technicianId, t.categoryId] })],
);

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    code: text("code").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: bookingStatus("status").notNull().default("RECEIVED"),
    customerName: text("customer_name").notNull(),
    customerMobile: text("customer_mobile").notNull(),
    customerEmail: text("customer_email"),
    houseNo: text("house_no").notNull(),
    street: text("street").notNull(),
    landmark: text("landmark"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    addressType: addressType("address_type").notNull().default("HOME"),
    instructions: text("instructions"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    areaLocality: text("area_locality"),
    scheduledDate: text("scheduled_date").notNull(),
    slotId: text("slot_id").references(() => timeSlots.id, { onDelete: "set null" }),
    slotLabel: text("slot_label").notNull(),
    isAsap: boolean("is_asap").notNull().default(false),
    subtotal: integer("subtotal").notNull(),
    visitFee: integer("visit_fee").notNull(),
    taxAmount: integer("tax_amount").notNull(),
    estimatedTotal: integer("estimated_total").notNull(),
    hasUnpricedItems: boolean("has_unpriced_items").notNull().default(false),
    serviceCharges: integer("service_charges"),
    partsCharges: integer("parts_charges"),
    extraCharges: integer("extra_charges"),
    finalAmount: integer("final_amount"),
    paymentStatus: paymentStatus("payment_status").notNull().default("NOT_RECORDED"),
    paymentMethod: text("payment_method"),
    paymentReference: text("payment_reference"),
    customerNote: text("customer_note"),
    cancelRequested: boolean("cancel_requested").notNull().default(false),
    cancelReason: text("cancel_reason"),
    cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),
    technicianId: text("technician_id").references(() => technicians.id, { onDelete: "set null" }),
    source: text("source").notNull().default("web"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("booking_status_idx").on(t.status),
    index("booking_slot_idx").on(t.scheduledDate, t.slotId),
    index("booking_mobile_idx").on(t.customerMobile),
    index("booking_pincode_idx").on(t.pincode),
    index("booking_created_idx").on(t.createdAt),
  ],
);

export const bookingItems = pgTable("booking_items", {
  id: id(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  serviceId: text("service_id").references(() => services.id, { onDelete: "set null" }),
  categoryId: text("category_id").notNull(),
  categoryName: text("category_name").notNull(),
  serviceName: text("service_name").notNull(),
  priceType: priceType("price_type").notNull(),
  unitPrice: integer("unit_price"),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
  partsExtra: boolean("parts_extra").notNull(),
});

export const bookingEvents = pgTable(
  "booking_events",
  {
    id: id(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    type: bookingEventType("type").notNull(),
    fromStatus: bookingStatus("from_status"),
    toStatus: bookingStatus("to_status"),
    message: text("message"),
    internal: boolean("internal").notNull().default(true),
    actor: text("actor").notNull(),
    actorId: text("actor_id"),
    createdAt: createdAt(),
  },
  (t) => [index("booking_event_idx").on(t.bookingId, t.createdAt)],
);

export const technicianAssignments = pgTable(
  "technician_assignments",
  {
    id: id(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    technicianId: text("technician_id")
      .notNull()
      .references(() => technicians.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
    assignedBy: text("assigned_by"),
  },
  (t) => [index("assign_tech_idx").on(t.technicianId), index("assign_booking_idx").on(t.bookingId)],
);

export const notificationLogs = pgTable("notification_logs", {
  id: id(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  channel: text("channel").notNull(),
  event: text("event").notNull(),
  status: text("status").notNull(), // sent | skipped | failed
  detail: text("detail"),
  createdAt: createdAt(),
});

/** Small catalogue images (≤2 MB) stored in Postgres. Swap for object storage at scale. */
export const uploadedImages = pgTable("uploaded_images", {
  id: id(),
  mimeType: text("mime_type").notNull(),
  bytes: bytea("bytes").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const categoriesRelations = relations(categories, ({ many }) => ({
  services: many(services),
  areaLinks: many(areaCategories),
  techLinks: many(technicianSkills),
}));
export const servicesRelations = relations(services, ({ one }) => ({
  category: one(categories, { fields: [services.categoryId], references: [categories.id] }),
}));
export const serviceAreasRelations = relations(serviceAreas, ({ many }) => ({
  categoryLinks: many(areaCategories),
}));
export const areaCategoriesRelations = relations(areaCategories, ({ one }) => ({
  area: one(serviceAreas, { fields: [areaCategories.areaId], references: [serviceAreas.id] }),
  category: one(categories, { fields: [areaCategories.categoryId], references: [categories.id] }),
}));
export const techniciansRelations = relations(technicians, ({ many }) => ({
  skillLinks: many(technicianSkills),
  bookings: many(bookings),
  assignments: many(technicianAssignments),
}));
export const technicianSkillsRelations = relations(technicianSkills, ({ one }) => ({
  technician: one(technicians, { fields: [technicianSkills.technicianId], references: [technicians.id] }),
  category: one(categories, { fields: [technicianSkills.categoryId], references: [categories.id] }),
}));
export const timeSlotsRelations = relations(timeSlots, ({ many }) => ({
  bookings: many(bookings),
  blocks: many(blockedPeriods),
}));
export const blockedPeriodsRelations = relations(blockedPeriods, ({ one }) => ({
  slot: one(timeSlots, { fields: [blockedPeriods.slotId], references: [timeSlots.id] }),
}));
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  items: many(bookingItems),
  events: many(bookingEvents),
  assignments: many(technicianAssignments),
  notifications: many(notificationLogs),
  technician: one(technicians, { fields: [bookings.technicianId], references: [technicians.id] }),
  slot: one(timeSlots, { fields: [bookings.slotId], references: [timeSlots.id] }),
}));
export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, { fields: [bookingItems.bookingId], references: [bookings.id] }),
  service: one(services, { fields: [bookingItems.serviceId], references: [services.id] }),
}));
export const bookingEventsRelations = relations(bookingEvents, ({ one }) => ({
  booking: one(bookings, { fields: [bookingEvents.bookingId], references: [bookings.id] }),
}));
export const technicianAssignmentsRelations = relations(technicianAssignments, ({ one }) => ({
  booking: one(bookings, { fields: [technicianAssignments.bookingId], references: [bookings.id] }),
  technician: one(technicians, { fields: [technicianAssignments.technicianId], references: [technicians.id] }),
}));
export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  booking: one(bookings, { fields: [notificationLogs.bookingId], references: [bookings.id] }),
}));
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(adminUsers, { fields: [auditLogs.adminId], references: [adminUsers.id] }),
}));

export type Category = typeof categories.$inferSelect;
export type Service = typeof services.$inferSelect;
export type ServiceArea = typeof serviceAreas.$inferSelect;
export type TimeSlot = typeof timeSlots.$inferSelect;
export type BlockedPeriod = typeof blockedPeriods.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingItem = typeof bookingItems.$inferSelect;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type Technician = typeof technicians.$inferSelect;
export type Settings = typeof businessSettings.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type PriceType = (typeof priceType.enumValues)[number];
export type AdminRole = (typeof adminRole.enumValues)[number];
