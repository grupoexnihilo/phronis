'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, HelpCircle, ArrowUpRight, ArrowDownRight, BrainCircuit, Eye, FileText, Target, Search, ChevronDown } from 'lucide-react';
// 🛡️ CORREÇÃO 1: Importando da nova actions centralizada no seu ecossistema
import { createOperationFromHistory, getActiveTargetCycle } from '@/app/actions'; 
// (Nota: Se a getSimulationsFromDB não estiver na actions.js, mantenha o importe original dela abaixo)
import { getSimulationsFromDB } from '@/db/actions';

export default function InsertHistoryModal({ isOpen, onClose, clientName, user, onRefresh }) {

    // --- 1. ESTADOS ORIGINAIS ---
  const [tipoOperacao, setTipoOperacao] = useState('Day Trade');
  const [segmento, setSegmento] = useState('Ações');
  const [investimento, setInvestimento] = useState('0,00');
  const [delta, setDelta] = useState('0,00');
  const [isProfit, setIsProfit] = useState(true);
  const [mercado, setMercado] = useState('B3'); 
  const [leverage, setLeverage] = useState('1x');
  
  // --- 2. ESTADOS CAPTURADOS PARA O SCHEMA ---
  const [dataInicio, setDataInicio] = useState(''); 
  const [dataFim, setDataFim] = useState('');
  const [ativo1, setAtivo1] = useState(''); 
  const [ativo2, setAtivo2] = useState(''); // Estado adicionado (estava faltando no seu arquivo original)
  const [simulationId, setSimulationId] = useState(''); 
  const [observacao, setObservacao] = useState(''); 
  const [simulationsList, setSimulationsList] = useState([]);
  const [isLoadingSims, setIsLoadingSims] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // GOVERNANÇA DE CICLOS E METAS GLOBAIS
  const [activeCycle, setActiveCycle] = useState(null); 
  const [isLoadingCycle, setIsLoadingCycle] = useState(false);
  const [linkToObjective, setLinkToObjective] = useState(false);

  // ESTADOS DO DROPDOWN CUSTOMIZADO COM PESQUISA
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Estados para o Painel Condicional e Sub-Popup da IA
  const [selectedSimulationData, setSelectedSimulationData] = useState(null);
  const [isAiTextOpen, setIsAiTextOpen] = useState(false);

  // --- 3. LÓGICA DE CÁLCULO DE ROI ---
  const calcularROI = () => {
    const vAporte = parseFloat(investimento.replace(/\./g, '').replace(',', '.')) || 0;
    let vDelta = parseFloat(delta.replace(/\./g, '').replace(',', '.')) || 0;
    if (!isProfit) vDelta = vDelta * -1;
    if (vAporte > 0) return ((vDelta / vAporte) * 100).toFixed(2);
    return "0.00";
  };

  const roiFinal = calcularROI();
  const isPositivo = parseFloat(roiFinal) >= 0;

  // --- 4. MÁSCARA DE DINHEIRO ---
  const handleMoneyChange = (value, setter) => {
    const cleanValue = value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    setter(numberValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  };

 // --- EFFECTS: SINCRONIZAÇÃO E CARREGAMENTO ---
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    
    async function loadModalContext() {
      try {
        setIsLoadingCycle(true);
        setIsLoadingSims(true);
        
        console.log("🔍 DEBUG MODAL: Buscando ciclo para o User ID:", user.id);

        // Dispara as buscas de forma isolada para que se uma falhar, não quebre a outra
        const cycleRes = await getActiveTargetCycle(user.id).catch(e => {
          console.error("Erro isolado na busca do ciclo:", e);
          return null;
        });
        
        console.log("🔍 DEBUG MODAL: Resposta do Banco para o Ciclo:", cycleRes);

        let simsData = [];
        try {
          simsData = await getSimulationsFromDB();
        } catch (e) {
          console.error("Erro isolado na busca das simulações:", e);
        }
        
        if (cycleRes?.success && cycleRes?.cycle) {
          setActiveCycle(cycleRes.cycle);
          setLinkToObjective(true); // Se tem ciclo, liga a chave sozinho!
        } else {
          setActiveCycle(null);
          setLinkToObjective(false);
        }

        let rawSims = Array.isArray(simsData) ? simsData : (simsData?.data || []);
        const sortedSims = rawSims
          .filter(sim => sim && sim.id)
          .sort((a, b) => Number(b.id) - Number(a.id));
        setSimulationsList(sortedSims);

      } catch (err) {
        console.error("Falha geral ao carregar contexto via Server Actions:", err);
      } finally {
        setIsLoadingCycle(false);
        setIsLoadingSims(false);
      }
    }

    loadModalContext();
  }, [isOpen, user?.id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (simulationId) {
      const found = simulationsList.find(sim => String(sim.id) === String(simulationId));
      if (found) {
        setSelectedSimulationData(found);
        if (found.ativo1) setAtivo1(found.ativo1);
        if (found.tipoOperacao) setTipoOperacao(found.tipoOperacao);
      }
    } else {
      setSelectedSimulationData(null);
      setIsAiTextOpen(false);
    }
  }, [simulationId, simulationsList]);

  useEffect(() => {
    const handleEsc = (e) => { 
      if (e.key === 'Escape') {
        if (isAiTextOpen) {
          setIsAiTextOpen(false);
        } else {
          onClose();
        }
      } 
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isAiTextOpen]);

  if (!isOpen) return null;
  const isPairs = tipoOperacao === 'Long & Short' || tipoOperacao === 'Arbitragem';

  const filteredSimulations = simulationsList.filter(sim => {
    const term = searchQuery.toLowerCase();
    const simId = String(sim.id);
    const asset = (sim.ativo1 || '').toLowerCase();
    const type = (sim.tipoOperacao || '').toLowerCase();
    return simId.includes(term) || asset.includes(term) || type.includes(term);
  }).slice(0, 10);

  const currentSelectedSim = simulationsList.find(s => String(s.id) === String(simulationId));

  // --- DISPARO DE SALVAMENTO ATUALIZADO VIA API ROUTE ---
  const handleConfirmAndArchive = async () => {
    if (!ativo1) {
      alert("Por favor, selecione ou digite o Ativo da operação.");
      return;
    }

    // 🛡️ CORREÇÃO 2: Formatação estrita dos valores para evitar erro no banco
    const cleanAporte = parseFloat(investimento.replace(/\./g, '').replace(',', '.')) || 0;
    let cleanResultado = parseFloat(delta.replace(/\./g, '').replace(',', '.')) || 0;
    if (!isProfit) cleanResultado = cleanResultado * -1;

    if (cleanAporte <= 0) {
      alert("O valor de Aporte precisa ser maior que R$ 0,00.");
      return;
    }

    try {
      setIsSubmitting(true);

      const assetFinal = isPairs && ativo2 
        ? `${ativo1.trim().toUpperCase()} VS ${ativo2.trim().toUpperCase()}`
        : ativo1.trim().toUpperCase();

      const computedObjectiveId = linkToObjective ? (activeCycle?.id ? Number(activeCycle.id) : null) : null;

      // 🛡️ CORREÇÃO 3: Montando o payload garantindo tipos puros e repassando tudo que a Action espera
      const payload = {
        userId: Number(user?.id),
        objectiveId: computedObjectiveId,
        simulationId: simulationId ? Number(simulationId) : null,
        tipoOperacao: tipoOperacao,
        ativo1: assetFinal, 
        investimento: cleanAporte,
        resultado: cleanResultado,
        status: isProfit ? 'win' : 'loss',
        observacao: observacao,
        leverage: leverage,
        dataInicio: dataInicio || new Date().toISOString(), // Fallback de data
        dataFim: dataFim || new Date().toISOString()        // Fallback de data
      };

      const res = await createOperationFromHistory(payload);

      if (res?.success === false) {
        alert(`Erro na gravação: ${res.error}`);
      } else {
        alert("Operação consolidada com sucesso e base atualizada!");
        if (onRefresh) {
          await onRefresh();
        }

        setAtivo1('');
        setAtivo2('');
        setInvestimento('0,00');
        setDelta('0,00');
        setSimulationId('');
        setObservacao('');
        setDataInicio('');
        setDataFim('');
        setSearchQuery('');
        onClose();
      }
    } catch (error) {
      console.error("Falha ao submeter operação histórica via Server Action:", error);
      alert("Erro na execução da regra de negócios no servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restante do seu código Visual...
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6 animate-in fade-in duration-300">
      
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col transition-all relative">
        
        {/* HEADER */}
        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50 shrink-0">
          <div>
            <h3 className="text-white font-black text-2xl uppercase tracking-widest italic text-left">Registrar Operação</h3>
            <p className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-1 text-left">
              {clientName ? `Auditoria para: ${clientName}` : 'Alimentação de Histórico Phrones'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        {/* CONTEÚDO COM ROLAGEM INTERNA */}
        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* CAIXA DE SELEÇÃO GLOBAL EM DINÂMICA DE CORES (AJUSTE 3) */}
<div className={`p-6 border rounded-3xl flex items-center justify-between gap-6 animate-in slide-in-from-top-3 duration-400 text-left transition-all duration-300 ${
  linkToObjective 
    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20' // 🟢 Estado: Contar
    : 'bg-slate-950/40 border-slate-800' // ⚪ Estado: Isolar (Padrão)
}`}>
  <div className="flex items-center gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-colors duration-300 ${
      linkToObjective ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'
    }`}>
      <Target size={22} className={`transition-colors duration-300 ${linkToObjective ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
    </div>
    <div>
      <span className={`text-[8px] font-black uppercase tracking-widest block transition-colors duration-300 ${
        linkToObjective ? 'text-emerald-400' : 'text-slate-500'
      }`}>Objetivo de Conta Corrente</span>
      
      {/* ONDE EXIBE O VALOR DA META DENTRO DO CARD DO TOGGLE */}
      {isLoadingCycle ? (
        <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider animate-pulse">Sincronizando diretriz global...</h4>
      ) : (
        <>
          <h4 className={`text-sm font-black uppercase tracking-wider transition-colors ${linkToObjective ? 'text-white' : 'text-slate-400'}`}>
            {linkToObjective 
              ? (activeCycle?.nickname || "Objetivo Global Vinculado") 
              : "Operação Avulsa (Isolada)"}
          </h4>
          <p className="text-[11px] mt-0.5 font-medium">
            {linkToObjective && activeCycle ? (
          <>Meta Ativa: <span className="text-emerald-400 font-mono font-bold tracking-widest">R$ {Number(activeCycle.targetGoal || activeCycle.target_goal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></>
            ) : (
              <span className="text-slate-500">Nenhum ciclo vinculado. Salvando no ledger geral.</span>
            )}
          </p>
        </>
      )}
    </div>
  </div>

  {/* TOGGLE SWITCH CUSTOMIZADO */}
  <label className={`relative inline-flex items-center select-none ${activeCycle ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
    <input 
      type="checkbox" 
      checked={linkToObjective}
      onChange={(e) => activeCycle && setLinkToObjective(e.target.checked)}
      disabled={!activeCycle}
      className="sr-only peer"
    />
    <div className="w-14 h-8 bg-slate-950 rounded-full border border-slate-800 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-slate-700 peer-checked:after:bg-emerald-500 after:border-slate-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:border-emerald-500/40"></div>
    <span className={`ml-3 text-[10px] font-black uppercase tracking-widest w-12 transition-colors duration-300 ${
      linkToObjective ? 'text-emerald-400' : 'text-slate-500'
    }`}>
      {linkToObjective ? 'Contar' : 'Isolar'}
    </span>
  </label>
</div>
          {/* TIPO E MERCADO */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block text-left">Tipo de Operação</label>
              <select 
                value={tipoOperacao} 
                onChange={(e) => {
                  setTipoOperacao(e.target.value);
                  if (e.target.value !== 'Day Trade' && segmento !== 'Forex') {
                    setLeverage('1x');
                  }
                }} 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Day Trade">Day Trade</option>
                <option value="Swing Trade">Swing Trade</option>
                <option value="Long & Short">Long & Short</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block text-left">Mercado</label>
              <select 
                value={mercado}
                onChange={(e) => {
                  const val = e.target.value;
                  setMercado(val);
                  if (val === 'Forex') {
                    setSegmento('Forex');
                    setLeverage('1:100');
                  } else {
                    if (segmento === 'Forex') setSegmento('Ações');
                    setLeverage('1x');
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="B3">B3 (Brasil)</option>
                <option value="NYSE">NYSE (EUA)</option>
                <option value="Forex">Forex (Internacional)</option>
              </select>
            </div>
          </div>

          {/* DATAS FIXAS COM SUPORTE A DATA E HORA (RELOGINHO DE VOLTA) */}
<div className="grid grid-cols-2 gap-6">
  <div className="space-y-1.5">
    <label className="text-[9px] text-blue-500 font-black uppercase tracking-widest block text-left">Início da Operação</label>
    <input 
      type="datetime-local" 
      value={dataInicio}
      onChange={(e) => setDataInicio(e.target.value)}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500 transition-all [color-scheme:dark] cursor-pointer" 
    />
  </div>
  <div className="space-y-1.5">
    <label className="text-[9px] text-blue-500 font-black uppercase tracking-widest block text-left">Fim da Operação</label>
    <input 
      type="datetime-local" 
      value={dataFim}
      onChange={(e) => setDataFim(e.target.value)}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500 transition-all [color-scheme:dark] cursor-pointer" 
    />
  </div>
</div>

          {/* ALAVANCAGEM CONDICIONAL */}
          {((mercado !== 'Forex' && tipoOperacao === 'Day Trade') || mercado === 'Forex') && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[9px] text-orange-500 font-black uppercase tracking-widest block text-left">
                {mercado === 'Forex' ? 'Alavancagem da Conta (Forex Proporcional)' : 'Fator de Alavancagem (Poder de Compra Day Trade)'}
              </label>
              <select 
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-full bg-slate-950 border border-orange-500/20 rounded-xl py-4 px-5 text-sm text-orange-400 outline-none focus:border-orange-500/50 cursor-pointer appearance-none font-mono font-bold"
              >
                {mercado === 'Forex' ? (
                  <>
                    <option value="1:25" className="bg-slate-950 text-white">1:25</option>
                    <option value="1:50" className="bg-slate-950 text-white">1:50</option>
                    <option value="1:100" className="bg-slate-950 text-white">1:100</option>
                    <option value="1:200" className="bg-slate-950 text-white">1:200</option>
                    <option value="1:500" className="bg-slate-950 text-orange-500">1:500 (High Leverage)</option>
                  </>
                ) : (
                  <>
                    <option value="1x" className="bg-slate-950 text-white">1x (Sem Alavancagem)</option>
                    <option value="5x" className="bg-slate-950 text-white">5x</option>
                    <option value="10x" className="bg-slate-950 text-white">10x</option>
                    <option value="20x" className="bg-slate-950 text-white">20x</option>
                    <option value="50x" className="bg-slate-950 text-white">50x</option>
                    <option value="100x" className="bg-slate-950 text-orange-500">100x (High Risk)</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* SEGMENTO E SELETOR DE SIMULAÇÃO MODIFICADO */}
          <div className="space-y-6 p-6 bg-white/5 rounded-3xl border border-white/5">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block text-left">Segmento do Ativo</label>
                <select 
                  value={segmento} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setSegmento(val);
                    if (val === 'Forex') {
                      setMercado('Forex');
                      setLeverage('1:100');
                    } else if (mercado === 'Forex') {
                      setMercado('B3');
                      setLeverage('1x');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Ações">Ações</option>
                  <option value="FIIs">FIIs</option>
                  <option value="ETFs">ETFs</option>
                  <option value="Opções">Opções</option>
                  <option value="Forex">Forex</option>
                </select>
              </div>

              {/* DROPDOWN CUSTOMIZADO COM BUSCA INTELIGENTE */}
              <div className="space-y-1.5 text-left" ref={dropdownRef}>
                <label className="text-[9px] text-purple-500 font-black uppercase tracking-widest flex items-center gap-1">
                  <BrainCircuit size={12} className="text-purple-400" /> Vincular à Simulação IA
                </label>
                
                <div className="relative">
                  <button
                    type="button"
                    disabled={isLoadingSims}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-slate-950 border border-purple-500/20 text-purple-300 rounded-xl py-4 px-5 text-sm outline-none focus:border-purple-500 flex justify-between items-center font-bold transition-all disabled:opacity-30"
                  >
                    <span className="truncate">
                      {currentSelectedSim 
                        ? `ID: ${currentSelectedSim.id} — ${currentSelectedSim.ativo1 || 'Op'} (${currentSelectedSim.tipoOperacao})`
                        : "Nenhum vínculo (Operação Avulsa)"}
                    </span>
                    <ChevronDown size={16} className={`text-purple-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-[105%] left-0 w-full bg-slate-950 border border-purple-500/30 rounded-xl shadow-2xl z-[180] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col p-2 space-y-2">
                      {/* CAMPO DE PESQUISA */}
                      <div className="relative flex items-center px-2">
                        <Search size={14} className="absolute left-5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Pesquisar por Ativo ou ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-white/5 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      {/* LISTA DE OPÇÕES */}
                      <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSimulationId('');
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium transition-colors ${!simulationId ? 'bg-purple-600/20 text-purple-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          Nenhum vínculo (Operação Avulsa)
                        </button>

                        {filteredSimulations.length > 0 ? (
                          filteredSimulations.map(sim => (
                            <button
                              key={sim.id}
                              type="button"
                              onClick={() => {
                                setSimulationId(String(sim.id));
                                setIsDropdownOpen(false);
                                setSearchQuery('');
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-mono transition-colors flex justify-between items-center ${String(simulationId) === String(sim.id) ? 'bg-purple-600 text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                            >
                              <span className="truncate">ID: {sim.id} — {sim.ativo1 || 'Op'}</span>
                              <span className="text-[10px] opacity-60 px-2 py-0.5 rounded bg-black/40 font-sans">{sim.tipoOperacao}</span>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-4 text-xs text-slate-600">Nenhuma simulação encontrada</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EXPANSIVIDADE CONDICIONAL DO PARECER DA IA */}
            {selectedSimulationData && (
              <div className="p-5 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300">
                <div className="grid grid-cols-2 md:flex md:items-center gap-x-6 gap-y-2 text-left">
                  <div>
                    <span className="text-[8px] text-purple-400 font-black uppercase tracking-wider block">ID Ref</span>
                    <span className="font-mono text-xs font-bold text-white">#{selectedSimulationData.id}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-purple-400 font-black uppercase tracking-wider block">Data Geração</span>
                    <span className="text-xs font-bold text-slate-300">
                      {selectedSimulationData.createdAt ? new Date(selectedSimulationData.createdAt).toLocaleDateString('pt-BR') : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-purple-400 font-black uppercase tracking-wider block">Modelo</span>
                    <span className="text-xs font-bold text-slate-300">{selectedSimulationData.tipoOperacao}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-purple-400 font-black uppercase tracking-wider block">Probabilidade</span>
                    <span className="text-xs font-black italic text-emerald-400">{selectedSimulationData.winRate}% WinRate</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAiTextOpen(true)}
                  className="h-9 px-4 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 shadow-lg shadow-purple-900/30"
                >
                  <Eye size={12} />
                  Ver Parecer IA
                </button>
              </div>
            )}

            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] text-blue-500 font-black uppercase tracking-widest block text-left">{isPairs ? 'Ativo 1 (Principal)' : 'Ativo'}</label>
                <input 
                  type="text"
                  value={ativo1}
                  onChange={(e) => setAtivo1(e.target.value)}
                  placeholder="Selecione ou digite o ativo..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500 font-bold uppercase" 
                />
              </div>
              {isPairs && (
                <div className="flex-1 space-y-1.5 animate-in slide-in-from-right-4 duration-300">
                  <label className="text-[9px] text-blue-500 font-black uppercase tracking-widest block text-left">Ativo 2 (Secundário)</label>
                  <input 
                    type="text"
                    value={ativo2}
                    onChange={(e) => setAtivo2(e.target.value)}
                    placeholder="Ativo para Short..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-5 text-sm text-white outline-none focus:border-blue-500 font-bold uppercase" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* FINANCEIRO */}
          <div className="grid grid-cols-2 gap-8 p-8 bg-slate-950/50 rounded-3xl border border-white/5 relative">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-left">Aporte (R$)</label>
                <div className="group relative">
                  <HelpCircle size={12} className="text-slate-600 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-slate-950 border border-white/10 rounded-xl text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-all z-50 shadow-2xl">Capital alocado.</div>
                </div>
              </div>
              <input type="text" value={investimento} onChange={(e) => handleMoneyChange(e.target.value, setInvestimento)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-xl font-bold text-white outline-none focus:border-blue-500 transition-all" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className={`text-[9px] font-black uppercase tracking-widest text-left ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                  Delta ({isProfit ? 'Lucro' : 'Prejuízo'})
                </label>
              </div>
              <div className="relative flex items-center">
                <button 
                  type="button"
                  onClick={() => setIsProfit(!isProfit)}
                  className={`absolute left-3 z-10 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl transition-all ${isProfit ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}
                >
                  {isProfit ? '+' : '-'}
                </button>
                <input 
                  type="text" 
                  value={delta} 
                  onChange={(e) => handleMoneyChange(e.target.value, setDelta)} 
                  className={`w-full bg-slate-950 border rounded-2xl py-4 pl-16 pr-6 text-xl font-bold outline-none transition-all ${isProfit ? 'border-emerald-500/20 text-emerald-500 focus:border-emerald-500' : 'border-red-500/20 text-red-500 focus:border-red-500'}`} 
                />
              </div>
            </div>

            {/* ROI AUTOMÁTICO */}
            <div className="col-span-2 pt-6 border-t border-white/5 mt-2 flex justify-between items-center">
              <div className="flex flex-col items-start">
                <label className="text-[9px] text-blue-500 font-black uppercase tracking-widest">Retorno sobre Investimento</label>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter italic">Performance Líquida Phrones</p>
              </div>
              <div className="flex items-center gap-3">
                {isPositivo ? <ArrowUpRight className="text-emerald-500" /> : <ArrowDownRight className="text-red-500" />}
                <span className={`text-4xl font-black italic tracking-tighter transition-all ${isPositivo ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isPositivo ? '+' : ''}{roiFinal}%
                </span>
              </div>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block text-left">Observações de Mesa do Operador</label>
            <textarea 
              rows="3"
              placeholder="Descreva a tática adotada, o humor do mercado na entrada ou notas de auditoria..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-slate-200 outline-none focus:border-blue-500 font-medium resize-none transition-all"
            />
          </div>

        </div>

        {/* FOOTER FIXO */}
        <div className="px-10 py-8 bg-slate-950/50 border-t border-white/5 shrink-0">
          <button 
            type="button"
            onClick={handleConfirmAndArchive}
            disabled={isSubmitting}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white rounded-[20px] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-900/40 group active:scale-[0.98]"
          >
            <Save size={22} className="group-hover:scale-110 transition-transform" />
            <span className="font-black text-sm uppercase tracking-[0.3em]">
              {isSubmitting ? 'Consolidando no Neon...' : 'Confirmar e Arquivar'}
            </span>
          </button>
        </div>

        {/* SUB-POPUP DA IA */}
        {isAiTextOpen && selectedSimulationData && (
          <div className="absolute inset-0 z-[150] bg-slate-950/95 backdrop-blur-xl flex flex-col p-10 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-6">
              <div className="flex items-center gap-3 text-left">
                <FileText className="text-purple-500" size={24} />
                <div>
                  <h4 className="text-white font-black text-xl uppercase italic">Parecer do Estrategista Chefe</h4>
                  <p className="text-purple-400 font-mono text-[10px] uppercase tracking-widest">Simulação #{selectedSimulationData.id} — {selectedSimulationData.ativo1}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAiTextOpen(false)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 text-left space-y-4 custom-scrollbar text-slate-300 text-sm leading-relaxed font-medium">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[9px] text-purple-400 font-black uppercase tracking-widest block mb-2">Resumo Técnico</span>
                <p className="font-mono text-xs text-slate-400 bg-black/30 p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
                  {selectedSimulationData.technicalSummary || "Sem resumo técnico estruturado."}
                </p>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest block mb-2">Diretriz da Estratégia</span>
                <p className="whitespace-pre-wrap">
                  {selectedSimulationData.strategy || "Nenhum texto de estratégia fornecido."}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <button 
                type="button"
                onClick={() => setIsAiTextOpen(false)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all"
              >
                Voltar à Auditoria (ESC)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}