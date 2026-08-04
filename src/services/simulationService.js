// services/simulationService.js
import { db } from '../db/db';
import { simulations } from '../db/schema';
import { eq, desc } from 'drizzle-orm'; // <-- Importado o 'desc' aqui para o orderBY funcionar

export const simulationService = {
  
  // 1. GET ALL: Busca todas as simulações para listar na SimulationsView
  async getAll() {
    try {
      return await db
        .select()
        .from(simulations)
        .orderBy(desc(simulations.createdAt)); // Traz as mais recentes primeiro
    } catch (error) {
      console.error("Erro no service getAll:", error);
      throw error;
    }
  },

  // 2. CREATE: Cria uma nova simulação oficial com status 'pending' (Botão GERAR)
  async create(data) {
    try {
      const payload = {
        userId: data.userId || data.user_id, // Aceita as duas convenções (camelCase e snake_case)
        tipoOperacao: data.tipoOperacao || data.tipo_operacao,
        segmento: data.segmento,
        ativo1: data.ativo1 || data.ativo_1,
        ativo2: data.ativo2 || data.ativo_2,
        investimento: data.investimento,
        alavancagem: data.alavancagem,
        moeda: data.moeda,
        stopPercent: data.stopPercent || data.stop_percent,
        alvoPercent: data.alvoPercent || data.alvo_percent,
        prazoValor: data.prazoValor || data.prazo_valor,
        prazoUnidade: data.prazoUnidade || data.prazo_unidade,
        winRate: data.winRate || data.win_rate, // Mapeando campos de Inteligência do Modal
        confidenceLabel: data.confidenceLabel || data.confidence_label,
        technicalSummary: data.technicalSummary || data.technical_summary,
        strategy: data.strategy,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const res = await db
        .insert(simulations)
        .values(payload)
        .returning();

      return res[0]; // Retorna o registro criado contendo o ID oficial do Neon
    } catch (error) {
      console.error("Erro no service create:", error);
      throw error;
    }
  },

  // 3. UPDATE STATUS: Atualiza o status para 'confirmed' (Botão CONFIRMAR OPERAÇÃO)
  async updateStatus(id, status) {
    try {
      if (!id) throw new Error("ID não fornecido para atualização.");

      const res = await db
        .update(simulations)
        .set({ 
          status: status,
          updatedAt: new Date()
        })
        .where(eq(simulations.id, id))
        .returning();

      return res[0];
    } catch (error) {
      console.error("Erro no service updateStatus:", error);
      throw error;
    }
  },

  // 4. Busca o rascunho salvo do usuário (traz o último modificado)
  async getLatestSimulation(userId) {
    try {
      if (!userId) return null;
      const res = await db
        .select()
        .from(simulations)
        .where(eq(simulations.userId, userId))
        .orderBy(desc(simulations.updatedAt))
        .limit(1);
      return res[0] || null;
    } catch (error) {
      console.error("Erro ao carregar simulação ativa:", error);
      return null;
    }
  },

  // 5. Salva ou atualiza a mesa de estudos do usuário (Upsert do rascunho de tela)
  async saveSimulation(userId, data) {
    try {
      if (!userId) return null;
      
      const existing = await db
        .select()
        .from(simulations)
        .where(eq(simulations.userId, userId))
        .limit(1);

      const payload = {
        userId,
        tipoOperacao: data.tipoOperacao,
        segmento: data.segmento,
        ativo1: data.ativo1,
        ativo2: data.ativo2,
        investimento: data.investimento,
        alavancagem: data.alavancagem,
        moeda: data.moeda,
        stopPercent: data.stopPercent,
        alvoPercent: data.alvoPercent,
        prazoValor: data.prazoValor,
        prazoUnidade: data.prazoUnidade,
        updatedAt: new Date()
      };

      if (existing.length > 0) {
        return await db
          .update(simulations)
          .set(payload)
          .where(eq(simulations.id, existing[0].id))
          .returning();
      } else {
        return await db
          .insert(simulations)
          .values(payload)
          .returning();
      }
    } catch (error) {
      console.error("Erro ao salvar simulação no Neon:", error);
      throw error;
    }
  }
};