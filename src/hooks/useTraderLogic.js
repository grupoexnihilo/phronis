import { useState, useCallback } from 'react';
import foxApi from '../services/api-service';
import { db } from '../firebase.config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function useTraderLogic(userId, appId) {
    const [isLoading, setIsLoading] = useState(false);
    const [tradeAnalysisResult, setTradeAnalysisResult] = useState(null);

    const handleAnalyzeTrade = useCallback(async (tradeInputs) => {
        if (!userId || !db) return;
        
        setIsLoading(true);
        try {
            // 1. Chamada para a IA de Coaching (Via nossa Bridge)
            const feedback = await foxApi.getCoachFeedback(tradeInputs);
            setTradeAnalysisResult(feedback);

            // 2. Persistência no Firestore
            const collectionPath = `artifacts/${appId}/users/${userId}/foxpro_operations`;
            await addDoc(collection(db, collectionPath), {
                ...tradeInputs,
                timestamp: serverTimestamp(),
                userId
            });

            return { success: true, feedback };
        } catch (err) {
            console.error("Erro na lógica de trade:", err);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [userId, appId]);

    return { handleAnalyzeTrade, isLoading, tradeAnalysisResult };
}