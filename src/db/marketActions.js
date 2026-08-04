import { db } from './db';
import { marketTickers } from './schema';
import { eq, and } from 'drizzle-orm';
import { GoogleGenAI } from "@google/genai"; // Padrão moderno do SDK

// =========================================================================
// 💡 BUSCA DE TICKERS LOCAIS NO BANCO NEON (Drizzle ORM)
// =========================================================================
export async function getMarketTickersBySegment(segmento) {
    try {
        if (!segmento) return { success: false, tickers: [] };

        // Busca direto no Neon filtrando pelo segmento selecionado e apenas ativos ativos
        const data = await db
            .select({
                symbol: marketTickers.symbol
            })
            .from(marketTickers)
            .where(
                and(
                    eq(marketTickers.segment, segmento),
                    eq(marketTickers.isActive, true)
                )
            );

        // Mapeia e retorna apenas a array de strings (ex: ['PETR4', 'VALE3'])
        const listaTickers = data.map(t => t.symbol.toUpperCase());
        
        return { success: true, tickers: listaTickers };
    } catch (error) {
        console.error(`[Phrones Database Exception] Erro ao buscar tickers locais para o segmento ${segmento}:`, error.message);
        return { success: false, tickers: [] };
    }
}

// =========================================================================
// 🚀 HUB CENTRAL DE CONSULTAS EXTERNAS (Brapi & Gemini)
// =========================================================================
export async function executeQuantumQuery({ operation, params }) {
    try {
        switch (operation) {

            // 💡 EXTENSÃO NEXUS B3: COTAÇÃO EM TEMPO REAL
case "NEXUS_B3_QUOTE": {
    const symbol = params.symbol;
    const secretToken = (typeof process !== 'undefined' && process.env ? process.env.BRAPI_TOKEN : null) || 
                        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_BRAPI_TOKEN : null) ||
                        '9S9pGyW1Tx8141DU6L3ntV';

    if (!symbol) return { success: false, error: "Ticker ausente." };

    const url = `https://brapi.dev/api/quote/${symbol}?token=${secretToken}`;
    
    const res = await fetch(url);
    if (!res.ok) return { success: false, error: `Erro na cotação Brapi: ${res.status}` };

    const data = await res.json();
    
    // Verifica se a estrutura da Brapi retornou o dado esperado
    if (data.results && data.results.length > 0) {
        return { success: true, price: data.results[0].regularMarketPrice };
    }
    
    return { success: false, error: "Ativo não encontrado na Brapi." };
}
            
            // 💡 EXTENSÃO NEXUS B3: LISTAGEM DE ATIVOS DA BRAPI
            // =========================================================================
            case "NEXUS_B3_LIST": {
                const secretToken = (typeof process !== 'undefined' && process.env ? process.env.BRAPI_TOKEN : null) || 
                                    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_BRAPI_TOKEN : null) ||
                                    '9S9pGyW1Tx8141DU6L3ntV';

                if (!secretToken) {
                    console.warn("[Phrones Security Exception] Token de infraestrutura ausente no marketActions.");
                    return { success: false, error: "Token de mercado indisponível no ambiente atual." };
                }

                let url = "";
                if (params.segmento === "Opções") {
                    url = `https://brapi.dev/api/quote/list?type=stock&token=${secretToken}`;
                } else {
                    let typeParam = params.segmento === "FIIs" ? "fund" : "stock";
                    url = `https://brapi.dev/api/quote/list?type=${typeParam}&token=${secretToken}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    return { success: false, error: `Erro HTTP na listagem B3 (${params.segmento}): ${res.status}` };
                }

                const data = await res.json();
                let listaFinais = data.stocks || [];

                if (params.segmento === "Opções") {
                    const seriesPrincipais = ['PETR', 'VALE', 'ITUB', 'BBDC', 'BBAS'];
                    const sufixosOpcoes = ['A300', 'M500', 'K250', 'W400', 'B350', 'N350'];
                    
                    let opcoesGeradas = [];
                    seriesPrincipais.forEach(ativ => {
                        sufixosOpcoes.forEach(suf => {
                            opcoesGeradas.push({ stock: `${ativ}${suf}` });
                        });
                    });
                    return { success: true, type: "b3_opcoes", payload: opcoesGeradas };
                }

                return { success: true, type: "b3", payload: listaFinais };
            }

 // =========================================================================
// 🧠 MOTOR INTELIGENTE: ANÁLISE QUANTITATIVA EM TEMPO REAL via PhronesAI
            case "PHRONESIS_QUANTUM_ANALYSIS": {
                let secretKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                
                if (!secretKey) {
                    return { success: false, error: "Chave API ausente." };
                }

                const ai = new GoogleGenAI({ apiKey: secretKey });
                const promptTexto = params.payloadRequestBody?.contents?.[0]?.parts?.[0]?.text || "";
                
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: promptTexto,
                    config: { tools: [{ googleSearch: {} }] }
                });

                const outputText = typeof response.text === 'function' ? response.text() : response.text;

                if (!outputText) {
                    return { success: false, error: "Resposta vazia da IA." };
                }

                // AQUI ESTÁ A MÁGICA: Retornamos o texto puro, sem tentar fazer parse de JSON.
                // O processamento dos marcadores ### será feito exclusivamente no seu app/actions.js
                return { success: true, payload: outputText };
            }

            // 🧠 MOTOR DE PESQUISA E AUDITORIA (Processa documentos e PDFs)
           case "PHRONESIS_RESEARCH_ANALYSIS": {
                try {
                    let secretKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                    if (!secretKey) return { success: false, error: "Chave API ausente." };

                    const ai = new GoogleGenAI({ apiKey: secretKey });
                    
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: params.payloadRequestBody.contents
                    });

                    // 💡 FORMA ROBUSTA DE EXTRAÇÃO:
                    // Verificamos se é função, depois tentamos acessar a propriedade direta
                    let outputText = "";
                    if (typeof response.text === 'function') {
                        outputText = response.text();
                    } else if (response.text) {
                        outputText = response.text;
                    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                        outputText = response.candidates[0].content.parts[0].text;
                    }

                    if (!outputText) {
    return { success: false, error: "A IA retornou um objeto de resposta vazio." };
}

// 1. Limpeza rigorosa
const jsonLimpo = outputText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

try {
    // Como agora não exigimos mais JSON, apenas devolvemos o texto puro (jsonLimpo)
    // O sistema de marcadores será tratado depois no actions.js
    return { 
        success: true, 
        payload: jsonLimpo 
    };
} catch (err) {
    console.error("Erro inesperado no processamento da IA:", err);
    return { 
        success: false, 
        error: "Erro crítico ao processar o retorno da IA." 
    };
}

try {
    return { 
    success: true, 
    payload: jsonLimpo // Devolve o texto puro (com marcadores ###) sem tentar parsear
};
} catch (err) {
    // Se não for JSON, retorna como string para evitar crash, 
    // mas loga o erro para você ajustar o prompt
    console.error("Erro ao fazer parse do JSON no Research Analysis:", err);
    return { success: true, payload: outputText }; 
}

                    return { success: true, payload: outputText };
                } catch (err) {
                    console.error("Erro interno no processamento da IA:", err);
                    return { success: false, error: err.message };
                }
            }

            // =========================================================================
// 🧠 MOTOR DE SEGUNDA CAMADA: VALIDAÇÃO DE TESES E PLANOS OPERACIONAIS
// =========================================================================
case "PHRONESIS_VALIDATE_PLAN": {
    let secretKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!secretKey) {
        return { success: false, error: "Chave API ausente no motor de validação." };
    }

    const ai = new GoogleGenAI({ apiKey: secretKey });
    
    // params vai receber os dados que o utilizador alterou na tela + a tese antiga
    const { symbol, currentPrice, entryPrice, targetPrice, stopPrice, originalStrategy } = params;

    const promptValidacao = `
Você é o Auditor de Riscos Quânticos e Validação de Teses Sênior da Ex Nihilo.
Sua única função é confrontar a tese original gerada pela IA com os preços calibrados pelo operador humano e dizer de forma ultra-realista se o plano continua viável ou se o risco se tornou assimétrico/inaceitável.

DADOS DA OPERAÇÃO:
- Ativo: ${symbol}
- Preço Atual de Mercado: R$ ${currentPrice}
- Entrada Definida pelo Humano: R$ ${entryPrice}
- Alvo Definido pelo Humano: R$ ${targetPrice}
- Stop Loss Definido pelo Humano: R$ ${stopPrice}

TESE ANTERIOR DA IA:
"${originalStrategy}"

DIRETRIZES DE AUDITORIA (SEJA IMPLACÁVEL):
1. SE a Entrada do humano estiver muito longe do preço atual ou se o Risk/Reward ratio (Relação Risco x Retorno) se corrompeu com os novos valores, alerte imediatamente.
2. NÃO repita a tese anterior. Avalie EXCLUSIVAMENTE a viabilidade matemática e técnica dos novos níveis de preço frente ao contexto de mercado atual.

REGRA DE SAÍDA (OBRIGATÓRIA):
Você deve retornar a sua resposta estruturada exatamente sob estes dois marcadores:

###VERDICT###
[Apenas uma palavra em caixa alta: VIÁVEL, RISCO_ALTO, INVIÁVEL ou AGUARDAR_GATILHO]

###VALIDATION_SUMMARY###
[Máximo 3 frases. Análise matemática fria e direta do porquê deste veredito, baseando-se estritamente na relação risco/retorno dos novos números.]
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptValidacao,
        config: { tools: [{ googleSearch: {} }] } // Mantém a busca para verificar notícias ou exaustões de última hora
    });

    const outputText = typeof response.text === 'function' ? response.text() : response.text;

    if (!outputText) {
        return { success: false, error: "Resposta vazia do motor de validação." };
    }

    return { success: true, payload: outputText };
}

            default:
                return { success: false, error: "Protocolo de operation inexistente no ecossistema." };
        }
    } catch (error) {
        // MUDE ISSO: Deixe o erro completo aparecer no seu terminal (npm run dev)
        console.error(`[Phrones Security Exception] Erro detalhado na operação ${operation}:`, error);
        
        // Retorne o erro real, não uma mensagem genérica
        return { success: false, error: error.message }; 
    }
}
