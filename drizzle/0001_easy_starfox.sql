CREATE TABLE "chief_strategist_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ciclo_alvo" integer NOT NULL,
	"diagnostico_regime" text NOT NULL,
	"vulnerabilidades_bloqueadas" text NOT NULL,
	"calibragem_risco" text NOT NULL,
	"diretriz_operacional" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_causalities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"regime_alvo" varchar(100) NOT NULL,
	"vulnerabilidade" text NOT NULL,
	"vacina_sugerida" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quantum_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"status" varchar(50) DEFAULT 'processing' NOT NULL,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_requests" DROP CONSTRAINT "analysis_requests_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "analysis_requests" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_requests" ALTER COLUMN "asset_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_requests" ALTER COLUMN "files_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "analysis_requests" ALTER COLUMN "files_count" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_requests" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_requests" ADD COLUMN "status" text DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "market_price_at_analysis" varchar(30);--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "entry_price" varchar(30);--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "target_price" varchar(30);--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "stop_price" varchar(30);--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "projected_gain_amount" varchar(30);--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "projected_loss_amount" varchar(30);--> statement-breakpoint
ALTER TABLE "chief_strategist_reports" ADD CONSTRAINT "chief_strategist_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_causalities" ADD CONSTRAINT "cycle_causalities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;