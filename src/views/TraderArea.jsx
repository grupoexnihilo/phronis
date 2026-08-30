'use client';

import React, { useState, useEffect } from 'react';
import { 
    Zap, 
    Target, 
    ShieldAlert, 
    BarChart3, 
    Plus, 
    Search, 
    HelpCircle, 
    Coins,
    RefreshCw,
    Database
} from 'lucide-react';
import StrategyModal from '../components/StrategyModal';
import { simulationService } from '../services/simulationService';
import { testarSincronizacaoAtivos } from '@/app/actions'; // Importe a função que criamos
import { getTickersAction } from '@/app/actions';
import { gerarEngenhariaOperacaoAction } from '@/app/actions';


export default function TraderArea({ user: propUser }) {
    // 🛡️ REQUISITOS MULTI-TENANT DE REDUNDÂNCIA:
    // 1. Tenta ler a prop enviada pelo pai
    // 2. Se for nula/undefined, busca a sessão do localStorage (ou do seu Context/Cookie)
    const [user, setUser] = useState(propUser || null);

    useEffect(() => {
        if (!user && typeof window !== 'undefined') {
            try {
                const storedUser = localStorage.getItem('phronis_user') || localStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (err) {
                console.error("❌ Erro ao recuperar sessão do tenant local:", err);
            }
        }
    }, [propUser]);
    {/* --- ESTADOS --- */}
    const [tipoOperacao, setTipoOperacao] = useState('Day Trade');
    const [segmento, setSegmento] = useState('Ações');
    const [isPairs, setIsPairs] = useState(false);
    const [ativo1, setAtivo1] = useState('');
    const [ativo2, setAtivo2] = useState('');
    const [investimento, setInvestimento] = useState('0,00');
    const [alavancagem, setAlavancagem] = useState('1x');
    const [moeda, setMoeda] = useState('BRL');
    const [stopPercent, setStopPercent] = useState('0,00');
    const [alvoPercent, setAlvoPercent] = useState('0,00');
    const [prazoValor, setPrazoValor] = useState('1');
    const [prazoUnidade, setPrazoUnidade] = useState('Dias');
    const [consultarHistorico, setConsultarHistorico] = useState(false);
    const [isGerando, setIsGerando] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [ativosDinamicos, setAtivosDinamicos] = useState(['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'BBDC4', 'MGLU3']);
    const [isSincronizandoBolsa, setIsSincronizandoBolsa] = useState(false);
    const [mostrarDropdown1, setMostrarDropdown1] = useState(false);
    const [mostrarDropdown2, setMostrarDropdown2] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [consultarHistoricoAtivo, setConsultarHistoricoAtivo] = useState(false);

    {/* --- 1. HOOK: AUTO-LOAD ATUALIZADO (NEXUS B3 LIST) --- */}
    {/* --- HOOK CORE: ALIMENTAÇÃO DINÂMICA DE ATIVOS V4 (100% AUTOMATIZADO) --- */}
     useEffect(() => {
    let desativado = false;

    const sincronizarAtivosBolsa = async () => {
        if (!segmento) return;
        
        setIsSincronizandoBolsa(true);
        setAtivosDinamicos([]); 

        try {
            // ✅ MUDANÇA AQUI: Chame a Server Action, não a função direta do db
            const response = await getTickersAction(segmento);
            
            console.log("DEBUG [Segmento Enviado]:", segmento);
            console.log("DEBUG [Dados Recebidos]:", response);

            if (!desativado && response.success) {
                setAtivosDinamicos(response.tickers);
            }
        } catch (err) {
            console.error("Erro ao sincronizar base local de ativos:", err);
        } finally {
            if (!desativado) setIsSincronizandoBolsa(false);
        }
    };

    sincronizarAtivosBolsa();

    return () => {
        desativado = true;
    };
}, [segmento]);

    {/* --- 2. GRAVADOR DINÂMICO DE RASCUNHOS (OTIMIZADO PARA ESCALA) --- */}
    const salvarProgressoTela = async (mudancasImediatas = {}) => {
        // Silêncio total. Bloqueia chamadas desnecessárias ao banco e remove o erro de null.
        return;
    };

    
    {/* --- MÁSCARA DE MOEDA --- */}
    const handleMoney = (val, setter, campoNome) => {
        const value = val.replace(/\D/g, "");
        const formatted = (Number(value) / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
        });
        setter(formatted);
        salvarProgressoTela({ [campoNome]: formatted });
    };

    {/* --- AUXILIAR DE LIMPEZA DE STRING PARA NÚMERO PURO --- */}
    const stringParaNumero = (str) => {
        if (!str) return 0;
        const limpo = str.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    };

    const calcularFinanceiro = (percentualStr) => {
        const vInvestimento = stringParaNumero(investimento);
        const vPercentual = stringParaNumero(percentualStr);
        if (vInvestimento === 0 || vPercentual === 0) return '0,00';
        const resultado = (vInvestimento * vPercentual) / 100;
        return resultado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    {/* --- MOTOR DE EXPANSÃO DE CAPITAL (ALAVANCAGEM) --- */}
    {/* --- MOTOR DE EXPANSÃO DE CAPITAL (PADRÃO FOREX) --- */}
const obterMultiplicador = () => {
    if (!alavancagem) return 1;
    
    // Ajuste para Forex: Extrai o fator real de alavancagem (ex: 1:50 -> 50)
    if (alavancagem.includes(':')) {
        const token = alavancagem.split(':')[1];
        return parseFloat(token) || 1; 
    }
    
    // Padrão para B3
    const multBolsa = parseFloat(alavancagem.replace('x', ''));
    return isNaN(multBolsa) ? 1 : multBolsa;
};

    {/* --- INTELIGÊNCIA DO FATOR DE RISCO --- */}
    const getFatorStatus = () => {
        const vStopFin = stringParaNumero(calcularFinanceiro(stopPercent));
        const vAlvoFin = stringParaNumero(calcularFinanceiro(alvoPercent));

        if (!vStopFin || !vAlvoFin || vStopFin === 0) {
            return { ratio: "0 : 0", color: "text-slate-700", label: "Aguardando...", info: "Defina os percentuais de Stop e Alvo.", ehForex: false };
        }

        const ratio = Math.floor(vAlvoFin / vStopFin);
        let multiplicador = 1;
        let ehForex = false;

        if (alavancagem.includes(':')) {
            multiplicador = parseFloat(alavancagem.split(':')[1]) || 1;
            ehForex = true;
        } else {
            multiplicador = parseFloat(alavancagem.replace('x', '')) || 1;
        }

        const vStopPercentNum = stringParaNumero(stopPercent);
        let riscoRealPatrimonio = ehForex ? (vStopPercentNum * (multiplicador / 10)) : (vStopPercentNum * multiplicador);

        if (riscoRealPatrimonio >= 40 || (ehForex && multiplicador === 500 && vStopPercentNum > 1)) { 
            return { 
                ratio: `1 : ${ratio}`, 
                color: "text-red-500", 
                label: "ALTA EXPOSIÇÃO", 
                info: `Risco de Ruína Crítico: Devido à alavancagem utilizada, o balanço da conta corre risco de stop out agressivo.`,
                ehForex
            };
        }

        if (ratio >= 3) {
            return { ratio: `1 : ${ratio}`, color: "text-emerald-500", label: "Excelente", info: "Fator Ótimo: Retorno financeiro estimado 3x maior que o risco nominal.", ehForex };
        } else if (ratio >= 1) {
            return { ratio: `1 : ${ratio}`, color: "text-yellow-500", label: "Aceitável", info: "Fator Mediano: Retorno condizente com a média estatística.", ehForex };
        } else {
            return { ratio: `1 : ${ratio}`, color: "text-red-500", label: "Ruim", info: "Fator Crítico: Margem de perda desproporcional ao ganho esperado.", ehForex };
        }
    };

    // 1. Definição do status e multiplicador
const statusRisco = getFatorStatus();
const mult = obterMultiplicador();

// 2. DECLARAÇÃO DAS VARIÁVEIS (Isso precisa vir ANTES do cálculo da linha 176)
const vInvestimentoPuro = stringParaNumero(investimento);
const vStopPercentPuro = stringParaNumero(stopPercent);
const vAlvoPercentPuro = stringParaNumero(alvoPercent);

// 3. AGORA SIM, os cálculos que estavam dando erro:
const stopFinanceiroBase = (vInvestimentoPuro * vStopPercentPuro) / 100;
const alvoFinanceiroBase = (vInvestimentoPuro * vAlvoPercentPuro) / 100;

// 4. Cálculo do Financeiro Nocional (para os balões)
const valorNocional = vInvestimentoPuro * mult;
const stopFinanceiroAlavancado = (valorNocional * vStopPercentPuro) / 100;
const alvoFinanceiroAlavancado = (valorNocional * vAlvoPercentPuro) / 100;

// ──> 1. DECLARAÇÃO DA FUNÇÃO DE FECHAMENTO (Sana o ReferenceError)
const handleFecharModal = () => {
    setIsModalOpen(false);
    setModalData(null); // Expruga o cache de dados antigo na mesa pai!
};

// ──> 2. FLUXO DE GERAÇÃO DA ENGENHARIA ASSÍNCRONA CORRIGIDO
// src/app/TraderArea.jsx (Substitua a função handleGerarOperacao)

const handleGerarOperacao = async () => {
    // 🛡️ TRAVA MULTI-TENANT DE SEGURANÇA
    if (!user?.id) {
        alert("Erro de Autenticação: Sessão de usuário não identificada. Ação abortada por segurança.");
        return;
    }

    // Força o reset completo do estado antigo antes de abrir
    setModalData(null); 

    // Prepara a carga de dados que o modal usará para iniciar a esteira assíncrona
    const dadosOperacao = {
        userId: user?.id,
        symbol: ativo1.toUpperCase(),
        ativo2: ativo2 ? ativo2.toUpperCase() : null,
        tipoOperacao,
        segmento,
        investimento,
        alavancagem,
        stopPercent,
        alvoPercent,
        prazoValor,     
        prazoUnidade,    
        moeda,
        valorNocionalMonetario: parseFloat(investimento.toString().replace(/[^\d.-]/g, '')) * mult,
        stopNocionalMonetario: stopFinanceiroAlavancado,
        stopNocionalPercentual: `${(parseFloat(stopPercent) * mult).toFixed(2)}%`,
        gainNocionalMonetario: alvoFinanceiroAlavancado,
        gainNocionalPercentual: `${(parseFloat(alvoPercent) * mult).toFixed(2)}%`,
        consultarHistoricoAtivo // Opção da vacina Kaizen do Estrategista
    };

    // Abre o modal imediatamente passando os dados brutos da mesa.
    // O próprio useEffect do StrategyModal iniciará a Fase 1 (Rastreador) no client-side sem timeout!
    setModalData(dadosOperacao);
    setIsModalOpen(true);
};
    
    return (
        <div className="h-screen bg-[#05070a] text-white p-3 md:p-5 flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* CABEÇALHO */}
            <div className="mb-3 md:mb-6 flex justify-between items-end shrink-0">
            <div className="text-left">
                <h1 className="text-lg font-bold text-slate-100 tracking-wide uppercase">
                    Engenharia de Operação
                </h1>
                <p className="text-blue-500 font-bold text-[8px] tracking-[0.4em] uppercase mt-0.5 md:mt-1">
                    Phronis Terminal v1.0
                </p>
            </div>
        </div>

        
            <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 pr-1 text-slate-200">
                {/* LINHA 1: CONFIGURAÇÕES E FATOR DE RISCO */}
                <div className="grid grid-cols-12 gap-4 md:gap-6">
                    {/* ESTRATÉGIA */}
                    <div className="col-span-3 space-y-2 text-left">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Estratégia</label>
                        <select 
                            value={tipoOperacao}
                            onChange={(e) => {
                                const val = e.target.value;
                                setTipoOperacao(val);
                                const checkPairs = val === 'Long & Short';
                                setIsPairs(checkPairs);
                                let novaAlav = alavancagem;
                                if (val !== 'Day Trade' && segmento !== 'Forex') {
                                    novaAlav = '1x';
                                    setAlavancagem('1x');
                                }
                                salvarProgressoTela({ tipoOperacao: val, alavancagem: novaAlav });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                        >
                            <option value="Day Trade">Day Trade</option>
                            <option value="Swing Trade">Swing Trade</option>
                            <option value="Long & Short">Long & Short</option>
                            <option value="Position">Position</option>
                            <option value="Arbitragem">Arbitragem</option>
                        </select>
                    </div>

                    {/* SEGMENTO */}
<div className="col-span-3 space-y-2 text-left">
    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Segmento</label>
    <select 
        value={segmento}
        onChange={(e) => {
            const val = e.target.value;
            setSegmento(val);
            setAtivo1('');
            setAtivo2('');
            let novaAlav = alavancagem;
            let novaMoeda = moeda;
            if (val === 'Forex') {
                novaAlav = '1:100';
                novaMoeda = 'USD';
                setAlavancagem('1:100');
                setMoeda('USD');
            } else {
                novaAlav = '1x';
                novaMoeda = 'BRL';
                setAlavancagem('1x');
                setMoeda('BRL');
            }
            salvarProgressoTela({ segmento: val, ativo1: '', ativo2: '', alavancagem: novaAlav, moeda: novaMoeda });
        }}
        className="w-full h-[45px] bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
    >
        <option value="Ações">Ações (B3)</option>
        <option value="FIIs">Fundos Imobiliários (FIIs)</option>
        <option value="Forex">Forex</option>
        <option value="Indices">Indices (Derivativos)</option>
    </select>
</div>

                    {/* DROPDOWN DE ALAVANCAGEM */}
                    {(segmento === 'Forex' || tipoOperacao === 'Day Trade') && (
                        <div className="col-span-1 space-y-2 text-left animate-in fade-in zoom-in-95 duration-500">
                            <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${segmento === 'Forex' ? 'text-orange-500' : 'text-amber-500'}`}>Alav.</label>
                            <select 
                                value={alavancagem}
                                onChange={(e) => {
                                    setAlavancagem(e.target.value);
                                    salvarProgressoTela({ alavancagem: e.target.value });
                                }}
                                className={`w-full h-[45px] bg-slate-900 border rounded-2xl text-[11px] font-black outline-none transition-all cursor-pointer text-center appearance-none ${
                                    segmento === 'Forex' ? 'border-orange-500/30 text-orange-500 focus:border-orange-500' : 'border-amber-500/30 text-amber-500 focus:border-amber-500'
                                }`}
                            >
                                {segmento === 'Forex' ? (
                                    <>
                                        <option value="1:0">1:0</option>
                                        <option value="1:25">1:25</option>
                                        <option value="1:50">1:50</option>
                                        <option value="1:100">1:100</option>
                                        <option value="1:200">1:200</option>
                                        <option value="1:500">1:500</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="1x">1x</option>
                                        <option value="2x">2x</option>
                                        <option value="5x">5x</option>
                                        <option value="10x">10x</option>
                                        <option value="20x">20x</option>
                                        <option value="50x">50x</option>
                                    </>
                                )}
                            </select>
                        </div>
                    )}

                    {/* INDICADORES (Container Principal) */}
<div className={`${(segmento === 'Forex' || tipoOperacao === 'Day Trade') ? 'col-span-5' : 'col-span-6'} bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-around group transition-all duration-300`}>
    <div className="text-center relative">
        <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Fator de Risco</p>
            
            {/* O "Anchor" mantém o HelpCircle no lugar */}
            <div className="group/info relative inline-block">
                <HelpCircle size={10} className="text-slate-600 cursor-help hover:text-blue-500 transition-colors" />
                
                {/* O Balão agora é posicionado para 'vazar' o container */}
                {/* Mudamos para 'fixed' para ignorar o 'overflow' do container pai */}
                <div className="fixed opacity-0 group-hover/info:opacity-100 pointer-events-none transition-all duration-300 z-[9999]">
                    <div className="relative -translate-x-1/2 -translate-y-[calc(100%+15px)] w-56 p-4 bg-[#0a1128]/95 backdrop-blur-md border border-blue-500/30 rounded-2xl shadow-2xl">
                        <p className="text-[10px] leading-relaxed text-slate-300 font-medium normal-case tracking-normal">
                            {statusRisco.info}
                        </p>
                        {/* Seta na base */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-blue-500/30"></div>
                    </div>
                </div>
            </div>
        </div>
        <p className={`text-xl font-black transition-colors duration-500 ${statusRisco.color}`}>{statusRisco.ratio}</p>
    </div>
    
    <div className="h-10 w-px bg-white/5"></div>
    
    <div className="text-center">
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Ativo em Foco</p>
        <p className="text-xl font-black text-white uppercase tracking-tight">{ativo1 || '---'}</p>
    </div>
</div>
                </div>
                
    {/* LINHA 2: ATIVOS - COM DROPDOWN CUSTOMIZADO ESTILO PHRONES */}
       {/* LINHA 2: ATIVOS - COM SELEÇÃO DINÂMICA E DROPDOWN CUSTOMIZADO */}
<div className="grid grid-cols-12 gap-6 bg-slate-900/30 p-5 rounded-[32px] border border-white/5">
    
    {/* COLUNA: ATIVO 1 (PRINCIPAL / LONG) */}
    <div className={`${isPairs ? 'col-span-6' : 'col-span-12'} space-y-4 text-left transition-all duration-500 relative`}>
        <div className="flex justify-between items-center">
            <label className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">
                {isPairs ? 'Ativo 1 (Long)' : 'Ativo Principal'}
            </label>
            {isSincronizandoBolsa && (
                <span className="text-[9px] text-blue-400 font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    Sincronizando Feed...
                </span>
            )}
        </div>
        <div className="flex gap-4">
            <div className="relative flex-1">
                <input 
                    type="text"
                    placeholder={isSincronizandoBolsa ? "CARREGANDO MERCADO..." : "SELECIONE O ATIVO"} 
                    value={ativo1} 
                    disabled={isSincronizandoBolsa}
                    onFocus={() => setMostrarDropdown1(true)}
                    onBlur={() => setTimeout(() => setMostrarDropdown1(false), 250)} // Timeout leve para registrar o clique
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setAtivo1(val);
                        salvarProgressoTela({ ativo1: val });
                    }} 
                    className="w-full h-[45px] bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 text-xl font-black uppercase outline-none focus:border-blue-500 pr-12 disabled:opacity-50 transition-all" 
                />
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
            </div>
            {isPairs && (
                <div className="flex bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-inner animate-in fade-in zoom-in-95 duration-300">
                    <button className="px-8 py-3 bg-blue-600 text-[10px] font-black uppercase rounded-xl">Long</button>
                    <button className="px-8 py-3 text-slate-600 text-[10px] font-black uppercase rounded-xl">Short</button>
                </div>
            )}
        </div>

        {/* 🛠️ DROPDOWN PREMIUM AZUL ESCURO (Ativo 1) */}
        {mostrarDropdown1 && (
            <div className="absolute left-0 right-0 top-[85px] bg-[#0a1128] border border-blue-500/30 rounded-2xl shadow-2xl shadow-black/90 z-[999] max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/20 text-left">
                {ativosDinamicos && ativosDinamicos.filter(ticker => ticker.includes(ativo1.toUpperCase())).length > 0 ? (
                    ativosDinamicos
                        .filter(ticker => ticker.includes(ativo1.toUpperCase()))
                        .map((ticker) => (
                            <div 
                                key={ticker}
                                onMouseDown={() => {
                                    setAtivo1(ticker);
                                    salvarProgressoTela({ ativo1: ticker });
                                }}
                                className="px-4 py-3 text-xs font-medium text-white/70 hover:bg-blue-600/20 hover:text-blue-400 cursor-pointer border-b border-white/5 last:border-none transition-all duration-200 tracking-wider"
                            >
                                {ticker}
                            </div>
                        ))
                ) : (
                    <div className="p-3 text-xs text-white/30 italic text-center">Nenhum ativo localizado</div>
                )}
            </div>
        )}
    </div>

    {/* COLUNA: ATIVO 2 (SHORT / CONDICIONAL) */}
    {isPairs && (
        <div className="col-span-6 space-y-4 text-left animate-in fade-in slide-in-from-right-8 duration-700 relative">
            <label className="text-[10px] text-purple-500 font-black uppercase tracking-[0.2em]">Ativo 2 (Short)</label>
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <input 
                        type="text"
                        placeholder={isSincronizandoBolsa ? "CARREGANDO MERCADO..." : "SELECIONE O PAR"} 
                        value={ativo2} 
                        disabled={isSincronizandoBolsa}
                        onFocus={() => setMostrarDropdown2(true)}
                        onBlur={() => setTimeout(() => setMostrarDropdown2(false), 250)}
                        onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setAtivo2(val);
                            salvarProgressoTela({ ativo2: val });
                        }} 
                        className="w-full h-[45px] bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 text-xl font-black uppercase outline-none focus:border-purple-500 pr-12 disabled:opacity-50 transition-all" 
                    />
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
                </div>
                <div className="flex bg-slate-950 border border-slate-800 rounded-2xl p-1.5">
                    <button className="px-8 py-3 text-slate-600 text-[10px] font-black uppercase rounded-xl">Long</button>
                    <button className="px-8 py-3 bg-red-600 text-[10px] font-black uppercase rounded-xl">Short</button>
                </div>
            </div>

            {/* 🛠️ DROPDOWN PREMIUM PURPLE/AZUL (Ativo 2) */}
            {mostrarDropdown2 && (
                <div className="absolute left-0 right-0 top-[85px] bg-[#0a1128] border border-purple-500/30 rounded-2xl shadow-2xl shadow-black/90 z-[999] max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 text-left">
                    {ativosDinamicos && ativosDinamicos.filter(ticker => ticker.includes(ativo2.toUpperCase())).length > 0 ? (
                        ativosDinamicos
                            .filter(ticker => ticker.includes(ativo2.toUpperCase()))
                            .map((ticker) => (
                                <div 
                                    key={ticker}
                                    onMouseDown={() => {
                                        setAtivo2(ticker);
                                        salvarProgressoTela({ ativo2: ticker });
                                    }}
                                    className="px-4 py-3 text-xs font-medium text-white/70 hover:bg-blue-600/20 hover:text-blue-400 cursor-pointer border-b border-white/5 last:border-none transition-all duration-200 tracking-wider"
                                >
                                    {ticker}
                                </div>
                            ))
                    ) : (
                        <div className="p-3 text-xs text-white/30 italic text-center">Nenhum ativo localizado</div>
                    )}
                </div>
            )}
        </div>
    )}
</div> 

                {/* LINHA 4: HORIZONTE TEMPORAL */}
                <div className="grid grid-cols-12 gap-6 mt-6">
                    <div className="col-span-4 bg-slate-900/30 border border-white/5 rounded-[32px] p-6 flex items-center gap-6 group hover:border-blue-500/30 transition-all duration-300">
                        <div className="flex flex-col text-left">
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Prazo Estimado</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number"
                                    value={prazoValor}
                                    onChange={(e) => {
                                        setPrazoValor(e.target.value);
                                        salvarProgressoTela({ prazoValor: e.target.value });
                                    }}
                                    className="w-16 bg-slate-900/30 border border-slate-800 rounded-xl py-2 px-3 text-xl font-black text-blue-400 outline-none focus:border-blue-500 text-center"
                                    min="1"
                                />
                                <select 
                                    value={prazoUnidade}
                                    onChange={(e) => {
                                        setPrazoUnidade(e.target.value);
                                        salvarProgressoTela({ prazoUnidade: e.target.value });
                                    }}
                                    className="bg-slate-950 border border-slate-900 rounded-xl py-3 px-4 text-xs font-black text-slate-300 tracking-widest focus:border-blue-500 transition-all uppercase"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="Dias">Dias</option>
                                    <option value="Semanas">Semanas</option>
                                    <option value="Meses">Meses</option>
                                    <option value="Anos">Anos</option>
                                </select>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/10"></div>
                        <div className="flex-1 text-left">
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest italic">Exposição Prevista</p>
                            <p className="text-xs font-bold text-slate-400 mt-1">
                                O Prhones calibrará a volatilidade para <span className="text-blue-500">{prazoValor} {prazoUnidade}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="col-span-8">
                        <div 
                            onClick={() => setConsultarHistorico(!consultarHistorico)}
                            className={`rounded-[32px] p-6 border transition-all duration-500 cursor-pointer flex items-center justify-between group h-full
                                ${consultarHistorico 
                                    ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                                    : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-2xl transition-all duration-500 ${consultarHistorico ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-800 text-slate-500'}`}>
                                    <Database size={24} className={consultarHistorico ? 'animate-pulse' : ''} />
                                </div>
                                <div className="text-left">
                                    <h4 className={`text-sm font-black uppercase tracking-widest transition-colors ${consultarHistorico ? 'text-blue-400' : 'text-slate-400'}`}>
                                        Consultar Histórico de Operações
                                    </h4>
                                    <p className="text-[10px] font-medium text-slate-500 max-w-md mt-1 leading-relaxed">
                                        {consultarHistorico 
                                            ? "CONECTADO: A IA Phrones analisará seu histórico de performance para otimizar a assertividade desta estratégia."
                                            : "DESCONECTADO: A IA gerará a estratégia baseada apenas nos dados técnicos atuais do ativo."}
                                    </p>
                                </div>
                            </div>
                            <div className={`w-14 h-7 rounded-full p-1 transition-all duration-500 ${consultarHistorico ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-500 transform ${consultarHistorico ? 'translate-x-7' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* LINHA 3: MATRIZ DE PREÇOS + INVESTIMENTO + BALÕES */}
                <div className="grid grid-cols-12 gap-4 items-center">
                    
                    {/* GRUPO: MOEDA E INVESTIMENTO */}
                    <div className="col-span-3 grid grid-cols-3 gap-2 h-[102px]">
                        <div className="col-span-1 bg-slate-900 border border-white/5 p-3 rounded-[28px] flex flex-col justify-center items-center group hover:scale-105 transition-all duration-300">
                            <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Moeda</label>
                            <select 
                                value={moeda}
                                onChange={(e) => {
                                    setMoeda(e.target.value);
                                    salvarProgressoTela({ moeda: e.target.value });
                                }}
                                className="bg-slate-900 text-sm font-black text-indigo-400 outline-none cursor-pointer appearance-none text-center w-full focus:ring-0 border-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="BRL">R$</option>
                                <option value="USD">US$</option>
                                <option value="EUR">€</option>
                                <option value="BTC">₿</option>
                            </select>
                        </div>

                        <div className="col-span-2 bg-slate-900 border border-white/5 p-4 rounded-[32px] flex flex-col justify-center text-left group hover:scale-[1.05] transition-all duration-300">
                            <div className="flex items-center gap-2 text-indigo-400 mb-1">
                                <Coins size={12} />
                                <label className="text-[9px] font-black uppercase italic tracking-widest">Aporte</label>
                            </div>
                            <input 
                                value={investimento} 
                                onChange={(e) => handleMoney(e.target.value, setInvestimento, 'investimento')} 
                                className="w-full h-[30px] bg-transparent text-xl font-black outline-none italic text-indigo-400" 
                            />
                        </div>
                    </div>

                    {/* STOP LOSS NOMINAL */}
                    <div className="col-span-2 bg-slate-900 border border-white/5 p-4 h-[102px] rounded-[32px] flex flex-col justify-center text-left group hover:scale-[1.05] transition-all duration-300">
                        <div className="flex items-center gap-2 text-red-500 mb-1">
                            <ShieldAlert size={14} />
                            <label className="text-[10px] font-black uppercase italic tracking-widest">Stop Loss %</label>
                        </div>
                        <div className="relative">
                            <input 
                                value={stopPercent} 
                                onChange={(e) => handleMoney(e.target.value, setStopPercent, 'stopPercent')} 
                                className="w-full h-[30px] bg-transparent text-2xl font-black outline-none italic text-red-500" 
                                placeholder="0,00"
                            />
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-red-500/50 font-black italic">%</span>
                        </div>
                        <div className="text-[11px] font-black text-red-500/70 italic pt-1 tracking-wide truncate">
                            {moeda} {stopFinanceiroBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* ALVO NOMINAL */}
                    <div className="col-span-2 bg-slate-900 border border-white/5 p-4 h-[102px] rounded-[32px] flex flex-col justify-center text-left group hover:scale-[1.05] transition-all duration-300">
                        <div className="flex items-center gap-2 text-emerald-500 mb-1">
                            <Target size={14} />
                            <label className="text-[10px] font-black uppercase italic tracking-widest">Alvo Final %</label>
                        </div>
                        <div className="relative">
                            <input 
                                value={alvoPercent} 
                                onChange={(e) => handleMoney(e.target.value, setAlvoPercent, 'alvoPercent')} 
                                className="w-full h-[30px] bg-transparent text-2xl font-black outline-none italic text-emerald-500" 
                                placeholder="0,00"
                            />
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-500/50 font-black italic">%</span>
                        </div>
                        <div className="text-[11px] font-black text-emerald-500/70 italic pt-1 tracking-wide truncate">
                            {moeda} {alvoFinanceiroBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* BALÕES CONDICIONAIS */}
                    {(mult > 1) ? (
                        <div className="col-span-3 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-red-950/20 border border-red-500/15 p-4 h-[102px] rounded-[32px] text-left flex flex-col justify-center">
                                <span className="text-[8px] font-black uppercase tracking-wider text-red-400">Risco Nocional</span>
                                <span className="text-[11px] font-bold text-slate-400 mt-1 leading-tight">
                                    Perda Real de <span className="text-red-500 font-black">{moeda} {stopFinanceiroAlavancado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </span>
                            </div>

                            <div className="bg-emerald-950/20 border border-emerald-500/15 p-4 h-[102px] rounded-[32px] text-left flex flex-col justify-center">
                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">Retorno Nocional</span>
                                <span className="text-[11px] font-bold text-slate-400 mt-1 leading-tight">
                                    Ganho Real de <span className="text-emerald-500 font-black">{moeda} {alvoFinanceiroAlavancado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="col-span-3 h-[102px]"></div>
                    )}

                    {/* BOTÃO GERAR */}
                    <div 
                        onClick={handleGerarOperacao}
                        className="col-span-2 h-[102px] bg-blue-600 rounded-[32px] flex flex-col justify-center items-center shadow-xl shadow-blue-900/20 group cursor-pointer hover:bg-blue-500 transition-all active:scale-95"
                    >
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/60">Engenharia</p>
                        <div className="flex items-center gap-2 text-white">
                            <span className="text-base font-black uppercase italic">Gerar</span>
                            <Plus className="group-hover:rotate-90 transition-transform duration-500" size={16} />
                        </div>
                    </div>
                </div>
            </div>

         <StrategyModal 
    isOpen={isModalOpen} 
    onClose={handleFecharModal} // <── Passa a função que limpa tudo
    data={modalData} 
    user={user}
/>
        </div>
    );
  }