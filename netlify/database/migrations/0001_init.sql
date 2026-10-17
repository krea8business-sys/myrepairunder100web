CREATE TYPE "public"."address_type" AS ENUM('HOME', 'OFFICE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('OWNER', 'MANAGER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."booking_event_type" AS ENUM('CREATED', 'STATUS_CHANGE', 'NOTE', 'ASSIGNMENT', 'RESCHEDULE', 'CHARGES', 'PAYMENT', 'CANCEL_REQUEST', 'NOTIFICATION');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('RECEIVED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('NOT_RECORDED', 'PENDING', 'PAID_CASH', 'PAID_UPI', 'PAID_ONLINE', 'PARTIALLY_PAID', 'WAIVED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."price_type" AS ENUM('FIXED', 'STARTING', 'INSPECTION', 'QUOTE');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'STAFF' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "area_categories" (
	"area_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "area_categories_area_id_category_id_pk" PRIMARY KEY("area_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text,
	"admin_name" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_periods" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"slot_id" text,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"type" "booking_event_type" NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status",
	"message" text,
	"internal" boolean DEFAULT true NOT NULL,
	"actor" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"service_id" text,
	"category_id" text NOT NULL,
	"category_name" text NOT NULL,
	"service_name" text NOT NULL,
	"price_type" "price_type" NOT NULL,
	"unit_price" integer,
	"quantity" integer NOT NULL,
	"line_total" integer NOT NULL,
	"parts_extra" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "booking_status" DEFAULT 'RECEIVED' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_mobile" text NOT NULL,
	"customer_email" text,
	"house_no" text NOT NULL,
	"street" text NOT NULL,
	"landmark" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text NOT NULL,
	"address_type" "address_type" DEFAULT 'HOME' NOT NULL,
	"instructions" text,
	"latitude" double precision,
	"longitude" double precision,
	"area_locality" text,
	"scheduled_date" text NOT NULL,
	"slot_id" text,
	"slot_label" text NOT NULL,
	"is_asap" boolean DEFAULT false NOT NULL,
	"subtotal" integer NOT NULL,
	"visit_fee" integer NOT NULL,
	"tax_amount" integer NOT NULL,
	"estimated_total" integer NOT NULL,
	"has_unpriced_items" boolean DEFAULT false NOT NULL,
	"service_charges" integer,
	"parts_charges" integer,
	"extra_charges" integer,
	"final_amount" integer,
	"payment_status" "payment_status" DEFAULT 'NOT_RECORDED' NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"customer_note" text,
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"cancel_reason" text,
	"cancel_requested_at" timestamp with time zone,
	"cancelled_reason" text,
	"technician_id" text,
	"source" text DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code"),
	CONSTRAINT "bookings_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"business_name" text DEFAULT 'MyRepairUnder100' NOT NULL,
	"tagline" text DEFAULT 'AC & home appliance repair in Delhi NCR' NOT NULL,
	"logo_url" text,
	"support_phone" text,
	"whatsapp_number" text,
	"contact_email" text,
	"business_address" text,
	"support_hours" text,
	"visit_fee" integer DEFAULT 0 NOT NULL,
	"visit_fee_label" text DEFAULT 'Visit / inspection charge' NOT NULL,
	"visit_fee_waiver_above" integer,
	"visit_fee_is_demo" boolean DEFAULT true NOT NULL,
	"tax_enabled" boolean DEFAULT false NOT NULL,
	"tax_percent" double precision DEFAULT 18 NOT NULL,
	"tax_label" text DEFAULT 'GST' NOT NULL,
	"prices_include_tax" boolean DEFAULT true NOT NULL,
	"working_days" integer[] DEFAULT ARRAY[1,2,3,4,5,6] NOT NULL,
	"booking_window_days" integer DEFAULT 7 NOT NULL,
	"min_lead_minutes" integer DEFAULT 120 NOT NULL,
	"asap_enabled" boolean DEFAULT true NOT NULL,
	"asap_cutoff" text DEFAULT '17:00' NOT NULL,
	"asap_daily_capacity" integer DEFAULT 5 NOT NULL,
	"allow_cancellation_request" boolean DEFAULT true NOT NULL,
	"cancellation_cutoff_hours" integer DEFAULT 2 NOT NULL,
	"service_policy" text DEFAULT '' NOT NULL,
	"cancellation_policy" text DEFAULT '' NOT NULL,
	"warranty_policy" text DEFAULT '' NOT NULL,
	"privacy_policy" text DEFAULT '' NOT NULL,
	"terms_of_service" text DEFAULT '' NOT NULL,
	"payment_methods" text[] DEFAULT ARRAY['Pay after service (cash / UPI to technician)']::text[] NOT NULL,
	"online_payment_enabled" boolean DEFAULT false NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"announcement" text,
	"show_demo_banner" boolean DEFAULT true NOT NULL,
	"notify_customer_sms" boolean DEFAULT true NOT NULL,
	"notify_customer_whatsapp" boolean DEFAULT true NOT NULL,
	"notify_customer_email" boolean DEFAULT true NOT NULL,
	"notify_admin_email" boolean DEFAULT true NOT NULL,
	"notify_webhook" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"long_description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"illustration" text DEFAULT 'generic' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text,
	"channel" text NOT NULL,
	"event" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"locality" text NOT NULL,
	"slug" text NOT NULL,
	"pincode" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"publish_page" boolean DEFAULT false NOT NULL,
	"page_intro" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"price_type" "price_type" DEFAULT 'QUOTE' NOT NULL,
	"price" integer,
	"price_is_demo" boolean DEFAULT true NOT NULL,
	"inclusions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"exclusions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"parts_extra" boolean DEFAULT true NOT NULL,
	"requires_diagnosis" boolean DEFAULT false NOT NULL,
	"duration_minutes" integer,
	"warranty_days" integer,
	"warranty_note" text,
	"allow_quantity" boolean DEFAULT true NOT NULL,
	"max_quantity" integer DEFAULT 5 NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technician_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"technician_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone,
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "technician_skills" (
	"technician_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "technician_skills_technician_id_category_id_pk" PRIMARY KEY("technician_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"pincodes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"localities" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"capacity" integer DEFAULT 3 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_images" (
	"id" text PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "area_categories" ADD CONSTRAINT "area_categories_area_id_service_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."service_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_categories" ADD CONSTRAINT "area_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_periods" ADD CONSTRAINT "blocked_periods_slot_id_time_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."time_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_time_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."time_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "blocked_date_idx" ON "blocked_periods" USING btree ("date");--> statement-breakpoint
CREATE INDEX "booking_event_idx" ON "booking_events" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "booking_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_slot_idx" ON "bookings" USING btree ("scheduled_date","slot_id");--> statement-breakpoint
CREATE INDEX "booking_mobile_idx" ON "bookings" USING btree ("customer_mobile");--> statement-breakpoint
CREATE INDEX "booking_pincode_idx" ON "bookings" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "booking_created_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "area_pin_loc_uq" ON "service_areas" USING btree ("pincode","locality");--> statement-breakpoint
CREATE INDEX "area_pincode_idx" ON "service_areas" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "area_slug_idx" ON "service_areas" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "service_cat_slug_uq" ON "services" USING btree ("category_id","slug");--> statement-breakpoint
CREATE INDEX "service_active_idx" ON "services" USING btree ("active","archived");--> statement-breakpoint
CREATE INDEX "assign_tech_idx" ON "technician_assignments" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "assign_booking_idx" ON "technician_assignments" USING btree ("booking_id");