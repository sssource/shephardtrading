CREATE TABLE "engine_activity" (
	"id" serial PRIMARY KEY,
	"occurred_at" timestamp with time zone NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"impact_cents" bigint NOT NULL,
	"status" text NOT NULL,
	"accent" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engine_daily_metrics" (
	"id" serial PRIMARY KEY,
	"recorded_on" date NOT NULL UNIQUE,
	"processed_signals" bigint NOT NULL,
	"conversions" integer NOT NULL,
	"revenue_cents" bigint NOT NULL,
	"value_created_cents" bigint NOT NULL,
	"accuracy_basis_points" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"uptime_basis_points" integer NOT NULL
);
