import { db } from '../db/db';
// 1. IMPORTANTE: Garantir que a nova tabela 'targetCycles' foi adicionada aqui no import
import { userSettings, targetCycles } from '../db/schema'; 
import { eq } from 'drizzle-orm';

export const settingsService = {
  
  // Função 1: Busca as configurações do usuário logado
  async getSettings(userId) {
    try {
      const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      return result[0] || null;
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      throw error;
    }
  },

  // Função 2: Salva os parâmetros E inicializa o ciclo ativo na tabela target_cycles
  async saveSettings(userId, data) {
    try {
      // Conversão segura do ID do usuário para número (evita quebras no Neon)
      const numericUserId = Number(userId);

      // A. Primeiro, atualizamos ou inserimos na tabela 'user_settings'
      let configResult = null;
      const updated = await db.update(userSettings)
        .set({
          nickname: data.nickname,
          initialCapital: data.initialCapital,
          riskProfile: data.riskProfile,
          targetGoal: data.targetGoal,
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, numericUserId))
        .returning();

      if (updated.length === 0) {
        const inserted = await db.insert(userSettings)
          .values({
            userId: numericUserId,
            nickname: data.nickname,
            initialCapital: data.initialCapital,
            riskProfile: data.riskProfile,
            targetGoal: data.targetGoal
          })
          .returning();
        configResult = inserted[0];
      } else {
        configResult = updated[0];
      }

      // B. 🎯 NOVIDADE: Insere de forma ativa o novo ciclo na tabela 'target_cycles'
      // Tratando o targetValue como número inteiro limpo (removendo caracteres se houver)
      const numericTargetValue = data.targetGoal ? Math.floor(Number(String(data.targetGoal).replace(/[^0-9.]/g, ''))) : 0;

      await db.insert(targetCycles)
        .values({
          userId: numericUserId,
          nickname: data.nickname,
          initialCapital: data.initialCapital,
          targetGoal: String(data.targetGoal),
          targetValue: numericTargetValue,
          status: 'EM ANDAMENTO', // Define o status necessário para o Dashboard carregar
          consolidatedAt: new Date()
        });

      return configResult;
    } catch (error) {
      console.error("Erro ao salvar configurações e inicializar ciclo:", error);
      throw error;
    }
  }, 

  // Função 3 (NOVA): Consolida o ciclo atual no histórico e reseta a mesa ativa
  async consolidateCycle(userId, currentSettings) {
    try {
      const numericUserId = Number(userId);

      // A. ATUALIZAÇÃO DO STATUS: Em vez de inserir novo, alteramos o status do ciclo atual
      await db.update(targetCycles)
        .set({
          status: 'CONSOLIDADO',
          consolidatedAt: new Date()
        })
        .where(
          and(
            eq(targetCycles.userId, numericUserId),
            eq(targetCycles.id, cycleId) // Identifica exatamente o ciclo em andamento
          )
        );

      // B. Limpa/Reseta a mesa do ciclo ativo na tabela 'user_settings'
      await db.update(userSettings)
        .set({
          nickname: '',
          initialCapital: '0',
          targetGoal: '0',
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, numericUserId));

      return true;
    } catch (error) {
      console.error("Erro ao consolidar ciclo no Neon:", error);
      throw error;
    }
  }
};