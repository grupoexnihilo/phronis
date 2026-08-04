CREATE TABLE "analysis_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"asset_code" varchar(20) NOT NULL,
	"files_count" integer DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_tickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(150),
	"segment" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "market_tickers_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"objective_id" integer,
	"simulation_id" integer,
	"asset" varchar(50) NOT NULL,
	"start" varchar(20) NOT NULL,
	"end" varchar(20) NOT NULL,
	"type" varchar(50) NOT NULL,
	"invested" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"percent" varchar(20) NOT NULL,
	"result" varchar(50) NOT NULL,
	"proporcao" varchar(20),
	"strategy" text,
	"take" varchar(50),
	"stop" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tipo_operacao" varchar(50) DEFAULT 'Day Trade',
	"segmento" varchar(50) DEFAULT 'Ações',
	"ativo_1" varchar(20),
	"ativo_2" varchar(20),
	"investimento" varchar(30) DEFAULT '0,00',
	"alavancagem" varchar(20) DEFAULT '1x',
	"moeda" varchar(10) DEFAULT 'BRL',
	"stop_percent" varchar(20) DEFAULT '0,00',
	"alvo_percent" varchar(20) DEFAULT '0,00',
	"prazo_valor" varchar(10) DEFAULT '1',
	"prazo_unidade" varchar(20) DEFAULT 'Dias',
	"win_rate" varchar(20),
	"confidence_label" varchar(50),
	"technical_summary" text,
	"strategy" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "target_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nickname" varchar(100),
	"initial_capital" varchar(50),
	"target_goal" varchar(50),
	"target_value" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'EM ANDAMENTO',
	"consolidated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nickname" varchar(100),
	"initial_capital" varchar(50) DEFAULT '0,00',
	"risk_profile" varchar(50) DEFAULT 'MODERADO',
	"target_goal" varchar(50) DEFAULT '0,00',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_objective_id_target_cycles_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."target_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_cycles" ADD CONSTRAINT "target_cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;