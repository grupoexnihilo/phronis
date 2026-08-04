import { db } from '../db/db';
import { operations } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const operationService = {
  // Alimenta o rodapé do Dashboard com as últimas 10 operações reais
  async getLatestOperations(userId) {
    try {
      if (!userId) return [];
      return await db
        .select()
        .from(operations)
        .where(eq(operations.userId, userId))
        .orderBy(desc(operations.createdAt))
        .limit(10);
    } catch (error) {
      console.error("Erro ao buscar histórico real:", error);
      return [];
    }
  },

  // Efetiva a simulação, transformando-a num trade real no histórico
  async createOperation(userId, data) {
    try {
      if (!userId) throw new Error("Usuário não identificado.");

      // Formatação de data/hora simplificada para o padrão do teu terminal (Ex: "24/05 22:30")
      const agora = new Date();
      const startFormatado = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

      const response = await db
        .insert(operations)
        .values({
          userId,
          asset: data.asset,
          type: data.type,
          start: startFormatado,
          end: '--', // Nasce sem data de fim até ser fechada
          invested: data.invested,
          status: 'open', // Toda operação executada entra como aberta
          percent: '--',
          result: '--',
          proporcao: data.proporcao || '--',
          strategy: data.strategy || 'Executado via Engenharia de Terminais.',
          take: data.take,
          stop: data.stop,
          createdAt: agora
        })
        .returning();

      return response[0];
    } catch (error) {
      console.error("Erro ao registrar operação real no Neon:", error);
      throw error;
    }
  }
};