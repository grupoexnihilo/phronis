// src/lib/financialMath.js

// 🔒 FUNÇÃO INTERNA: Não recebe export (uso exclusivo deste arquivo)
function normalizarAlavancagem(alavancagemRaw) {
    if (!alavancagemRaw) return 1;
    const str = alavancagemRaw.toString().trim().toLowerCase();
    
    if (str.includes(':')) {
        const partes = str.split(':');
        const base = parseFloat(partes[0]) || 1;
        const multiplicador = parseFloat(partes[1]) || 1;
        return multiplicador / base;
    }
    
    if (str.endsWith('x')) {
        return parseFloat(str.replace('x', '')) || 1;
    }
    
    return parseFloat(str) || 1;
}

// 🔒 FUNÇÃO INTERNA: Não recebe export (uso exclusivo deste arquivo)
function normalizarMoedaParaNumero(valorRaw) {
    if (!valorRaw) return 0;
    if (typeof valorRaw === 'number') return valorRaw;
    
    const apenasNumeros = valorRaw.toString().replace(/[^\d,.]/g, '');
    if (apenasNumeros.includes(',') && apenasNumeros.includes('.')) {
        if (apenasNumeros.indexOf(',') > apenasNumeros.indexOf('.')) {
            return parseFloat(apenasNumeros.replace(/\./g, '').replace(',', '.')) || 0;
        } else {
            return parseFloat(apenasNumeros.replace(/,/g, '')) || 0;
        }
    } else if (apenasNumeros.includes(',')) {
        return parseFloat(apenasNumeros.replace(',', '.')) || 0;
    }
    return parseFloat(apenasNumeros) || 0;
}

// 🌐 MOTOR PRINCIPAL: Recebe o export para ser importado no actions.js e exposto ao sistema
export function calcularProjecoesFinanceiras(payload) {
    console.log("👉 PAYLOAD RECEBIDO NO MOTOR FINANCEIRO:", payload);
    try {
        const tipo = payload.tipoOperacao?.toUpperCase() || "SWING_TRADE";
        const investimento = normalizarMoedaParaNumero(payload.investimento);
        const alavancagem = normalizarAlavancagem(payload.alavancagem);

        if (investimento <= 0) {
            return {
                success: true,
                gainPercent: "0.0%", gainFinanceiro: 0,
                lossPercent: "0.0%", lossFinanceiro: 0
            };
        }

        let gainFinanceiro = 0;
        let lossFinanceiro = 0;

        // ──> CENÁRIO COMPLEXO: LONG & SHORT (Arbitragem de Duas Pontas)
        if (tipo === "LONG_SHORT" || tipo === "LONG & SHORT") {
            const {
                longEntrada, longAlvo, longStop,
                shortEntrada, shortAlvo, shortStop
            } = payload;

            // Validação de segurança: Se faltar preço em alguma das pontas, retorna zerado
            if (!longEntrada || !longAlvo || !longStop || !shortEntrada || !shortAlvo || !shortStop) {
                return {
                    success: true,
                    gainPercent: "0.0%", gainFinanceiro: 0,
                    lossPercent: "0.0%", lossFinanceiro: 0
                };
            }

            // Cada ponta utiliza metade do capital alocado na operação estruturada (neutralidade de mercado)
            const capitalPorPerna = investimento / 2;

            // Perna Long (Ganha na Alta): (Alvo - Entrada) / Entrada
            const gainLongPercent = (longAlvo - longEntrada) / longEntrada;
            const lossLongPercent = (longStop - longEntrada) / longEntrada;

            // Perna Short (Ganha na Baixa): (Entrada - Alvo) / Entrada  <-- Invertido!
            const gainShortPercent = (shortEntrada - shortAlvo) / shortEntrada;
            const lossShortPercent = (shortEntrada - shortStop) / shortEntrada;

            // Lucro e Prejuízo combinados aplicando o multiplicador da alavancagem estruturada
            gainFinanceiro = (capitalPorPerna * gainLongPercent * alavancagem) + (capitalPorPerna * gainShortPercent * alavancagem);
            lossFinanceiro = (capitalPorPerna * lossLongPercent * alavancagem) + (capitalPorPerna * lossShortPercent * alavancagem);

        } else {
            // ──> CENÁRIO DIRECIONAL PADRÃO (Swing, Day Trade, Forex)
            const entrada = parseFloat(payload.entryInput) || 0;
            const alvo = parseFloat(payload.targetInput) || 0;
            const stop = parseFloat(payload.stopInput) || 0;

            if (entrada <= 0 || alvo <= 0 || stop <= 0) {
                return {
                    success: true,
                    gainPercent: "0.0%", gainFinanceiro: 0,
                    lossPercent: "0.0%", lossFinanceiro: 0
                };
            }

            // Detecção Automática de Direção (Se o Alvo for menor que a Entrada, é uma operação Vendida / Short)
            const ehOperacaoVendida = alvo < entrada;

            let gainPercentAtivo = 0;
            let lossPercentAtivo = 0;

            if (ehOperacaoVendida) {
                // Venda (Short): Ganha na queda, perde na alta
                gainPercentAtivo = (entrada - alvo) / entrada;
                lossPercentAtivo = (entrada - stop) / entrada;
            } else {
                // Compra (Long): Ganha na alta, perde na queda
                gainPercentAtivo = (alvo - entrada) / entrada;
                lossPercentAtivo = (stop - entrada) / entrada;
            }

            // ──> NORMALIZAÇÃO DA STRING DE TIPO (Trata "Day Trade", "DAY_TRADE", "Forex", etc.)
            const tipoLimpo = tipo.replace(/[\s_]/g, ""); // Remove espaços e underlines

            let multiplicador = alavancagem;

            // Se não for Forex nem Day Trade (ex: Swing Trade puro), removemos a alavancagem por segurança
            if (!tipoLimpo.includes("FOREX") && !tipoLimpo.includes("DAYTRADE")) {
                multiplicador = 1;
            }

            gainFinanceiro = investimento * gainPercentAtivo * multiplicador;
            lossFinanceiro = investimento * lossPercentAtivo * multiplicador;
        
        }

        // ROI Final unificado sobre a margem/capital próprio alocado
        const gainPercentFinal = ((gainFinanceiro / investimento) * 100).toFixed(1) + "%";
        const lossPercentFinal = ((lossFinanceiro / investimento) * 100).toFixed(1) + "%";

        // Substitua o return final por este:
return {
    success: true,
    gainPercent: gainPercentFinal,
    gainFinanceiro: Math.abs(gainFinanceiro), // Exibição limpa positiva no Gain
    lossPercent: lossPercentFinal,
    lossFinanceiro: -Math.abs(lossFinanceiro) // Força o sinal de menos explicativo no Loss
};

    } catch (error) {
        console.error("🔴 Erro interno no motor de cálculo:", error);
        return { success: false, error: "Falha ao processar matriz de risco." };
    }
}