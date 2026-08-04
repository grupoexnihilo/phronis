/**
 * SERVIÇO DE INTELIGÊNCIA EXCLUSIVO DA PHRONESIS AI
 * Organização, engenharia de prompt e estruturação do parecer analítico.
 */
import { executeQuantumQuery } from './marketActions';

export async function processarAnaliseQuantitativa(params) {
    try {
        const { segment, asset1, asset2, investment, leverage, operationType, stopPercent, alvoPercent } = params;

        const ativoAlvo = asset2 ? `${asset1}/${asset2}` : asset1;

        // 🛡️ TRATAMENTO ULTRA ROBUSTO DE STRINGS FINANCEIRAS (Evita NaN)
        const limparNumero = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            // Remove símbolos de moeda se houver, remove pontos de milhar e troca vírgula por ponto
            const stringLimpa = val.toString().replace(/[^0-9,-]/g, '').replace(',', '.');
            return parseFloat(stringLimpa) || 0;
        };

        const valorInvestido = limparNumero(investment);
        const multiplicadorAlavancagem = parseInt((leverage || '1x').toString().replace('x', ''), 10) || 1;
        
        const refStopPercent = limparNumero(stopPercent);
        const refAlvoPercent = limparNumero(alvoPercent);
        
        // Cálculo da exposição real considerando a alavancagem
        const projecaoPerda = valorInvestido * (refStopPercent / 100) * multiplicadorAlavancagem;
        const projecaoGanho = valorInvestido * (refAlvoPercent / 100) * multiplicadorAlavancagem;

        const formatarMoeda = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const systemInstructionText = `Você é o Estrategista Chefe e a mente por trás da Phronesis AI, a inteligência quantitativa do ecossistema financeiro Ex Nihilo. 
        Sua especialidade é fundos de investimento, originação de clientes institucionais, governança corporativa e leitura avançada de fluxo macroeconômico.
        Sua linguagem é cirúrgica, executiva, técnica e altamente analítica. Nunca use termos vagos. Baseie-se em estruturas reais de mercado.`;

        const userPrompt = `Gere um parecer analítico estruturado para a mesa de trade baseado nos seguintes parâmetros:
        - Ativo: ${ativoAlvo}
        - Segmento de Mercado: ${segment}
        - Modalidade: ${operationType}
        - Capital Alocado: ${formatarMoeda(valorInvestido)} (Alavancagem configurada em: ${leverage})
        
        INSTRUÇÕES DE PREENCHIMENTO DOS CAMPOS DO RESULTADO (DEVOLVA APENAS JSON PURO):
        1. winRate: Probabilidade matemática de acerto (um número inteiro de 0 a 100) baseada nos parâmetros e no cenário macro.
        2. advice: Um Parecer Técnico extremamente curto de 1 linha (máximo 90 caracteres) sintetizando a direção.
        3. strategy: Explicação macro técnica profunda do motivo dessa operação e posicionamento institucional sugerido.
        4. take: Defina a projeção de ganho ideal. Use como base técnica o valor calculado de ${formatarMoeda(projecaoGanho)}.
        5. stop: Defina o risco máximo. Use como base técnica o valor calculado de ${formatarMoeda(projecaoPerda)}.`;

        // Payload limpo e direto compatível com chamadas HTTP brutas na API do AI Studio
        // Payload definitivo com Google Search ativo para varredura macro de mercado
        const payloadRequestBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: `${systemInstructionText}\n\n${userPrompt}` }
                    ]
                }
            ],
            tools: [{ googleSearch: {} }], // 🌐 Ativa a busca em tempo real do Google para fundamentar a tese
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        winRate: { type: "integer" },
                        advice: { type: "string" },
                        strategy: { type: "string" },
                        take: { type: "string" },
                        stop: { type: "string" }
                    },
                    required: ["winRate", "advice", "strategy", "take", "stop"]
                }
            }
        };

        // Dispara a consulta usando a rota centralizada e segura do seu ecossistema
        const resultado = await executeQuantumQuery({
            operation: "PHRONESIS_QUANTUM_ANALYSIS",
            params: { payloadRequestBody }
        });

        return resultado;

    } catch (error) {
        console.error("[Phronesis Service Exception] Falha ao estruturar análise quantitativa:", error.message);
        return { success: false, error: error.message };
    }
}