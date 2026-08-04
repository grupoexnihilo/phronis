import { pgTable, serial, varchar, timestamp, integer, text, boolean, jsonb } from 'drizzle-orm/pg-core';
// === TABELA: USERS ===
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// === TABELA: TARGET CYCLES (Objetivos Globais) ===
export const targetCycles = pgTable('target_cycles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  nickname: varchar('nickname', { length: 100 }),
  initialCapital: varchar('initial_capital', { length: 50 }),
  targetGoal: varchar('target_goal', { length: 50 }),
  targetValue: integer('target_value').default(0).notNull(), // ✨ Agora alinhado com o banco físico
  status: varchar('status', { length: 20 }).default('EM ANDAMENTO'),
  consolidatedAt: timestamp('consolidated_at').defaultNow().notNull(), // ✨ Padronizado para camelCase no JS
});

// === TABELA: SIMULATIONS (Estratégias da IA) ===
export const simulations = pgTable('simulations', {
  id: serial('id').primaryKey(),
  // 🛡️ CORREÇÃO: Mudado de varchar para integer com foreign key para consistência de tipos
  userId: integer('user_id').references(() => users.id).notNull(),
  tipoOperacao: varchar('tipo_operacao', { length: 50 }).default('Day Trade'),
  segmento: varchar('segmento', { length: 50 }).default('Ações'),
  ativo1: varchar('ativo_1', { length: 20 }),
  ativo2: varchar('ativo_2', { length: 20 }),
  investimento: varchar('investimento', { length: 30 }).default('0,00'),
  alavancagem: varchar('alavancagem', { length: 20 }).default('1x'),
  moeda: varchar('moeda', { length: 10 }).default('BRL'),
  stopPercent: varchar('stop_percent', { length: 20 }).default('0,00'),
  alvoPercent: varchar('alvo_percent', { length: 20 }).default('0,00'),
  prazoValor: varchar('prazo_valor', { length: 10 }).default('1'),
  prazoUnidade: varchar('prazo_unidade', { length: 20 }).default('Dias'),
  winRate: varchar('win_rate', { length: 20 }), 
  confidenceLabel: varchar('confidence_label', { length: 50 }), 
  technicalSummary: text('technical_summary'), 
  strategy: text('strategy'), 
  status: varchar('status', { length: 20 }).default('pending'), 
  marketPriceAtAnalysis: varchar('market_price_at_analysis', { length: 30 }),
  entryPrice: varchar('entry_price', { length: 30 }),
  targetPrice: varchar('target_price', { length: 30 }),
  stopPrice: varchar('stop_price', { length: 30 }),
  projectedGainAmount: varchar('projected_gain_amount', { length: 30 }),
  projectedLossAmount: varchar('projected_loss_amount', { length: 30 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// === TABELA: OPERATIONS (Operações de Mesa) ===
export const operations = pgTable('operations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  // 🎯 CORREÇÃO DE RASTREABILIDADE: Ajustado para mapear a coluna 'objective_id' física do Neon
  objectiveId: integer('objective_id').references(() => targetCycles.id, { onDelete: 'set null' }), 
  simulationId: integer('simulation_id').references(() => simulations.id, { onDelete: 'set null' }),
  
  asset: varchar('asset', { length: 50 }).notNull(),
  start: varchar('start', { length: 20 }).notNull(),
  end: varchar('end', { length: 20 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  invested: varchar('invested', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  percent: varchar('percent', { length: 20 }).notNull(),
  result: varchar('result', { length: 50 }).notNull(),
  proporcao: varchar('proporcao', { length: 20 }),
  // 🛡️ CORREÇÃO: Mudado para text para evitar estouro de caracteres em descrições longas
  strategy: text('strategy'),
  take: varchar('take', { length: 50 }),
  stop: varchar('stop', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// === TABELA: USER SETTINGS ===
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  nickname: varchar('nickname', { length: 100 }),
  initialCapital: varchar('initial_capital', { length: 50 }).default('0,00'),
  riskProfile: varchar('risk_profile', { length: 50 }).default('MODERADO'), 
  targetGoal: varchar('target_goal', { length: 50 }).default('0,00'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// === TABELA: ANALYSIS REQUESTS ===
export const analysisRequests = pgTable('analysis_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  assetCode: varchar('asset_code', { length: 20 }),
  filesCount: integer('files_count'),
  aiSummary: text('ai_summary'),
  status: text("status").default("PENDING"),
  createdAt: timestamp('created_at').defaultNow(),
});

export const marketTickers = pgTable('market_tickers', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull().unique(), // ex: 'PETR4', 'VALE3', 'MXRF11'
  name: varchar('name', { length: 150 }),                       // ex: 'Petróleo Brasileiro S.A.'
  segment: varchar('segment', { length: 50 }).notNull(),       // ex: 'Ações', 'FIIs', 'Forex', 'Opções'
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// === TABELA: QUANTUM ANALYSES (Controle de Timeout da IA) ===
export const quantumAnalyses = pgTable('quantum_analyses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(), // Removeu o .references() temporariamente para evitar conflitos de nomes físicos no Neon
  symbol: varchar('symbol', { length: 20 }).notNull(),
  status: varchar('status', { length: 50 }).default('processing').notNull(),
  result: jsonb('result'), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// === TABELA: CYCLE CAUSALITIES (Memória Imunológica Kaizen) ===
export const cycleCausalities = pgTable('cycle_causalities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  regimeAlvo: text('regime_alvo', { length: 100 }).notNull(), // Ex: 'CONSOLIDACAO_BAIXA_VOLATILIDADE'
  vulnerabilidade: text('vulnerabilidade').notNull(),            // O erro técnico histórico
  vacinaSugerida: text('vacina_sugerida').notNull(),             // A condicional para evitar o erro
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// === TABELA: CHIEF STRATEGIST REPORTS (Análises Oficiais Consolidadas) ===
export const chiefStrategistReports = pgTable('chief_strategist_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  cicloAlvo: integer('ciclo_alvo').notNull(),                   // Vinculado ao avanço da escada (Ex: 101)
  diagnosticoRegime: text('diagnostico_regime').notNull(),       // ###DIAGNOSTICO_REGIME###
  vulnerabilidadesBloqueadas: text('vulnerabilidades_bloqueadas').notNull(), // ###VULNERABILIDADES_BLOQUEADAS###
  calibragemRisco: text('calibragem_risco').notNull(),           // ###CALIBRAGEM_RISCO###
  diretrizOperacional: text('diretriz_operacional').notNull(),   // ###DIRETRIZ_OPERACIONAL###
  createdAt: timestamp('created_at').defaultNow().notNull(),
});