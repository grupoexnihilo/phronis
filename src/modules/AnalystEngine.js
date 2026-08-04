import { getFunctions, httpsCallable } from "firebase/functions";

export const AnalystEngine = {
    async getCompleteResearch(ticker) {
        const functions = getFunctions();
        const apiProxy = httpsCallable(functions, 'phronesApiProxy');
        
        // Aqui o motor busca dados e IA ao mesmo tempo
        const result = await apiProxy({ 
            action: "callGeminiCoach", 
            payload: { 
                prompt: `Analise o ativo ${ticker} considerando dados fundamentais e cenário macro. Seja institucional.` 
            } 
        });
        return result.data;
    }
};