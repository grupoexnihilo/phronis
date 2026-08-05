// src/app/actions.js
'use server'

import { authService } from '../services/authService';
import { settingsService } from '../services/settingsService';

// Importações do Banco de Dados (agora só acontecem aqui no Maestro)
import { db } from '../db/db';
import { operations, targetCycles, simulations, analysisRequests, users, userSettings, cycleCausalities, chiefStrategistReports, } from '../db/schema';
import { desc, eq, and, isNull } from 'drizzle-orm';
import { executeQuantumQuery as quantumQuery } from '../db/marketActions'; // Alias para evitar conflito
import { getMarketTickersBySegment } from '../db/marketActions';
import { getMarketPrice } from '../db/marketActions'; // Importa a função de infra
import { calcularProjecoesFinanceiras } from '@/lib/financialMath';
import { sincronizarTodosOsMercados } from '../services/marketSync';

// ==========================================================================
// 🔐 AUTH & SETTINGS SERVICES (Herdados dos Serviços)
// ==========================================================================

export async function loginAction(email, password) {
    try {
        return await authService.login(email, password);
    } catch (error) {
        throw error;
    }
}

export async function getSettingsAction(userId) {
    try {
        return await settingsService.getSettings(userId);
    } catch (error) {
        console.error("Erro na action getSettingsAction:", error);
        throw error;
    }
}

export async function saveSettingsAction(userId, data) {
    try {
        return await settingsService.saveSettings(userId, data);
    } catch (error) {
        console.error("Erro na action saveSettingsAction:", error);
        throw error;
    }
}

// ==========================================================================
// 🎯 CONTROLADOR DE OBJETIVOS E METAS GLOBAIS
// ==========================================================================

export async function getActiveTargetCycle(userId) {
  try {
    const numericUserId = userId ? Number(userId) : null;
    if (!numericUserId || isNaN(numericUserId)) {
      return { success: false, error: "ID de usuário inválido." };
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
      return { success: false, error: "Nenhum ciclo ativo." };
    }
    
    return { success: true, cycle: JSON.parse(JSON.stringify(data[0])) };
  } catch (error) {
    console.error("❌ Erro ao buscar ciclo ativo:", error);
    return { success: false, error: error.message };
  }
}

export async function getHistoryCyclesAction(userId) {
  try {
    const numericUserId = userId ? Number(userId) : null;
    if (!numericUserId || isNaN(numericUserId)) {
      return { success: false, error: "ID de usuário inválido." };
    }

    const data = await db
      .select()
      .from(targetCycles)
      .where(eq(targetCycles.userId, numericUserId))
      .orderBy(desc(targetCycles.id));

    return { success: true, payload: JSON.parse(JSON.stringify(data)) };
  } catch (error) {
    console.error("❌ Erro em getHistoryCyclesAction:", error);
    return { success: false, error: error.message };
  }
}

export async function saveHistoryCycleAction(payload) {
  try {
    const { userId, id, nickname, initialCapital, targetGoal, status } = payload;
    const isConsolidando = status === 'CONSOLIDADO';

    if (id) {
      await db.update(targetCycles)
        .set({
          nickname,
          initialCapital: Number(initialCapital) || 0,
          targetGoal: Number(targetGoal) || 0,
          status,
          consolidatedAt: isConsolidando ? new Date() : null 
        })
        .where(eq(targetCycles.id, id));
    } else {
      await db.insert(targetCycles).values({
        userId,
        nickname,
        initialCapital: Number(initialCapital) || 0,
        targetGoal: Number(targetGoal) || 0,
        status
      });
    }
    return { success: true };
  } catch (error) {
    console.error("❌ Erro em saveHistoryCycleAction:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteHistoryCycleAction(id) {
  try {
    if (!id) return { success: false, error: "ID não fornecido." };
    await db.delete(targetCycles).where(eq(targetCycles.id, id));
    return { success: true };
  } catch (error) {
    console.error("❌ Erro em deleteHistoryCycleAction:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================================================
// 📊 CONTROLADOR DE OPERAÇÕES DE MESA E AUDITORIA
// ==========================================================================

export async function getRecentOperationsAction(userId, objectiveId = null) {
  try {
    const numericUserId = userId ? Number(userId) : null;
    if (!numericUserId || isNaN(numericUserId)) {
      return { success: false, error: "ID de usuário inválido." };
    }

    let data;
    if (objectiveId) {
      data = await db
        .select()
        .from(operations)
        .where(
          and(
            eq(operations.userId, numericUserId),
            eq(operations.objectiveId, Number(objectiveId))
          )
        )
        .orderBy(desc(operations.createdAt));
    } else {
       // Se não mandar objetivo, traz todas as operações daquele usuário
       data = await db
        .select()
        .from(operations)
        .where(eq(operations.userId, numericUserId))
        .orderBy(desc(operations.createdAt));
    }

    return { success: true, payload: JSON.parse(JSON.stringify(data)) };
  } catch (error) {
    console.error("❌ Erro na Server Action getRecentOperationsAction:", error);
    return { success: true, payload: JSON.parse(JSON.stringify(data)) };
  }
}

export async function createOperationFromHistory(payload) {
  // A lógica completa da criação da operação que estava no db/actions.js
  try {
    const numericUserId = payload.userId ? Number(payload.userId) : null;
    if (!numericUserId) throw new Error("ID de usuário inválido.");

    const vAporte = parseFloat(payload.investimento) || 0;
    const vResultado = parseFloat(payload.resultado) || 0;
    let percentStr = "0%";
    if (vAporte > 0) {
      const pct = ((vResultado / vAporte) * 100).toFixed(0);
      percentStr = pct >= 0 ? `+${pct}%` : `${pct}%`;
    }

    const formatCurrency = (val) => `R$ ${Math.abs(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatarData = (dRaw) => dRaw ? new Date(dRaw).toLocaleDateString('pt-BR') : "--";

    const result = await db.insert(operations).values({
      userId: numericUserId,
      objectiveId: payload.objectiveId ? Number(payload.objectiveId) : null, 
      simulationId: payload.simulationId ? Number(payload.simulationId) : null, 
      asset: payload.ativo1.toUpperCase(),
      start: formatarData(payload.dataInicio),
      end: formatarData(payload.dataFim),
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
    console.error("❌ Erro em createOperationFromHistory:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================================================
// 🧠 CONTROLADOR DE ANÁLISE QUANTITATIVA DA IA
// ==========================================================================

export async function executeQuantumQuery({ operation, params }) {
    // Repassa para a função isolada no db/marketActions.js que faz as chamadas HTTP
    return await quantumQuery({ operation, params });
}

export async function consolidateCycleAction(userId, cycleId) {
  try {
    if (!userId || !cycleId) return { success: false, error: "Dados insuficientes." };

    // 1. Atualiza o status do ciclo para CONSOLIDADO
    await db.update(targetCycles)
      .set({ 
        status: 'CONSOLIDADO',
        consolidatedAt: new Date()
      })
      .where(eq(targetCycles.id, cycleId));

    // 2. Limpa as configurações de meta e capital da tabela user_settings
    await db.update(userSettings)
      .set({
        nickname: '',
        initialCapital: '0',
        targetGoal: '0',
        updatedAt: new Date()
      })
      .where(eq(userSettings.userId, Number(userId)));

    return { success: true };
  } catch (error) {
    console.error("❌ Erro em consolidateCycleAction:", error);
    return { success: false, error: error.message };
  }
}

// 🧠 CONTROLADOR DE SIMULAÇÕES (Ponte para o SimulationService)
import { simulationService } from '../services/simulationService';

export async function getSimulationsFromDB(userId) {
  try {
    // Busca todas as simulações do serviço
    const data = await simulationService.getAll();
    return data; 
  } catch (error) {
    console.error("❌ Erro ao buscar simulações:", error);
    return [];
  }
}

export async function archiveSimulationInDB(id) {
  try {
    // Chama o service para atualizar status para 'archived'
    await simulationService.updateStatus(id, 'archived');
    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao arquivar simulação:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserHistoryData(userId) {
  try {
    const [trades, cycles] = await Promise.all([
      db.select().from(operations).where(eq(operations.userId, userId)),
      db.select().from(targetCycles).where(eq(targetCycles.userId, userId))
    ]);
    return { trades, cycles };
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return { trades: [], cycles: [] };
  }
}

export async function saveAnalysisResult(data) {
    try {
        const result = await db.insert(analysisRequests).values({
            userId: data.userId,
            assetCode: data.assetCode,
            filesCount: data.filesCount,
            aiSummary: data.aiSummary,
            createdAt: new Date()
        }).returning();
        
        // Convertemos para um objeto plano antes de retornar
        return { success: true, newId: result[0].id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteAnalysisFromNeon(id) {
    try {
        await db.delete(analysisRequests).where(eq(analysisRequests.id, id));
        // Retornamos um objeto simples que o Client Component entende
        return { success: true }; 
    } catch (error) {
        console.error("Erro ao deletar:", error);
        return { success: false, error: error.message };
    }
}

export async function getAnalysisHistory(userId) {
    const data = await db.select().from(analysisRequests).where(eq(analysisRequests.userId, userId)).orderBy(desc(analysisRequests.createdAt));
    // Limpeza aqui também:
    return JSON.parse(JSON.stringify(data));
}


export async function verificarStatusAnalisePorId(id) {
    try {
        if (!id) return { success: false, status: 'ERROR', error: "ID inválido." };

        const [registro] = await db.select()
            .from(analysisRequests)
            .where(eq(analysisRequests.id, Number(id)));

        if (!registro) {
            return { success: false, status: 'ERROR', error: "Registro não encontrado." };
        }

        // Se a IA ainda estiver processando no background da thread...
        if (registro.status === 'loading' || registro.status === 'PENDING') {
            return { success: true, status: 'LOADING' };
        }

        // Se o background concluiu e preencheu a coluna aiSummary
        if (registro.aiSummary) {
            // Garante que o JSON do banco de dados seja interpretado como objeto JavaScript legítimo
            const payloadIA = typeof registro.aiSummary === 'string' 
                ? JSON.parse(registro.aiSummary) 
                : registro.aiSummary;
            
            console.log("🛰️ [SERVER ACTIONS] Descarregando payload purificado para o modal:", payloadIA);

            return {
                success: true,
                status: 'COMPLETED',
                // Repassa o objeto estruturado idêntico ao que foi salvo no Neon DB
                payload: payloadIA
            };
        }

        return { success: true, status: 'LOADING' };
    } catch (error) {
        console.error("🔴 Erro no Polling Server-Side:", error);
        return { success: false, status: 'ERROR', error: error.message };
    }
}

const parseMarcadores = (texto) => {
    // Objeto de mapeamento: CHAVE_NO_PROMPT : CHAVE_NO_OBJETO_FINAL
    const marcadores = {
        'RESUMO': 'resumo',
        'ESTRATEGIA': 'estrategia',
        'PERFORMANCE': 'performance',
        'PROJECAO': 'projecao',
        'BACKTEST': 'backtest',
        'RISCOS': 'riscos',
        'RECOMENDACAO': 'recomendacao',
        'ACAO_SUGERIDA': 'acaoSugerida',
        'TEMPERATURA_SAUDE': 'temperaturaSaude',
        'VISAO_SETORIAL_5ANOS': 'visaoSetorial5Anos'
    };
    
    const resultado = {};
    
    // CORREÇÃO: Usamos Object.keys() para percorrer as chaves do objeto
    Object.keys(marcadores).forEach(m => {
        const chaveFinal = marcadores[m];
        const regex = new RegExp(`###${m}###([\\s\\S]*?)(?=###|$)`, 'i');
        const match = texto.match(regex);
        resultado[chaveFinal] = match ? match[1].trim() : "Informação indisponível";
    });
    
    return resultado;
};



export async function testarSincronizacaoAtivos() {
    try {
        console.log("🛠️ [DIAGNÓSTICO] Iniciando teste de sincronização...");
        await sincronizarTodosOsMercados();
        return { success: true, message: "Sincronização executada com sucesso!" };
    } catch (error) {
        console.error("❌ [DIAGNÓSTICO] Erro na sincronização:", error);
        return { success: false, error: error.message };
    }
}

export async function getTickersAction(segmento) {
    try {
        console.log(`🔍 [ACTION] Buscando ativos para o segmento: ${segmento}`);
        const resultado = await getMarketTickersBySegment(segmento);
        return resultado;
    } catch (error) {
        console.error("❌ [ACTION] Erro ao buscar tickers:", error);
        return { success: false, tickers: [] };
    }
}

// ==========================================================================
// 🚀 INJECT KAIZEN: ESTEIRA ASSÍNCRONA ANTI-TIMEOUT (PASSO 1 & 2)
// ==========================================================================

/**
 * PASSO 1: O Rastreador Macro/Político
 * Vai exclusivamente na internet coletar o cenário de fundo e notícias dos últimos 20 dias.
 * Executa de forma isolada, responde rápido e desliga o servidor.
 */
export async function rastrearCenarioMacroAction(ativoCompilado, tipoOperacao) {
    try {
        const promptRastreador = `
Você é o Rastreador Macro do motor Phronesis da Ex Nihilo.
Ativo/Par: ${ativoCompilado}
Tipo de Operação: ${tipoOperacao}

🚀 PROTOCOLO DE PESQUISA EM TEMPO REAL:
1. Faça uma varredura na internet para mapear notícias, cotação atual e fatos macroeconômicos recentes dos últimos 5 a 20 dias do ativo ${ativoCompilado}.
2. Traga apenas fatos descritivos e métricas relevantes do cenário.

REGRA DE SAÍDA:
Retorne um resumo direto de até 3 parágrafos sem usar negrito (**).
`;

        const resultado = await quantumQuery({
            operation: "PHRONESIS_QUANTUM_ANALYSIS",
            params: { payloadRequestBody: { contents: [{ role: "user", parts: [{ text: promptRastreador }] }] } }
        });

        if (!resultado.success) throw new Error(resultado.error);
        return { success: true, cenarioMacro: String(resultado.payload || "").trim() };

    } catch (error) {
        console.error("❌ ERRO NO RASTREADOR MACRO:", error);
        return { success: false, error: "Falha ao rastrear cenário web." };
    }
}

/**
 * PASSO 2: O Engenheiro Quantitativo (Refatorado)
 * Recebe o cenário descritivo pronto do navegador. Não usa internet.
 * Faz matemática e precificação pura na velocidade da luz (2 segundos).
 */
export async function gerarEngenhariaOperacaoAction(dadosOperacao, cenarioMacroPronto = null) {
    try {
        const userId = Number(dadosOperacao.userId) || 1;
        const tipoOpUpper = (dadosOperacao.tipoOperacao || "").toUpperCase();
        const ehLongShort = tipoOpUpper.includes("LONG") || tipoOpUpper.includes("ARBITRAGEM");
        const ativoCompilado = dadosOperacao.ativo2 
            ? `${dadosOperacao.symbol} x ${dadosOperacao.ativo2}` 
            : dadosOperacao.symbol;

        // 💡 CHECAGEM DA CHAVE KAIZEN
        const usarKaizen = dadosOperacao.consultarHistoricoAtivo || dadosOperacao.consultarHistorico;
        let contextoUltimoErroKaizen = "Nenhuma vacina ou restrição da Escada Kaizen aplicada.";

        // 🧠 SE A CHAVE ESTIVER LIGADA: BUSCA A ÚLTIMA VACINA NA TABELA DE CAUSALIDADES (CYCLE_CAUSALITIES)
if (usarKaizen) {
    try {
        const [ultimaVacina] = await db.select()
            .from(cycleCausalities)
            .where(eq(cycleCausalities.userId, userId))
            .orderBy(desc(cycleCausalities.createdAt))
            .limit(1);

        if (ultimaVacina) {
            contextoUltimoErroKaizen = `VACINA KAIZEN ATIVA (MEMÓRIA DE CAUSALIDADE):
            - Regime de Mercado Alvo: ${ultimaVacina.regimeAlvo}
            - Vulnerabilidade Mapeada: "${ultimaVacina.vulnerabilidade}"
            - REGRA COMPULSÓRIA DA VACINA: "${ultimaVacina.vacinaSugerida}"`;
        } else {
            contextoUltimoErroKaizen = "MEMÓRIA KAIZEN LIMPA: Nenhuma vacina/causalidade registrada ainda no banco.";
        }
    } catch (dbErr) {
        console.error("⚠️ Erro ao consultar tabela cycle_causalities no Neon:", dbErr);
    }
}

        const promptMatematico = `
Você é o engenheiro quantitativo Phronesis. Calcule os alvos operacionais com base no cenário fornecido.

[ATENÇÃO]: NÃO use busca na web neste passo. Faça os cálculos apenas em memória.

CENÁRIO WEB RECEBIDO DO RASTREADOR:
${cenarioMacroPronto ? cenarioMacroPronto : "Utilizar métricas operacionais padrão."}

PARÂMETROS DA MESA:
- Ativo: ${ativoCompilado}
- Capital: R$ ${dadosOperacao.investimento}
- Tipo: ${dadosOperacao.tipoOperacao}
- Alavancagem: ${dadosOperacao.alavancagem}
- Protocolo Kaizen: ${contextoUltimoErroKaizen}

REGRA DE SAÍDA OBRIGATÓRIA (ESTRUTURA DE LINHAS NUMERADAS):
Responda EXATAMENTE linha por linha. NÃO use asteriscos (**), NÃO use textos adicionais antes ou depois.

1. PREÇO ATUAL: [somente o valor numérico]
2. PROBABILIDADE: [somente o valor numérico de 0 a 100]
3. ENTRADA: [somente o valor numérico]
4. ALVO: [somente o valor numérico]
5. STOP: [somente o valor numérico]
6. PARECER_TECNICO: [resumo de 1 frase da tese]
7. ESTRATEGIA: [detalhamento do gerenciamento de risco, tese e vacina aplicada]
${ehLongShort ? `8. SHORT_ENTRADA: [somente o valor numérico]
9. SHORT_ALVO: [somente o valor numérico]
10. SHORT_STOP: [somente o valor numérico]` : ''}


###STRATEGY###
[Texto detalhado da estratégia e gerenciamento de risco]
`;

        const resultado = await quantumQuery({
            operation: "PHRONESIS_QUANTUM_ANALYSIS",
            params: { payloadRequestBody: { contents: [{ role: "user", parts: [{ text: promptMatematico }] }] } }
        });

        if (!resultado.success) throw new Error(resultado.error);

        // Remove asteriscos para evitar ruídos de formatação
        const output = String(resultado.payload || "").replace(/\*\*/g, "").trim();

        // PARSER 100% PADRONIZADO POR LINHAS NUMERADAS
const extrairPorLinhas = (textoCompleto) => {
    const linhas = textoCompleto.split('\n').map(l => l.trim());

    // Auxiliar para valores numéricos e de preço
    const pegarLinha = (prefixo) => {
        const achou = linhas.find(l => l.toUpperCase().startsWith(prefixo.toUpperCase()));
        if (!achou) return "0";
        const partes = achou.split(':');
        if (partes.length < 2) return "0";
        return partes[1].trim().replace(/[^\d.,]/g, '').replace(',', '.') || "0";
    };

    // 💡 Auxiliar para textos longos (Parecer Técnico e Estratégia)
    const pegarTextoPorLinha = (prefixo, valorPadrao = "") => {
        const achou = linhas.find(l => l.toUpperCase().startsWith(prefixo.toUpperCase()));
        return achou ? achou.split(':').slice(1).join(':').trim() : valorPadrao;
    };

    return {
        currentPrice: pegarLinha("1. PREÇO ATUAL:"),
        winRate: pegarLinha("2. PROBABILIDADE:").replace(/\D/g, '') || "0",
        entryPrice: pegarLinha("3. ENTRADA:"),
        targetPrice: pegarLinha("4. ALVO:"),
        stopPrice: pegarLinha("5. STOP:"),
        technicalSummary: pegarTextoPorLinha("6. PARECER_TECNICO:", "Análise concluída."),
        strategy: pegarTextoPorLinha("7. ESTRATEGIA:", "Plano operacional calibrado de acordo com a assimetria do ativo."),
        shortEntryPrice: pegarLinha("8. SHORT_ENTRADA:"),
        shortTargetPrice: pegarLinha("9. SHORT_ALVO:"),
        shortStopPrice: pegarLinha("10. SHORT_STOP:")
    };
};

        const payload = extrairPorLinhas(output);
        let analysisId = "temp-" + Date.now();

        // Grava no banco a simulação rascunho
        try {
            const [novaSimulacao] = await db.insert(simulations).values({
                userId: Number(userId),
                ativo1: dadosOperacao.symbol,
                ativo2: dadosOperacao.ativo2 || null,
                winRate: payload.winRate,
                technicalSummary: payload.technicalSummary,
                strategy: payload.strategy,
                marketPriceAtAnalysis: payload.currentPrice,
                entryPrice: payload.entryPrice,
                targetPrice: payload.targetPrice,
                stopPrice: payload.stopPrice,
                shortEntryPrice: payload.shortEntryPrice,
                shortTargetPrice: payload.shortTargetPrice,
                shortStopPrice: payload.shortStopPrice,
                status: 'draft'
            }).returning({ id: simulations.id });
            
            analysisId = novaSimulacao.id.toString();
        } catch (dbError) {
            console.error("❌ ERRO AO REGISTRAR RASCUNHO SIMULATION:", dbError);
        }

        return { success: true, analysisId, payload };

    } catch (error) {
        console.error("❌ ERRO NA ENGENHARIA QUANTITATIVA:", error);
        return { success: false, error: "Falha ao calcular métricas." };
    }
}


export async function getMarketPriceAction(symbol) {
    try {
        const resultado = await executeQuantumQuery({
            operation: "NEXUS_B3_QUOTE",
            params: { symbol }
        });
        
        return resultado; // Retorna { success: true, price: 44.74 } ou { success: false, error: ... }
    } catch (error) {
        console.error("❌ Erro ao buscar preço via QuantumQuery:", error);
        return { success: false, error: error.message };
    }
}

// src/app/actions.js

// 🚀 1. GATILHO ASSÍNCRONO: Cria o Job e responde em milissegundos para destravar a tela
// ⚡ MICRO AÇÃO NO SERVIDOR: Garante o parse numérico do operador logado
export async function iniciarValidacaoEstrategiaAction(userId, params) {
    try {
        // Força a conversão para número puro para bater com a coluna da tabela do Neon
        const numericUserId = userId ? Number(userId) : null;
        
        if (!numericUserId || isNaN(numericUserId)) {
            console.error("🚨 [VALIDADOR] Rejeitado: ID do operador inválido ou nulo:", userId);
            return { 
                success: false, 
                error: "Usuário não identificado." 
            };
        }

        console.log(`🛰️ [VALIDADOR] Criando Job seguro para o User ID: ${numericUserId}...`);

        // Insere na tabela temporária vinculando o ID real do usuário logado
        const [job] = await db.insert(analysisRequests).values({
            userId: numericUserId,
            assetCode: (params.symbol || "VALIDATION").toUpperCase(),
            status: 'PENDING',
            createdAt: new Date()
        }).returning({ id: analysisRequests.id });

        // Dispara o background desprendido repassando o ID do Job criado
        Promise.resolve(processarValidacaoBackground(job.id, params))
            .catch(err => console.error("🚨 FALHA CRÍTICA NO BACKGROUND DO VALIDADOR:", err));

        return { success: true, jobId: job.id };

    } catch (error) {
        console.error("❌ ERRO NO GATILHO DO VALIDADOR:", error);
        return { success: false, error: error.message };
    }
}

// 🧠 2. MOTOR EM BACKGROUND ISOLADO: Processa a IA e salva o veredito estruturado
// src/app/actions.js

/**
 * PASSO 3: O AUDITOR KAIZEN (Motor de Validação e Re-calibragem)
 * Analisa friamente se a estratégia é favorável. Se for ruim, ele calcula
 * e devolve uma nova entrada, stop e alvo condizentes, mudando o destino da boleta.
 */
async function processarValidacaoBackground(jobId, params) {
    try {
        const { symbol, currentPrice, entryPrice, targetPrice, stopPrice, originalStrategy, winRate } = params;

        const promptValidacaoInteligente = `
Você é o Auditor e Otimizador de Riscos Quânticos do motor Phronesis.
Sua missão é auditar a ordem esculpida no terminal e otimizá-la estatisticamente.

DADOS DA OPERAÇÃO MONTADA NA BOLETA:
- Ativo: ${symbol}
- Preço de Mercado Atual: R$ ${currentPrice}
- Ponto de Entrada Proposto: R$ ${entryPrice}
- Alvo (Take Profit) Proposto: R$ ${targetPrice}
- Stop Loss Proposto: R$ ${stopPrice}
- Win Rate Estimado Atual: ${winRate}%
- Tese Contextual: "${originalStrategy}"

DIRETRIZ DE ENGENHARIA E VALIDAÇÃO:
1. Analise o Win Rate e a assimetria risco/retorno atual.
2. Se a operação for favorável e com boa probabilidade: classifique como VIÁVEL e confirme ou ajuste levemente a estrutura.
3. Se a operação tiver risco alto ou win rate insatisfatório, mas puder ser salva: RECALIBRE A ESTRUTURA! Forneça um NOVO ponto de entrada (ex: aguardar pullback), NOVO alvo e NOVO stop loss, ou sugira mudança tática (ex: reversão à média).
4. Se mesmo ajustando a geometria o win rate continuar fraco e desfavorável: classifique como INVIÁVEL e recomende o descarte da operação ou troca de ativo.

FORMATO RIGOROSO DE SAÍDA (RESPOSTA DIRETA SEM NEGRITO):

###VERDICT###
[VIÁVEL, AJUSTADO ou INVIÁVEL]

###VALIDATION_SUMMARY###
[Sua análise objetiva. Exemplo se ajustado: 'Operação recalibrada. Nova entrada sugerida em R$ XX.XX, Alvo em R$ XX.XX e Stop em R$ XX.XX (Winrate estimado elevado para XX%).']
`;

        const resultado = await quantumQuery({
            operation: "PHRONESIS_QUANTUM_ANALYSIS",
            params: { payloadRequestBody: { contents: [{ role: "user", parts: [{ text: promptValidacaoInteligente }] }] } }
        });

        if (!resultado.success) throw new Error(resultado.error);

        const output = String(resultado.payload || "").replace(/\*\*/g, "").trim();

        // PARSER TOLERANTE A FALHAS (Extrai via Regex flexível ou linhas)
        const extrairMarcador = (tag, texto) => {
            const regex = new RegExp(`###${tag}###([\\s\\S]*?)(?=###|$)`, 'i');
            const match = texto.match(regex);
            if (match && match[1].trim()) return match[1].trim();

            // Fallback: Procura por linhas do tipo "VERDICT: VIÁVEL"
            const linha = texto.split('\n').find(l => l.toUpperCase().includes(tag.toUpperCase()));
            if (linha) {
                const partes = linha.split(':');
                if (partes.length > 1) return partes.slice(1).join(':').trim();
            }
            return null;
        };

        let veredito = extrairMarcador('VERDICT', output) || 'AJUSTADO';
        let resumo = extrairMarcador('VALIDATION_SUMMARY', output) || output;

        // Normalização do veredito
        const upperVeredito = veredito.toUpperCase();
        if (upperVeredito.includes('INVIÁVEL') || upperVeredito.includes('INVIAVEL')) {
            veredito = 'INVIÁVEL';
        } else if (upperVeredito.includes('VIÁVEL') || upperVeredito.includes('VIAVEL')) {
            veredito = 'VIÁVEL';
        } else {
            veredito = 'AJUSTADO';
        }

        const dadosValidados = {
            verdict: veredito,
            validationSummary: resumo
        };

        // Grava o payload final purificado no banco temporário para o modal ler via Polling
        await db.update(analysisRequests)
            .set({
                aiSummary: JSON.stringify(dadosValidados),
                status: 'COMPLETED'
            })
            .where(eq(analysisRequests.id, jobId));

        console.log(`🟢 [AUDITOR KAIZEN] Job #${jobId} concluído com sucesso com Veredito: ${veredito}`);

    } catch (error) {
        console.error("❌ FALHA NO PROCESSAMENTO DO AUDITOR KAIZEN:", error);
        await db.update(analysisRequests)
            .set({ status: 'ERROR' })
            .where(eq(analysisRequests.id, jobId));
    }
}

/**
 * SERVER ACTION: Maestro de Projeções do Terminal
 * Intercepta os dados da mesa e roda a matriz matemática de risco no servidor.
 */
export async function calcularProjecoesAction(payload) {
    try {
        // Repassa o payload diretamente para a biblioteca protegida
        const resultado = calcularProjecoesFinanceiras(payload);
        return resultado;
    } catch (error) {
        console.error("🔴 Falha na Server Action de projeção:", error);
        return { success: false, error: "Erro de processamento no servidor." };
    }
}

// src/app/actions.js

// 🚀 1. GATILHO INICIAL ASSÍNCRONO: Libera o frontend em milissegundos
export async function iniciarDiretrizEstrategistaAction(userId) {
    try {
        if (!userId) return { success: false, error: "Usuário não identificado." };

        // Cria o Job na tabela de monitoramento temporário
        const [job] = await db.insert(analysisRequests).values({
            userId: Number(userId),
            assetCode: "MACRO_STRATEGY", // Identificador genérico para relatórios globais
            status: "loading",
            aiSummary: null
        }).returning({ id: analysisRequests.id });

        console.log(`🛰️ [ESTRATEGISTA] Job #${job.id} gerado. Disparando processamento Kaizen assíncrono...`);

        // Dispara o motor de background pesado desprendido (Sem await)
        Promise.resolve(processarDiretrizBackground(job.id, Number(userId)))
            .catch(err => console.error("🚨 FALHA NO SEGUNDO PLANO DO ESTRATEGISTA:", err));

        // Resposta instantânea anti-timeout
        return { success: true, jobId: job.id };

    } catch (error) {
        console.error("🔴 Erro ao disparar canal do estrategista:", error);
        return { success: false, error: error.message };
    }
}

// 🚀 Salvar relatório do estrategista chefe
export async function salvarRelatorioEstrategistaAction(userId, jobId) {
    try {
        if (!userId || !jobId) return { success: false, error: "Parâmetros em falta." };

        // 1. Puxa o Job temporário concluído pela IA em background
        const [job] = await db.select()
            .from(analysisRequests)
            .where(eq(analysisRequests.id, Number(jobId)));

        if (!job || !job.aiSummary) {
            return { success: false, error: "Dados da diretriz não localizados." };
        }

        const payloadEstrategista = JSON.parse(job.aiSummary);

        // 2. Incremento automático estável do degrau Kaizen (Ciclo Alvo)
        const [ultimoRelatorio] = await db.select()
            .from(chiefStrategistReports)
            .where(eq(chiefStrategistReports.userId, Number(userId)))
            .orderBy(desc(chiefStrategistReports.createdAt))
            .limit(1);

        const proximoCicloAlvo = ultimoRelatorio ? (Number(ultimoRelatorio.cicloAlvo) + 1) : 1;

        // 3. PERSISTÊNCIA DEFINITIVA NO NEON DB
        const [novoRelatorioGravado] = await db.insert(chiefStrategistReports).values({
            userId: Number(userId),
            cicloAlvo: proximoCicloAlvo,
            diagnosticoRegime: payloadEstrategista.diagnosticoRegime,
            vulnerabilidadesBloqueadas: payloadEstrategista.vulnerabilidadesBloqueadas,
            calibragemRisco: payloadEstrategista.calibragemRisco,
            diretrizOperacional: payloadEstrategista.diretrizOperacional
        }).returning({ id: chiefStrategistReports.id });

        // 4. ALIMENTAÇÃO DA BIBLIOTECA DE VACINAS (cycle_causalities)
        // Busca a última falha para indexar a vacina
        const [ultimaFalha] = await db.select()
            .from(operations)
            .where(and(eq(operations.userId, Number(userId)), eq(operations.status, 'loss')))
            .orderBy(desc(operations.createdAt))
            .limit(1);

        if (ultimaFalha) {
    // Passa a leitura do regime completa sem travas de substring
    const regimeFormatado = String(payloadEstrategista.diagnosticoRegime || "CONSOLIDACAO_BAIXA_VOLATILIDADE").trim();

    await db.insert(cycleCausalities).values({
        userId: Number(userId),
        regimeAlvo: regimeFormatado,
        vulnerabilidade: `Repetir a falha da linha ${ultimaFalha.id} no ativo ${ultimaFalha.asset}`,
        vacinaSugerida: payloadEstrategista.vulnerabilidadesBloqueadas,
        createdAt: new Date()
    });
}

        console.log(`💾 [KAIZEN OFICIAL] Relatório #${novoRelatorioGravado.id} consolidado via Polling.`);

        return {
            success: true,
            reportId: novoRelatorioGravado.id,
            ciclo: proximoCicloAlvo,
            payload: payloadEstrategista
        };

    } catch (error) {
        console.error("❌ Erro ao consolidar relatório definitivo do estrategista:", error);
        return { success: false, error: "Falha ao gravar relatório oficial." };
    }
}

// 🧠 2. MOTOR EM BACKGROUND DESPRENDIDO: Executa e grava na fila temporária quando terminar
async function processarDiretrizBackground(jobId, userId) {
    try {
        // ──> 1. COMPACTAÇÃO DA MEMÓRIA HISTÓRICA (A Escada Cumulativa)
        const bibliotecaVacinas = await db.select()
            .from(cycleCausalities)
            .where(eq(cycleCausalities.userId, userId))
            .orderBy(desc(cycleCausalities.createdAt))
            .limit(15);

        const textoImunidadeLongoPrazo = bibliotecaVacinas.map((v, i) => 
            `• [Vulnerabilidade #${v.id}]: No regime ${v.regimeAlvo}, evitar ${v.vulnerabilidade} -> Regra: ${v.vacinaSugerida}`
        ).join('\n') || "Nenhuma vacina de longo prazo catalogada ainda.";

        // ──> 2. AUTÓPSIA DO PASSO IMEDIATO (O Erro da Última Linha)
        const [ultimaFalha] = await db.select()
            .from(operations)
            .where(and(eq(operations.userId, userId), eq(operations.status, 'loss')))
            .orderBy(desc(operations.createdAt))
            .limit(1);

        const textoUltimoErroImediato = ultimaFalha 
            ? `ID_LINHA: ${ultimaFalha.id} | Ativo: ${ultimaFalha.asset} | Tese que falhou: ${ultimaFalha.strategy || "Não descrita"}`
            : "Nenhum erro recente registrado no histórico.";

        const prompt = `
Você é o Estrategista Chefe do motor Phronesis da Ex Nihilo. Sua missão é emitir diretrizes de risco para o PRÓXIMO CICLO OPERACIONAL atuando através de uma Escada Kaizen. Você deve consolidar a imunidade atual sem gerar relatórios extensos.

BIBLIOTECA DE VULNERABILIDADES HISTÓRICAS (MEMÓRIA CUMULATIVA):
${textoImunidadeLongoPrazo}

AUTÓPSIA DO ÚLTIMO ERRO IMEDIATO:
${textoUltimoErroImediato}

DIRETRIZES DE COMPORTAMENTO CRÚCIAIS:
1. ANÁLISE DE REGIME COGNITIVO: Identifique o regime de mercado de hoje de forma holística e abrangente (Ex: CONSOLIDACAO_BAIXA_VOLATILIDADE, TENDENCIA_ALTA_VOLATILIDADE).
2. FILTRO DE EXCLUSÃO: O bloco VULNERABILIDADES_BLOQUEADAS deve citar de forma ultra-lacônica como o regime de hoje aciona as vacinas históricas da biblioteca E o último erro imediato, travando o comportamento destrutivo de forma cumulativa.
3. SEM NEGRITO: Não use marcações em negrito (**) dentro dos delimitadores. Máximo de 2 a 3 frases por bloco.

REGRA DE SAÍDA (OBRIGATÓRIA):
###DIAGNOSTICO_REGIME###
[Definição objetiva do regime de mercado atual.]

###VULNERABILIDADES_BLOQUEADAS###
[A imunidade do ciclo. Como você barrou as falhas da memória cumulativa e o erro imediato frente ao cenário de hoje.]

###CALIBRAGEM_RISCO###
[Stop Máximo por trade, Alvo de assimetria mínimo exigido e dimensionamento de lote frente ao capital.]

###DIRETRIZ_OPERACIONAL###
[A tese mestra de posicionamento e conduta para o início do novo ciclo.]
`;

        let resultado = null;
        for (let t = 1; t <= 2; t++) {
            resultado = await quantumQuery({
                operation: "PHRONESIS_QUANTUM_ANALYSIS",
                params: { payloadRequestBody: { contents: [{ role: "user", parts: [{ text: prompt }] }] } }
            });
            if (resultado && resultado.success) break;
            if (t === 2) throw new Error(resultado?.error || "Falha na query quântica.");
            await new Promise(r => setTimeout(r, 2000));
        }

        const output = String(resultado.payload || "").trim();

        const extrairBloco = (marcador) => {
            const regex = new RegExp(`###${marcador}###([\\s\\S]*?)(?=###|$)`, 'i');
            const match = output.match(regex);
            return match ? match[1].trim() : "Dados indisponíveis para este campo técnico.";
        };

        const payloadEstrategista = {
            diagnosticoRegime: extrairBloco('DIAGNOSTICO_REGIME'),
            vulnerabilidadesBloqueadas: extrairBloco('VULNERABILIDADES_BLOQUEADAS'),
            calibragemRisco: extrairBloco('CALIBRAGEM_RISCO'),
            diretrizOperacional: extrairBloco('DIRETRIZ_OPERACIONAL')
        };

        if (payloadEstrategista.calibragemRisco.toUpperCase().includes("SEM STOP") || payloadEstrategista.calibragemRisco.length < 5) {
            payloadEstrategista.calibragemRisco = "TRAVA DA MESA: Stop-loss compulsório fixado em no máximo 2.5% por operação. Position sizing máximo de 10% por spread.";
        }

        // Salva os dados brutos na tabela temporária e muda o status para COMPLETED
        await db.update(analysisRequests)
            .set({
                aiSummary: JSON.stringify(payloadEstrategista),
                status: 'COMPLETED'
            })
            .where(eq(analysisRequests.id, jobId));

        console.log(`🟢 [BACKGROUND ESTRATEGISTA] Job #${jobId} concluído com sucesso e persistido na fila.`);

    } catch (error) {
        console.error("❌ FALHA CRÍTICA NO BACKGROUND DO ESTRATEGISTA:", error);
        await db.update(analysisRequests)
            .set({ status: 'ERROR' })
            .where(eq(analysisRequests.id, jobId));
    }
}

// src/app/actions.js

// ──> ACTION 1: HOMOLOGAR ANÁLISE (DEFENSIVA E RESILIENTE AO TEMPO)
export async function salvarAnaliseEmSimulationsAction(jobId, dadosOrigem) {
    try {
        const userIdResolvido = Number(dadosOrigem.userId) || 1;

        // 1. Tenta buscar no banco temporário se o jobId for numérico e válido
        let payloadIA = {};
        if (jobId && !String(jobId).startsWith("temp-")) {
            try {
                const [registroAnalysis] = await db.select()
                    .from(analysisRequests)
                    .where(eq(analysisRequests.id, Number(jobId)));

                if (registroAnalysis && registroAnalysis.aiSummary) {
                    payloadIA = typeof registroAnalysis.aiSummary === 'string'
                        ? JSON.parse(registroAnalysis.aiSummary)
                        : registroAnalysis.aiSummary;
                    
                    // Limpa a fila temporária após resgatar
                    await db.delete(analysisRequests).where(eq(analysisRequests.id, Number(jobId)));
                }
            } catch (errDb) {
                console.warn("⚠️ Registro temporário não localizado. Usando payload direto do modal:", errDb);
            }
        }

        console.log("📝 [SERVER ACTION] SALVANDO OPERAÇÃO NO TERMINAL...");

        // 2. INSERÇÃO DEFINITIVA (Prioriza os dados que estão visíveis na tela do operador)
        const [novaSimulacao] = await db.insert(simulations).values({
            userId: userIdResolvido,
            tipoOperacao: dadosOrigem.tipoOperacao || "Day Trade",
            segmento: dadosOrigem.segmento || "Ações",
            ativo1: dadosOrigem.ativo1 || "ATIVO",
            ativo2: dadosOrigem.ativo2 || null,
            investimento: dadosOrigem.investimento || "0,00",
            alavancagem: dadosOrigem.alavancagem || "1x",
            prazoValor: dadosOrigem.prazoValor || "1",
            prazoUnidade: dadosOrigem.prazoUnidade || "Dias",
            
            // Dados de preços reativos vindos da tela do operador
            entryPrice: String(dadosOrigem.entryPrice || "0"),
            targetPrice: String(dadosOrigem.targetPrice || "0"),
            stopPrice: String(dadosOrigem.stopPrice || "0"),
            marketPriceAtAnalysis: String(dadosOrigem.marketPriceAtAnalysis || dadosOrigem.entryPrice || "0"),

            // Sincroniza métricas e textos da tela
            winRate: String(dadosOrigem.winRate || "0"),
            technicalSummary: dadosOrigem.technicalSummary || payloadIA.technicalSummary || "Análise concluída.",
            strategy: dadosOrigem.strategy || payloadIA.strategy || "Estratégia salva no terminal.",
            
            // Grava os percentuais e valores nominais reativos das projeções
            stopPercent: String(dadosOrigem.stopPercent || "0"),
            alvoPercent: String(dadosOrigem.alvoPercent || "0"),
            projectedGainAmount: String(dadosOrigem.projectedGainAmount || "0"),
            projectedLossAmount: String(dadosOrigem.projectedLossAmount || "0"),
            
            // Nasce como confirmado definitivo para o histórico
            status: "confirmed" 
        }).returning({ id: simulations.id });

        console.log(`💾 [FLUXO FINALIZADO] Registro definitivo criado em Simulations ID #${novaSimulacao.id}`);
        return { success: true, simulationId: novaSimulacao.id };

    } catch (error) {
        console.error("❌ Erro ao criar registro definitivo na tabela simulations:", error);
        return { success: false, error: error.message };
    }
}

// ──> ACTION 2: DESCARTAR ANÁLISE (LIMPA A TABELA SEM SALVAR)
export async function descartarAnaliseTemporariaAction(jobId) {
    try {
        if (!jobId) return { success: true }; // Retorno silencioso se não houver ID válido

        // Deleta o registro temporário limpando o rastro no banco
        await db.delete(analysisRequests).where(eq(analysisRequests.id, Number(jobId)));
        
        console.log(`🗑️ [DESCARTE KAIZEN] Registro temporário da análise #${jobId} limpo com sucesso.`);
        return { success: true };
    } catch (error) {
        console.error("❌ Erro ao descartar análise temporária:", error);
        return { success: false, error: error.message };
    }
}

export async function dispararAnaliseAssincrona(userId, assetCode, filesData, customDirective, dadosOperacao, considerarEstrategista = false) {
    try {
        console.log("🔵 [GATILHO] Validando credenciais de Tenant para o ID:", userId);
        
        // 🛡️ TRAVA MULTI-TENANT REAL: Sem ID válido, o processo morre imediatamente na entrada
        const numericUserId = userId ? Number(userId) : null;
        if (!numericUserId || isNaN(numericUserId)) {
            console.error("🚨 [VIOLAÇÃO DE SEGURANÇA] Tentativa de geração de análise bloqueada: ID de usuário inválido ou nulo.");
            return { 
                success: false, 
                error: "Acesso Negado: Sessão de usuário não identificada ou inválida. Operação abortada por segurança." 
            };
        }

        console.log(`🔵 [GATILHO] Criando Job seguro no banco para o User ID: ${numericUserId}...`);
        const [job] = await db.insert(analysisRequests).values({
            userId: numericUserId,
            assetCode,
            status: 'PENDING',
            createdAt: new Date()
        }).returning({ id: analysisRequests.id });

        // Garante que o contexto operacional carregue o ID autenticado e verificado
        if (dadosOperacao) {
            dadosOperacao.userId = numericUserId;
        }

        // Passa o ID estritamente verificado para o background
        Promise.resolve(processarAnaliseEmBackground(job.id, assetCode, filesData, customDirective, dadosOperacao, considerarEstrategista))
            .catch(err => console.error("🚨 FALHA CRÍTICA NO BACKGROUND:", err));

        return { success: true, jobId: job.id };
    } catch (error) {
        console.error("❌ ERRO NO GATILHO ASSÍNCRONO:", error);
        return { success: false, error: error.message };
    }
}

async function processarAnaliseEmBackground(jobId, assetCode, filesData, customDirective, dadosOperacao, considerarEstrategista = false) {
    try {
        console.log(`💡 [BACKGROUND ANALYST STATION] Processando Análise Fundamentalista Job #${jobId} para ${assetCode}...`);
        
        const simboloAtivo = (assetCode || "ATIVO").toUpperCase();

        // PROMPT COM AS CHAVES EXATAS DO DASHBOARD MODAL
        const promptFundamentalista = `
Você é o Analista Fundamentalista Sênior do motor Phronesis.
Sua missão é acelerar o estudo do ativo ${simboloAtivo} fornecendo uma radiografia executiva sintetizada.

ATIVO EM ESTUDO: ${simboloAtivo}
DIRETRIZ CUSTOMIZADA: "${customDirective || "Análise fundamentalista completa focando em valor, dividendos e riscos."}"

DIRETRIZ DE CONCISÃO: 
Seja direto e objetivo. Escreva resumos densos porém concisos de no máximo 2 parágrafos curtos por bloco para não estourar o layout da mesa.

REGRA DE SAÍDA (OBRIGATÓRIA):

###RESUMO###
[Visão executiva do ativo e tese principal]

###ESTRATEGIA###
[Posicionamento recomendado, dividendos e diferenciais]

###PERFORMANCE###
[Métricas de desempenho recente, DPA, cotação e múltiplos atuais]

###PROJECAO###
[Projeção de curto prazo e catalisadores de valorização]

###VISAO_SETORIAL_5ANOS###
[Tendência do setor do ativo para os próximos 5 anos]

###RISCOS###
[Principais vulnerabilidades, concorrência e riscos macro/fiscais]

###ACAO_SUGERIDA###
[COMPRA, MANTER, AGUARDAR ou VENDA]

###TEMPERATURA_SAUDE###
[Valor numérico de 0 a 100 indicando a nota de saúde do ativo]
`;

        const resultado = await quantumQuery({
            operation: "PHRONESIS_QUANTUM_ANALYSIS",
            params: { payloadRequestBody: { contents: [{ role: "user", parts: [{ text: promptFundamentalista }] }] } }
        });

        if (!resultado.success) throw new Error(resultado.error);

        const output = String(resultado.payload || "").replace(/\*\*/g, "").trim();

        const extrairBloco = (marcador) => {
            const regex = new RegExp(`###${marcador}###([\\s\\S]*?)(?=###|$)`, 'i');
            const match = output.match(regex);
            return match ? match[1].trim() : "Informação indisponível.";
        };

        // MONTA O PAYLOAD 100% ALINHADO COM O DASHBOARD MODAL
        const payloadIA = {
            resumo: extrairBloco('RESUMO'),
            estrategia: extrairBloco('ESTRATEGIA'),
            performance: extrairBloco('PERFORMANCE'),
            projecao: extrairBloco('PROJECAO'),
            visaoSetorial5Anos: extrairBloco('VISAO_SETORIAL_5ANOS'),
            riscos: extrairBloco('RISCOS'),
            acaoSugerida: extrairBloco('ACAO_SUGERIDA'),
            temperaturaSaude: extrairBloco('TEMPERATURA_SAUDE')
        };

        // PERSISTÊNCIA NA TABELA ANÁLYSIS_REQUESTS (PERMANENTE NO HISTÓRICO)
        await db.update(analysisRequests)
            .set({ 
                aiSummary: JSON.stringify(payloadIA), 
                status: 'COMPLETED' 
            })
            .where(eq(analysisRequests.id, jobId));
            
        console.log(`💾 [ANALYSIS_REQUESTS] Análise fundamentalista de ${simboloAtivo} (Job #${jobId}) gravada com sucesso no Neon DB.`);

    } catch (err) {
        console.error("❌ Erro no processamento fundamentalista em background:", err);
        try {
            await db.update(analysisRequests)
                .set({ status: 'ERROR' })
                .where(eq(analysisRequests.id, jobId));
        } catch (dbErr) {
            console.error("🚨 Falha ao salvar status de erro no Neon DB:", dbErr);
        }
    }
}

// src/app/actions.js

export async function getChiefStrategistReportsAction(userId) {
  try {
    const numericUserId = Number(userId);
    if (!numericUserId || isNaN(numericUserId)) {
      return { success: false, reports: [], error: "ID de usuário inválido." };
    }

    const reports = await db
      .select()
      .from(chiefStrategistReports)
      .where(eq(chiefStrategistReports.userId, numericUserId))
      .orderBy(desc(chiefStrategistReports.createdAt));

    // Sanitiza e purifica o retorno para consumo no Client Component
    return { success: true, reports: JSON.parse(JSON.stringify(reports)) };
  } catch (error) {
    console.error("❌ Erro em getChiefStrategistReportsAction:", error);
    return { success: false, reports: [], error: error.message };
  }
}