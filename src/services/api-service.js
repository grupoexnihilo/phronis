// src/services/api-service.js
import { functions } from '../firebase.config.js';
import { httpsCallable } from 'firebase/functions';

/**
 * Interface Unificada para o Backend Seguro do Fox Pro
 */
const foxApi = {
    // 1. Busca lista de ativos por mercado (B3, Nasdaq, etc)
    async getAssetList(market) {
        const func = httpsCallable(functions, 'fetchAssetList');
        const result = await func({ market });
        return result.data;
    },

    // 2. IA: Gerador de Análise Tática (Plano Alpha)
    async getTacticAnalysis(params) {
        const func = httpsCallable(functions, 'callGeminiAnalysis');
        const result = await func(params);
        return result.data;
    },

    // 3. IA: Trading Coach (Feedback de Disciplina)
    async getCoachFeedback(tradeData) {
        const func = httpsCallable(functions, 'callGeminiCoach');
        const result = await func({ tradeData });
        return result.data;
    },

    // 4. IA: Deep History Analysis (Padrões de Viés)
    async getHistoryInsight(operations) {
        const func = httpsCallable(functions, 'callGeminiHistoryAnalysis');
        const result = await func({ operations });
        return result.data;
    },

    // 5. Market Data: Cotações em Tempo Real (Simulado ou Real)
    async getMarketPrice(ticker) {
        const func = httpsCallable(functions, 'getLivePrice');
        const result = await func({ ticker });
        return result.data;
    }
};

export default foxApi;