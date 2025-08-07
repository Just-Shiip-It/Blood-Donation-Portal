CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid NOT NULL,
	"blood_bank_id" uuid NOT NULL,
	"appointment_date" timestamp NOT NULL,
	"status" varchar(50) NOT NULL,
	"notes" text,
	"reminder_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blood_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" jsonb NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"operating_hours" jsonb,
	"capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"coordinates" jsonb
);
--> statement-breakpoint
CREATE TABLE "blood_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blood_bank_id" uuid NOT NULL,
	"blood_type" varchar(5) NOT NULL,
	"units_available" integer DEFAULT 0 NOT NULL,
	"units_reserved" integer DEFAULT 0 NOT NULL,
	"minimum_threshold" integer DEFAULT 10 NOT NULL,
	"expiration_date" date,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blood_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"blood_type" varchar(5) NOT NULL,
	"units_requested" integer NOT NULL,
	"urgency_level" varchar(20) NOT NULL,
	"patient_info" jsonb,
	"request_date" timestamp DEFAULT now(),
	"required_by" timestamp NOT NULL,
	"status" varchar(50) NOT NULL,
	"fulfilled_by" uuid,
	"fulfilled_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "donation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid NOT NULL,
	"blood_bank_id" uuid NOT NULL,
	"appointment_id" uuid,
	"donation_date" timestamp NOT NULL,
	"blood_type" varchar(5) NOT NULL,
	"units_collected" integer DEFAULT 1 NOT NULL,
	"health_metrics" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "donor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"blood_type" varchar(5) NOT NULL,
	"phone" varchar(20),
	"address" jsonb,
	"medical_history" jsonb,
	"emergency_contact" jsonb,
	"preferences" jsonb,
	"last_donation_date" date,
	"total_donations" integer DEFAULT 0,
	"is_deferred_temporary" boolean DEFAULT false,
	"is_deferred_permanent" boolean DEFAULT false,
	"deferral_reason" text,
	"deferral_end_date" date
);
--> statement-breakpoint
CREATE TABLE "healthcare_facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" jsonb NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"license_number" varchar(100) NOT NULL,
	"facility_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"coordinates" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"email_verified" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_donor_id_donor_profiles_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_blood_bank_id_blood_banks_id_fk" FOREIGN KEY ("blood_bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_inventory" ADD CONSTRAINT "blood_inventory_blood_bank_id_blood_banks_id_fk" FOREIGN KEY ("blood_bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_facility_id_healthcare_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."healthcare_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_requests" ADD CONSTRAINT "blood_requests_fulfilled_by_blood_banks_id_fk" FOREIGN KEY ("fulfilled_by") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_history" ADD CONSTRAINT "donation_history_donor_id_donor_profiles_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_history" ADD CONSTRAINT "donation_history_blood_bank_id_blood_banks_id_fk" FOREIGN KEY ("blood_bank_id") REFERENCES "public"."blood_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_history" ADD CONSTRAINT "donation_history_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;