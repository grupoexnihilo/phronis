'use server';

import { db } from './db';
import { operations, simulations, analysisRequests, users, targetCycles, userSettings } from './schema';
import { desc, eq, and } from 'drizzle-orm';
import axios from 'axios';

// ==========================================================================
// 🎯 CONTROLADOR DE OBJETIVOS E METAS (Dashboard / Central de Auditoria)
// ==========================================================================

/**
 * Busca o único ciclo de metas do usuário com status 'EM_ANDAMENTO'
 */
export async function getActiveTargetCycle(userId) {
  try {
    const numericUserId = userId ? Number(userId) : null;
    
    // 🛡️ CORREÇÃO: Impede buscas incorretas caso o estado do usuário no front mude ou atrase
    if (!numericUserId || isNaN(numericUserId)) {
      return { success: false, error: "ID de usuário inválido ou ausente para consulta de metas." };
    }
    
    const data = await db
      .select()
      .from(targetCycles)
      .where(
        and(
          eq(targetCycles.userId, numericUserId),
          eq(targetCycles.status, 'EM ANDAMENTO')
        )
      )
      .limit(1);

    if (data.length === 0) {
      return { success: false, error: "Nenhum ciclo de metas ativo no momento." };
    }
    
    return { success: true, cycle: JSON.parse(JSON.stringify(data[0])) };
  } catch (error) {
    console.error("❌ Erro no servidor ao buscar ciclo ativo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Consolida o ciclo ativo salvando o targetValue final e limpa a tabela user_settings
 */
export async function consolidateActiveCycle(userId, cycleId, finalTargetValue) {
  try {
    const numericUserId = userId ? Number(userId) : null;
    const numericCycleId = cycleId ? Number(cycleId) : null;

    if (!numericUserId || !numericCycleId) {
      return { success: false, error: "IDs de usuário ou ciclo inválidos para consolidação." };
    }

    // 1. Atualiza e imutabiliza o ciclo passado na target_cycles
    const updatedCycle = await db
      .update(targetCycles)
      .set({
        status: 'CONSOLIDADO',
        targetValue: Number(finalTargetValue) || 0,
        consolidatedAt: new Date()
      })
      .where(
        and(
          eq(targetCycles.id, numericCycleId),
          eq(targetCycles.userId, numericUserId)
        )
      )
      .returning();

    // 2. Limpa e reseta os balões/dados ativos na tabela user_settings para zerar o Dashboard
    await db
      .update(userSettings)
      .set({
        nickname: null,
        initialCapital: '0,00',
        targetGoal: '0,00',
        updatedAt: new Date()
      })
      .where(eq(userSettings.userId, numericUserId));

    return { 
      success: true, 
      message: "Ciclo consolidado e metas do painel limpas com sucesso.", 
      data: JSON.parse(JSON.stringify(updatedCycle[0])) 
    };
  } catch (error) {
    console.error("❌ Erro no servidor ao consolidar ciclo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cria um novo ciclo de metas histórico e sincroniza como ativo na user_settings
 */
export async function createTargetCycle(payload) {
  try {
    const numericUserId = payload.userId ? Number(payload.userId) : null;
    if (!numericUserId || isNaN(numericUserId)) {
      throw new Error("ID de usuário inválido.");
    }

    // Insere nova linha de tracking histórico
    const result = await db.insert(targetCycles).values({
      userId: numericUserId,
      nickname: payload.nickname,
      initialCapital: payload.initialCapital || '0,00',
      targetGoal: payload.targetGoal || '0,00',
      targetValue: Number(payload.targetValue) || 0,
      status: payload.status || 'EM_ANDAMENTO'
    }).returning();

    // Sincroniza também a user_settings com o novo objetivo ativo do Dashboard
    await db.update(userSettings)
      .set({
        nickname: payload.nickname,
        initialCapital: payload.initialCapital || '0,00',
        targetGoal: payload.targetGoal || '0,00',
        updatedAt: new Date()
      })
      .where(eq(userSettings.userId, numericUserId));

    return { success: true, data: JSON.parse(JSON.stringify(result[0])) };
  } catch (error) {
    console.error("❌ Erro ao criar novo ciclo de metas:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Puxa as configurações/metas atuais e ativas diretamente da user_settings (para popular os Balões do Dashboard)
 */
export async function getUserSettingsFromDB(userId) {
  try {
    const numericUserId = userId ? Number(userId) : null;
    if (!numericUserId) return { success: false, error: "ID de usuário inválido." };

    const data = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, numericUserId))
      .limit(1);

    if (data.length === 0) {
      return { success: false, error: "Configurações não encontradas para este usuário." };
    }

    return { success: true, settings: JSON.parse(JSON.stringify(data[0])) };
  } catch (error) {
    console.error("❌ Erro ao buscar configurações de metas do usuário:", error);
    return { success: false, error: error.message };
  }
}


// ==========================================
// 1. BUSCAR OPERAÇÕES FILTRADAS POR USUÁRIO E POR OBJETIVO
// ==========================================
export async function getOperationsFromDB(userId, objectiveId = null) {
  try {
    const numericUserId = userId ? Number(userId) : null;
    if (!numericUserId) return [];

    // Se houver um ciclo ativo rodando na mesa, filtra rigorosamente por ele
    if (objectiveId) {
      const data = await db
        .select()
        .from(operations)
        .where(
          and(
            eq(operations.userId, numericUserId),
            eq(operations.objectiveId, Number(objectiveId))
          )
        )
        .orderBy(desc(operations.createdAt));
      return JSON.parse(JSON.stringify(data));
    }

    // Fallback: Se não houver ciclo ativo, traz apenas as que foram salvas isoladas
    const data = await db
      .select()
      .from(operations)
      .where(
        and(
          eq(operations.userId, numericUserId),
          isNull(operations.objectiveId)
        )
      )
      .orderBy(desc(operations.createdAt));
    return JSON.parse(JSON.stringify(data));

  } catch (error) {
    console.error("❌ Erro no servidor ao buscar dados de operações:", error);
    return [];
  }
}

// ==========================================
// 2. CRIAR SIMULAÇÃO DA IA
// ==========================================
export async function createSimulationInDB(payload) {
  try {
    const numericUserId = payload.userId ? Number(payload.userId) : null;
    if (!numericUserId || isNaN(numericUserId)) {
      throw new Error("Usuário não identificado. A simulação precisa estar atrelada a uma conta válida.");
    }

    const result = await db.insert(simulations).values({
      userId: numericUserId, // 🛡️ CORREÇÃO: Tipagem forçada para Integer casando com o novo Schema
      tipoOperacao: payload.tipoOperacao,
      segmento: payload.segmento,
      ativo1: payload.ativo1,
      ativo2: payload.ativo2,
      investimento: payload.investimento,
      alavancagem: payload.alavancagem,
      moeda: payload.moeda,
      stopPercent: payload.stopPercent,
      alvoPercent: payload.alvoPercent,
      prazoValor: payload.prazoValor,
      prazoUnidade: payload.prazoUnidade,
      winRate: payload.winRate,
      confidenceLabel: payload.confidenceLabel,
      technicalSummary: payload.technicalSummary,
      strategy: payload.strategy,
      status: 'confirmed', 
    }).returning();

    return { success: true, data: JSON.parse(JSON.stringify(result[0])) };
  } catch (error) {
    console.error("❌ Erro no servidor ao salvar simulação:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. BUSCAR SIMULAÇÕES (Ordenadas por Data)
// ==========================================
export async function getSimulationsFromDB() {
  try {
    const data = await db
      .select()
      .from(simulations)
      .orderBy(desc(simulations.createdAt));
    
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("❌ Erro no servidor ao buscar simulações:", error);
    return [];
  }
}

// ==========================================
// 4. ARQUIVAR SIMULAÇÃO
// ==========================================
export async function archiveSimulationInDB(id) {
  try {
    const simulationId = typeof id === 'string' && !isNaN(id) ? Number(id) : id;

    const result = await db
      .update(simulations)
      .set({ status: 'archived' })
      .where(eq(simulations.id, simulationId))
      .returning();

    if (result.length === 0) {
      return { success: false, error: "Nenhuma simulação encontrada com este ID." };
    }

    return { success: true, data: JSON.parse(JSON.stringify(result[0])) };
  } catch (error) {
    console.error("❌ Erro no servidor ao arquivar simulação:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 5. CRIAR OPERAÇÃO A PARTIR DO HISTÓRICO
// ==========================================
export async function createOperationFromHistory(payload) {
  try {
    const numericUserId = payload.userId ? Number(payload.userId) : null;
    if (!numericUserId || isNaN(numericUserId)) {
      throw new Error("ID de usuário inválido ou não fornecido. Operação não pode ser registrada de forma anônima.");
    }

    const vAporte = parseFloat(payload.investimento) || 0;
    const vResultado = parseFloat(payload.resultado) || 0;
    let percentStr = "0%";
    if (vAporte > 0) {
      const pct = ((vResultado / vAporte) * 100).toFixed(0);
      percentStr = pct >= 0 ? `+${pct}%` : `${pct}%`;
    }

    const formatCurrency = (val) => {
      const absVal = Math.abs(val);
      return `R$ ${absVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatarDataMesa = (dataRaw) => {
      if (!dataRaw) {
        const agora = new Date();
        return `${agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      const d = new Date(dataRaw);
      if (isNaN(d.getTime())) return "--";
      
      const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const horaMin = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      return dataRaw.includes('T') ? `${diaMes} ${horaMin}` : diaMes;
    };

    const dataInicioFormatada = formatarDataMesa(payload.dataInicio);
    const dataFimFormatada = formatarDataMesa(payload.dataFim);

    // 🎯 INJEÇÃO DE RASTREABILIDADE TOTAL: Alinhado exatamente com as chaves do novo Schema
    const result = await db.insert(operations).values({
      userId: numericUserId,
      objectiveId: payload.objectiveId ? Number(payload.objectiveId) : null, 
      simulationId: payload.simulationId ? Number(payload.simulationId) : null, 
      asset: payload.ativo1.toUpperCase(),
      start: dataInicioFormatada,
      end: dataFimFormatada,
      type: payload.tipoOperacao,
      invested: formatCurrency(payload.investimento),
      status: payload.status,
      percent: percentStr,
      result: formatCurrency(payload.resultado),
      proporcao: payload.leverage || '--',
      strategy: payload.observacao || '--',
      take: '--',
      stop: '--'
    }).returning();

    if (payload.simulationId) {
      await db.update(simulations)
        .set({ status: 'archived' })
        .where(eq(simulations.id, Number(payload.simulationId)));
    }

    return { success: true, data: JSON.parse(JSON.stringify(result)) };

  } catch (error) {
    console.error("❌ Erro ao registrar operação histórica no Neon:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// LOGS DO TERMINAL DE ANÁLISE
// ==========================================

export async function saveAnalysisToNeon({ userId, assetCode, filesCount, saveSummary, summaryText }) {
  try {
    const result = await db.insert(analysisRequests).values({
      userId: userId ? Number(userId) : 1,
      assetCode: assetCode.toUpperCase().trim(),
      filesCount: filesCount || 0,
      aiSummary: saveSummary ? summaryText : null,
    }).returning();

    return { success: true, newId: result[0].id };
  } catch (error) {
    console.error("❌ Erro no servidor ao salvar log de análise:", error);
    return { success: false, error: error.message };
  }
}

export async function getAnalysisHistory() {
  try {
    const data = await db
      .select()
      .from(analysisRequests)
      .orderBy(desc(analysisRequests.id)); 
    
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error) {
    console.error("❌ Erro no servidor ao buscar histórico de análises:", error);
    return { success: false, data: [] };
  }
}

export async function deleteAnalysisFromNeon(id) {
  try {
    const analysisId = typeof id === 'string' && !isNaN(id) ? Number(id) : id;

    const result = await db
      .delete(analysisRequests)
      .where(eq(analysisRequests.id, analysisId))
      .returning();

    if (result.length === 0) {
      return { success: false, error: "Nenhum log encontrado para exclusão." };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Erro no servidor ao deletar log de análise:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// CONTROLE DE USUÁRIOS
// ==========================================

export async function getUserFromDB(id) {
  try {
    const numericId = id ? Number(id) : 1; 
    const data = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, numericId))
      .limit(1);

    if (data.length === 0) {
      return { success: false, error: "Usuário não encontrado." };
    }

    return { success: true, user: data[0] };
  } catch (error) {
    console.error("❌ Erro no servidor ao buscar usuário:", error);
    return { success: false, error: error.message };
  }
}

// ──> CENTRALIZADOR DE OPERAÇÕES MASCARADAS (Blindagem de Infraestrutura)
export async function executeQuantumQuery({ operation, params }) {
    try {
        switch (operation) {
            
            // 💡 Antiga BRAPI (Mercado Nacional) agora é NexusB3
    case "NEXUS_B3_STREAM": {
    const secretToken = (typeof process !== 'undefined' && process.env ? process.env.BRAPI_TOKEN : null) || 
                        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_BRAPI_TOKEN : null);

    if (!secretToken) {
        return { success: false, error: "Token ausente." };
    }

    // Transforma a string 'PETR4,VALE3' em uma array para fazermos o de/para dinâmico
    const targetTickers = params.scope.split(',').map(t => t.trim().toUpperCase());

    // Utilizamos o endpoint estável de listagem global da BRAPI
    const url = `https://brapi.dev/api/quote/list?token=${secretToken}`;
    const response = await axios.get(url);
    
    if (response.data && response.data.stocks) {
        // Filtra apenas os ativos que estão no escopo selecionado da Trader Area
        const filteredStocks = response.data.stocks.filter(s => targetTickers.includes(s.stock.toUpperCase()));
        
        // Formata o payload para bater com a estrutura esperada pelo .map(a => a.symbol) do seu useEffect
        const formattedResults = filteredStocks.map(s => ({ symbol: s.stock }));
        
        return { success: true, payload: { results: formattedResults } };
    }

    return { success: false, error: "Estrutura de dados inválida da API de mercado." };
}

            // 💡 Antiga Polygon (Forex/Grupamento) agora é GlobalFeed
           case "GLOBAL_FEED_SNAPSHOT": {
        const secretKey = (typeof process !== 'undefined' && process.env ? process.env.POLYGON_API_KEY : null) || 
                          (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_POLYGON_API_KEY : null);

        if (!secretKey) {
            return { success: false, error: "Chave da Polygon ausente." };
        }

        const url = `https://api.polygon.io/v2/last/nbbo/${params.scope}?apiKey=${secretKey}`;
        const response = await axios.get(url);
        return { success: true, payload: response.data };
    }

            // 💡 Antiga News API agora é IntelPulse
            case "INTEL_PULSE_FETCH": {
                const secretKey = process.env.NEWS_API_KEY;
                const url = `https://newsapi.org/v2/everything?q=${params.scope}&apiKey=${secretKey}`;
                const response = await axios.get(url);
                return { success: true, payload: response.data.articles.slice(0, 5) };
            }

            // 💡 Antigo Gemini agora é PhronesCore
            case "PHRONES_CORE_PROMPT": {
                const secretKey = process.env.GEMINI_API_KEY;
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${secretKey}`;
                const response = await axios.post(url, {
                    contents: [{
                        parts: [{ text: params.context }]
                    }]
                });
                const outputText = response.data.candidates[0].content.parts[0].text;
                return { success: true, payload: outputText };
            }

            default:
                return { success: false, error: "Protocolo de operação inexistente no ecossistema." };
        }
    } catch (error) {
        console.error(`[Phrones Security Exception] Erro na operação ${operation}:`, error.message);
        return { success: false, error: "Falha na comunicação com o provedor de dados isolado." };
    }
}

