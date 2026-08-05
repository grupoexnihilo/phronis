// src/components/StrategyModal.jsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { X, Save, RefreshCw, ChevronRight, ChevronLeft, ArrowLeft, Sparkles } from 'lucide-react';
import { Card, Button } from './UI';
import { 
    rastrearCenarioMacroAction, 
    gerarEngenhariaOperacaoAction, 
    iniciarValidacaoEstrategiaAction, 
    verificarStatusAnalisePorId, 
    calcularProjecoesAction, 
    salvarAnaliseEmSimulationsAction,
    descartarAnaliseTemporariaAction 
} from '@/app/actions'; 

export default function StrategyModal({ isOpen, onClose, data, user }) {
    // ──> CONTROLE DE ESTADOS DA ESTEIRA KAIZEN
    const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'error'
    const [currentStep, setCurrentStep] = useState('idle'); // 'idle', 'rastreando', 'calculando', 'auditando', 'ready'
    const [checklistText, setChecklistText] = useState("");
    
    const [aiData, setAiData] = useState(null);
    const [showParecer, setShowParecer] = useState(false);
    const [isSaving, setIsSaving] = useState(false); 
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Inputs reativos
    const [entryInput, setEntryInput] = useState("");
    const [stopInput, setStopInput] = useState("");
    const [targetInput, setTargetInput] = useState("");
    const [currentPriceInput, setCurrentPriceInput] = useState(""); 
    
    const [shortEntryInput, setShortEntryInput] = useState("");
    const [shortStopInput, setShortStopInput] = useState("");
    const [shortTargetInput, setShortTargetInput] = useState("");
    const [shortCurrentPriceInput, setShortCurrentPriceInput] = useState(""); 
    
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [isPending, startTransition] = useTransition();
    
    const [projecoes, setProjecoes] = useState({
        gainPercent: "0.0%",
        gainFinanceiro: 0,
        capitalTotalGain: 0,
        lossPercent: "0.0%",
        lossFinanceiro: 0,
        capitalTotalLoss: 0
    });

    // 🔄 EFFECT: Monitoramento matemático e cálculo de projeções na mesa
    useEffect(() => {
        if (!isOpen || status !== 'ready') return;

        const tipoResolvido = (data?.tipoOperacao || data?.tipo || "").toUpperCase();
        const isLongShort = tipoResolvido.includes("LONG") || tipoResolvido.includes("ARBITRAGEM");

        if (isLongShort) {
            if (!entryInput || !targetInput || !stopInput || !shortEntryInput || !shortTargetInput || !shortStopInput) return;
        } else {
            if (!entryInput || !targetInput || !stopInput) return;
        }

        startTransition(async () => {
            try {
                const investimentoResolvido = data?.investimento;
                const alavancagemResolvida = data?.alavancagem;
                const segmentoResolvido = data?.segmento; 

                const payload = {
                    tipoOperacao: isLongShort ? "LONG_SHORT" : tipoResolvido, 
                    segmento: segmentoResolvido, 
                    investimento: investimentoResolvido,
                    alavancagem: alavancagemResolvida,
                    entryInput,
                    targetInput,
                    stopInput,
                    longEntrada: parseFloat(entryInput),
                    longAlvo: parseFloat(targetInput),
                    longStop: parseFloat(stopInput),
                    shortEntrada: parseFloat(shortEntryInput),
                    shortAlvo: parseFloat(shortTargetInput),
                    shortStop: parseFloat(shortStopInput)
                };

                const res = await calcularProjecoesAction(payload);

                if (res && res.success) {
                    setProjecoes(res);
                }
            } catch (err) {
                console.error("🔴 Erro no scanner estruturado de projeções:", err);
            }
        });
    }, [entryInput, targetInput, stopInput, shortEntryInput, shortTargetInput, shortStopInput, data, isOpen, status]);
            
    // 🔄 EFFECT: Tecla ESC para fechar
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // 🔄 EFFECT MASTER: ORQUESTRADOR DA ESTEIRA ASSÍNCRONA CLIENT-SIDE ANTI-TIMEOUT
  // 🔄 EFFECT MASTER: ORQUESTRADOR DA ESTEIRA ASSÍNCRONA CLIENT-SIDE ANTI-TIMEOUT
useEffect(() => {
    if (!isOpen || !data) return;

    const executarEsteiraMesa = async () => {
        try {
            setStatus('loading');

            // ==========================================
            // FASE 1: O RASTREADOR MACRO (Busca Web)
            // ==========================================
            setCurrentStep('rastreando');
            setChecklistText("Buscando resumo histórico e fatos políticos na internet...");

            const simboloAtivo = data.symbol || data.ativo1 || "ATIVO";
            const ativoCompilado = data.ativo2 ? `${simboloAtivo} x ${data.ativo2}` : simboloAtivo;
            const resMacro = await rastrearCenarioMacroAction(ativoCompilado, data.tipoOperacao);

            if (!resMacro || !resMacro.success) {
                throw new Error("Falha ao coletar dados históricos da web.");
            }

            const cenarioContextual = resMacro.cenarioMacro;

            // ==========================================
            // FASE 2: ENGENHARIA QUANTITATIVA (Matemática)
            // ==========================================
            setCurrentStep('calculando');
            setChecklistText("Montando relatório contextual e calibrando alvos quânticos...");

            const resQuant = await gerarEngenhariaOperacaoAction(data, cenarioContextual);

            if (!resQuant || !resQuant.success || !resQuant.payload) {
                throw new Error("O cálculo matemático da inteligência falhou.");
            }

            const payloadIA = resQuant.payload;

            // Sincroniza os estados locais com o retorno limpo da IA
            setAiData(payloadIA);
            setEntryInput(payloadIA.entryPrice || "");
            setTargetInput(payloadIA.targetPrice || "");
            setStopInput(payloadIA.stopPrice || "");
            setCurrentPriceInput(payloadIA.currentPrice || "");

            if (payloadIA.shortEntryPrice) {
                setShortEntryInput(payloadIA.shortEntryPrice);
                setShortTargetInput(payloadIA.shortTargetPrice || "");
                setShortStopInput(payloadIA.shortStopPrice || "");
            }

            // Guarda o ID do rascunho gerado no banco
            data.jobId = resQuant.analysisId;

            // ==========================================
            // FIM DA ESTEIRA AUTOMÁTICA -> LIBERA O MODAL IMMEDIATAMENTE!
            // ==========================================
            setCurrentStep('ready');
            setStatus('ready');

        } catch (error) {
            console.error("🚨 FALHA CRÍTICA NA ORQUESTRAÇÃO DA MESA:", error);
            setStatus('error');
            setCurrentStep('idle');
        }
    };

    executarEsteiraMesa();
}, [isOpen, data, user]);

    // 🔄 EFFECT 3: Limpeza compulsória de cache e inputs ao fechar
    useEffect(() => {
        if (!isOpen) {
            setStatus('loading');
            setCurrentStep('idle');
            setChecklistText("");
            setAiData(null);
            setValidationResult(null);
            setShowParecer(false);
            
            setEntryInput("");
            setTargetInput("");
            setStopInput("");
            setCurrentPriceInput("");
            
            setShortEntryInput("");
            setShortTargetInput("");
            setShortStopInput("");
            setShortCurrentPriceInput("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const confidence = aiData ? parseInt(aiData.winRate, 10) || 0 : 0;
    
    const getStyles = (val) => {
        if (val >= 65) return { color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500/50', label: aiData?.confidenceLabel || 'Alta Confiança', glow: 'shadow-emerald-500/10' };
        if (val >= 50) return { color: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500/50', label: aiData?.confidenceLabel || 'Confiança Moderada', glow: 'shadow-amber-500/10' };
        return { color: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500/50', label: aiData?.confidenceLabel || 'Baixa Confiança', glow: 'shadow-red-500/10' };
    };
    const styles = getStyles(confidence);

    const handleConfirmOperation = async () => {
        try {
            setIsSaving(true);

            const tipoResolvido = (data?.tipoOperacao || data?.tipo || "").toUpperCase();
            const ehLongShort = tipoResolvido.includes("LONG") || tipoResolvido.includes("ARBITRAGEM");

            const entradaFinal = ehLongShort ? `${entryInput} x ${shortEntryInput}` : entryInput;
            const alvoFinal = ehLongShort ? `${targetInput} x ${shortTargetInput}` : targetInput;
            const stopFinal = ehLongShort ? `${stopInput} x ${shortStopInput}` : stopInput;

            const payloadCompleto = {
                userId: user?.id || data?.userId,
                tipoOperacao: data?.tipoOperacao,
                segmento: data?.segmento,
                ativo1: data?.ativo1 || data?.symbol, 
                ativo2: data?.ativo2,         
                investimento: data?.investimento,
                alavancagem: data?.alavancagem,
                stopPercent: data?.stopPercent,
                alvoPercent: data?.alvoPercent,
                prazoValor: data?.prazoValor,
                prazoUnidade: data?.prazoUnidade,
                moeda: data?.moeda,
                status: "confirmed",

                entryPrice: entradaFinal,   
                targetPrice: alvoFinal, 
                stopPrice: stopFinal,     
                marketPriceAtAnalysis: entryInput,
                winRate: confidence.toString(), 
                technicalSummary: aiData?.technicalSummary,
                strategy: aiData?.strategy,

                projectedGainAmount: projecoes?.gainFinanceiro?.toString() || "0",
                projectedLossAmount: projecoes?.lossFinanceiro?.toString() || "0",
                projectedGainPercent: projecoes?.gainPercent?.toString() || data?.alvoPercent,
                projectedLossPercent: projecoes?.lossPercent?.toString() || data?.stopPercent
            };

            const response = await salvarAnaliseEmSimulationsAction(data.jobId, payloadCompleto);
            
            if (response.success) {
                alert('Operação registrada com sucesso no terminal!');
                onClose(); 
            } else {
                alert(`Erro ao salvar no banco: ${response.error}`);
            }
        } catch (error) {
            console.error('Erro crítico na Server Action de salvamento:', error);
            alert('Erro crítico ao salvar a simulação.');
        } finally {
            setIsSaving(false);
        }
    };

   // src/components/StrategyModal.jsx

const handleValidarPlano = async () => {
    const paramsValidacao = {
        symbol: data?.symbol || data?.ativo1,
        currentPrice: currentPriceInput || entryInput,
        entryPrice: entryInput,
        targetPrice: targetInput,
        stopPrice: stopInput,
        originalStrategy: aiData?.strategy,
        winRate: confidence
    };

    setIsValidating(true);
    setValidationResult(null);

    const userIdResolvido = user?.id || data?.userId;

    if (!userIdResolvido) {
        alert(`Erro de Sessão: ID do usuário não identificado.`);
        setIsValidating(false);
        return;
    }

    try {
        const result = await iniciarValidacaoEstrategiaAction(Number(userIdResolvido), paramsValidacao);
        if (!result.success) throw new Error(result.error);

        const validationJobId = result.jobId;
        let completou = false;
        let tentativas = 0;

        // Polling de 2s em 2s (até 15 tentativas = 30s)
        while (!completou && tentativas < 15) {
            await new Promise(r => setTimeout(r, 2000));
            const statusResponse = await verificarStatusAnalisePorId(validationJobId);

            if (statusResponse && statusResponse.status === 'COMPLETED') {
                const payloadCru = typeof statusResponse.payload === 'string'
                    ? JSON.parse(statusResponse.payload)
                    : statusResponse.payload;

                if (payloadCru) {
                    setValidationResult({
                        verdict: payloadCru.verdict || 'AJUSTADO',
                        summary: payloadCru.validationSummary || 'Validação concluída.'
                    });
                }
                completou = true;
            } else if (statusResponse && statusResponse.status === 'ERROR') {
                throw new Error("A auditoria do plano falhou no servidor.");
            }
            tentativas++;
        }

        if (!completou) {
            throw new Error("O servidor demorou para responder. Tente novamente.");
        }

    } catch (error) {
        console.error("🔴 Erro na validação manual do plano:", error);
        alert(`Erro operacional: ${error.message}`);
    } finally {
        setIsValidating(false);
    }
};

// Função de fechamento com descarte do rascunho temporário
const handleCloseModal = async () => {
    if (isSaving) return;

    // Se houver um jobId de rascunho e a operação NÃO foi salva em simulations, limpa a fila
    if (data?.jobId && !isSaving) {
        try {
            await descartarAnaliseTemporariaAction(data.jobId);
        } catch (err) {
            console.warn("⚠️ Não foi possível descartar a análise temporária ao fechar:", err);
        }
    }

    onClose();
};

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-[#05070a]/90 backdrop-blur-xl" onClick={isSaving || status === 'loading' ? null : handleCloseModal}></div>
            
            <Card className={`relative w-full ${isExpanded ? 'max-w-5xl' : 'max-w-2xl'} bg-[#090b11] border-white/5 shadow-2xl transition-all duration-300 p-8 max-h-[90vh] overflow-y-auto rounded-[32px] custom-scrollbar`}>
                
                <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-full">
                        {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <button onClick={handleCloseModal} disabled={isSaving || status === 'loading'} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-full disabled:opacity-30">
    <X size={18} />
</button>
                </div>

                <div className="text-left mb-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-500">Mapeamento de Ordem</h3>
                    <p className="text-xs text-slate-400 mt-1">{data?.tipoOperacao} • {data?.segmento} • {data?.symbol || data?.ativo1}</p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Status do Painel:</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 uppercase tracking-wider">
                        {status === 'ready' ? 'Pronto para Calibragem' : 'Esteira em Execução'}
                    </span>
                </div>

                {status === 'loading' && (
                    <div className="py-16 flex flex-col items-center justify-center">
                        <RefreshCw size={36} className="text-blue-500 animate-spin mb-4" />
                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 animate-pulse">
                            {currentStep === 'rastreando' && 'Rastreando Ativo...'}
                            {currentStep === 'calculando' && 'Calculando Métricas...'}
                            {currentStep === 'auditando' && 'Comitê de Risco...'}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase tracking-wide text-center max-w-sm">
                            {checklistText}
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-12 flex flex-col items-center justify-center border border-red-500/20 rounded-3xl bg-red-500/5">
                        <p className="text-xs font-black text-red-500 uppercase tracking-widest">Falha de Processamento</p>
                        <p className="text-xs text-slate-400 mt-2 text-center max-w-md px-6">Não foi possível consolidar a resposta analítica através da esteira de passos.</p>
                        <Button onClick={onClose} className="mt-6 px-6 py-2.5 bg-slate-900 border border-white/5 text-[9px] font-black uppercase tracking-wider rounded-xl">
                            Voltar para a Mesa
                        </Button>
                    </div>
                )}

                {status === 'ready' && aiData && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                                   
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 min-h-[80px]">
                            <div className="flex items-center gap-4 shrink-0 text-left">
                                <span className={`text-3xl font-medium tracking-tight ${styles.color}`}>{confidence}%</span>
                                <div className="w-24">
                                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest leading-none">{styles.label}</p>
                                    <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full ${styles.bg} transition-all duration-1000`} style={{ width: `${confidence}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="grow">
                                <div onClick={() => !isSaving && setShowParecer(!showParecer)} className={`cursor-pointer transition-all duration-300 border ${styles.border} ${styles.glow} ${showParecer ? 'w-full p-5 rounded-2xl bg-slate-900/50' : 'h-10 w-[160px] rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10'}`}>
                                    {!showParecer ? (
                                        <span className={`text-[10px] font-semibold uppercase tracking-widest ${styles.color}`}>Parecer Técnico</span>
                                    ) : (
                                        <div className="animate-in fade-in zoom-in-95 text-left">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-[9px] font-bold uppercase tracking-widest ${styles.color}`}>Phrones Insight</span>
                                                <X size={12} className="text-slate-600" onClick={(e) => { e.stopPropagation(); setShowParecer(false); }} />
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed italic">"{aiData?.technicalSummary}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-left whitespace-pre-wrap">
                            <p className="text-sm text-slate-300 font-light leading-relaxed font-mono">
                                {aiData?.strategy}
                            </p>
                        </div>

                        <div className="space-y-6 mt-6">
                            {(() => {
                                const tipoString = (data?.tipoOperacao || data?.tipo || "").toUpperCase();
                                const ehLongShort = tipoString.includes("LONG") || tipoString.includes("ARBITRAGEM");

                                if (ehLongShort) {
                                    return (
                                        <div className="flex flex-col gap-5">
                                            {/* PERNA 1: LONG */}
                                            <div className="p-5 bg-emerald-500/[0.01] border border-emerald-500/10 rounded-2xl text-left">
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400 block mb-4">
                                                    Perna Comprada (LONG) {currentPriceInput && `| Atual: R$ ${currentPriceInput}`}
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Entrada Long</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={entryInput} 
                                                            onChange={(e) => setEntryInput(e.target.value)} 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-blue-500 outline-none transition-colors" 
                                                            placeholder="0.00" 
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Alvo Long</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={targetInput} 
                                                            onChange={(e) => setTargetInput(e.target.value)} 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-emerald-500 outline-none transition-colors" 
                                                            placeholder="0.00" 
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Stop Long</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={stopInput} 
                                                            onChange={(e) => setStopInput(e.target.value)} 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-red-500 outline-none transition-colors" 
                                                            placeholder="0.00" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* PERNA 2: SHORT */}
                                            <div className="p-5 bg-red-500/[0.01] border border-red-500/10 rounded-2xl text-left">
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400 block mb-4">
                                                    Perna Vendida (SHORT) {shortCurrentPriceInput && `| Atual: R$ ${shortCurrentPriceInput}`}
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Entrada Short</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={shortEntryInput} 
                                                            onChange={(e) => setShortEntryInput(e.target.value)} 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-blue-500 outline-none transition-colors" 
                                                            placeholder="0.00" 
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Alvo Short</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={shortTargetInput} 
                                                            onChange={(e) => setShortTargetInput(e.target.value)} 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-emerald-500 outline-none transition-colors" 
                                                            placeholder="0.00" 
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Stop Short</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            value={shortStopInput} 
                                                            onChange={(e) => setShortStopInput(e.target.value)} 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-red-500 outline-none transition-colors" 
                                                            placeholder="0.00" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                        <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-left h-5 flex items-center truncate">
        Entrada {currentPriceInput && `| Mercado: R$ ${currentPriceInput}`}
    </label>
    <input 
        type="number" 
        step="any"
        value={entryInput} 
        onChange={(e) => setEntryInput(e.target.value)} 
        className="w-full h-[46px] bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-mono focus:border-blue-500 outline-none transition-colors text-left"
        placeholder="0.00"
    />
</div>

                                        <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-left h-5 flex items-center truncate">
        Saída Projetada (Alvo)
    </label>
    <input 
        type="number" 
        step="any"
        value={targetInput} 
        onChange={(e) => setTargetInput(e.target.value)}
        className="w-full h-[46px] bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-mono focus:border-emerald-500 outline-none transition-colors text-left"
        placeholder="0.00"
    />
</div>

                                        <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-left h-5 flex items-center truncate">
        Invalidação (Stop Loss)
    </label>
    <input 
        type="number" 
        step="any"
        value={stopInput} 
        onChange={(e) => setStopInput(e.target.value)}
        className="w-full h-[46px] bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-mono focus:border-red-500 outline-none transition-colors text-left"
        placeholder="0.00"
    />
</div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-5 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl flex flex-col items-center">
                                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-[0.15em] mb-2">Gain Projetado</span>
                                <p className="text-xl font-black text-emerald-400">{projecoes.gainPercent}</p>
                                <p className="text-[11px] text-emerald-500/70 font-mono mt-1">
                                    {(projecoes.gainFinanceiro || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>

                            <div className="p-5 bg-red-500/[0.03] border border-red-500/10 rounded-2xl flex flex-col items-center">
                                <span className="text-[9px] text-red-600 font-bold uppercase tracking-[0.15em] mb-2">Perda Projetada</span>
                                <p className="text-xl font-black text-red-400">{projecoes.lossPercent}</p>
                                <p className="text-[11px] text-red-500/70 font-mono mt-1">
                                    {(projecoes.lossFinanceiro || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 p-5 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col gap-4 text-left">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                                        <Sparkles size={12} className="text-blue-500 animate-pulse" /> Auditoria de Risco Humano
                                    </h4>
                                    <p className="text-[9px] text-slate-500 font-mono uppercase mt-0.5">Confronte seus preços calibrados com a tese de mercado</p>
                                </div>

                                <button
                                    onClick={handleValidarPlano}
                                    disabled={isValidating || !entryInput || !targetInput || !stopInput}
                                    className="h-8 px-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 font-black text-[9px] uppercase tracking-widest rounded-full flex items-center gap-2 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    {isValidating ? (
                                        <>
                                            <RefreshCw size={12} className="animate-spin text-blue-400" />
                                            Auditando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={12} />
                                            Validar Novo Plano
                                        </>
                                    )}
                                </button>
                            </div>

                            {validationResult && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 border-t border-white/5 pt-4 flex flex-col sm:flex-row gap-4 items-start">
                                    <div className={`shrink-0 px-3 py-1.5 rounded-lg font-mono text-[10px] font-black tracking-wider text-center border uppercase ${
                                        validationResult.verdict === 'VIÁVEL' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5' :
                                        validationResult.verdict === 'RISCO_ALTO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5' :
                                        validationResult.verdict === 'INVIÁVEL' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-lg shadow-red-500/5' :
                                        'bg-slate-800/50 text-slate-400 border-slate-700'
                                    }`}>
                                        {validationResult.verdict.replace('_', ' ')}
                                    </div>

                                    <p className="text-xs text-slate-400 font-light leading-relaxed italic grow">
                                        "{validationResult.summary}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
                    <Button onClick={handleCloseModal} disabled={isSaving || status === 'loading'} className="w-full sm:w-auto px-6 py-4 rounded-[18px] bg-white/5 text-slate-300 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-30">
    <ArrowLeft size={16} />
    Editar Ordem
</Button>

                    <Button onClick={handleConfirmOperation} disabled={isSaving || status !== 'ready'} className="flex-1 w-full py-4 rounded-[18px] bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-3 transition-all disabled:bg-blue-800/40 disabled:text-white/30 disabled:cursor-not-allowed">
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        <span className="text-xs font-black uppercase tracking-[0.2em]">
                            {isSaving ? 'Gravando no Terminal...' : 'Confirmar Operação no Terminal'}
                        </span>
                    </Button>
                </div>
            </Card>
        </div>
    );
}