import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, operations } from './schema';

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);
const db = drizzle(sql);

async function main() {
  console.log("🌱 Iniciando semeio de dados compatível com multi-usuário...");

  try {
    // 1. Cria ou recupera o usuário real
    let userId;
    const existingUser = await db.select().from(users);

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`ℹ️ Usuário já existente encontrado. ID: ${userId}`);
    } else {
      const newUser = await db.insert(users).values({
        email: 'grupoexnihilo@gmail.com',
        password: '123456',
        name: 'David Fernandes',
      }).returning();
      userId = newUser[0].id;
      console.log(`✅ Usuário master criado com ID: ${userId}`);
    }

    // Limpa operações antigas para não dar conflito de IDs
    await db.delete(operations);

    // 2. Insere as operações de teste amarradas ao David
    console.log("📥 Injetando operações vinculadas...");
    await db.insert(operations).values([
      {
        userId: userId,
        asset: 'PETR4',
        start: '12/05 14:32',
        end: '15/05 10:15',
        type: 'Swing Trade',
        invested: 'R$ 150,00',
        status: 'win',
        percent: '+15%',
        result: 'R$ 172,50',
        proporcao: '--',
        strategy: 'Análise macro de longo prazo com foco em exaustão de preço.',
        take: '15% Target',
        stop: '5% Fixed',
      },
      {
        userId: userId,
        asset: 'ITUB4 VS BBAS3',
        start: '19/05 11:00',
        end: '--',
        type: 'Long Short',
        invested: 'R$ 500,00',
        status: 'open',
        percent: '--',
        result: '--',
        proporcao: '1:1.2',
        strategy: 'Arbitragem estatística por distorção no spread histórico do setor bancário.',
        take: '--',
        stop: '--',
      },
      {
        userId: userId,
        asset: 'VALE3',
        start: '22/05 09:15',
        end: '--',
        type: 'Position',
        invested: 'R$ 100,00',
        status: 'open',
        percent: '--',
        result: '--',
        proporcao: '--',
        strategy: 'Tentativa de acompanhamento de tendência institucional em canal de baixa.',
        take: '20% Target',
        stop: '8% Fixed',
      },
      {
        userId: userId,
        asset: 'WINM26',
        start: '16/05 10:15',
        end: '16/05 10:45',
        type: 'Day Trade',
        invested: 'R$ 25,00',
        status: 'win',
        percent: '+2%',
        result: 'R$ 25,50',
        proporcao: '--',
        strategy: 'Rompimento de canal com confirmação de volume no tempo gráfico M5.',
        take: '2% Scalp',
        stop: '1% Fixed',
      }
    ]);

    console.log("✨ Banco de dados semeado e blindado com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao semear banco:", error);
    process.exit(1);
  }
}

main();