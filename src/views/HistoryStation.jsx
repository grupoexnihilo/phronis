'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/UI';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BrainCircuit, 
  Eye, 
  X,   
  Calendar as CalendarIcon,
  Target,
  Layers,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { db } from '../db/db';
import { targetCycles, operations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RefreshCw } from 'lucide-react';
import { fetchUserHistoryData } from '@/app/actions';
import { saveHistoryCycleAction, deleteHistoryCycleAction, getHistoryCyclesAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { iniciarDiretrizEstrategistaAction } from '@/app/actions';
import { salvarRelatorioEstrategistaAction } from '@/app/actions';
import { verificarStatusAnalisePorId } from '@/app/actions';



// ──> 1. MODAL DE AUDITORIA (OPERADO POR PROPS - ANTES DE DETALHES_OPERACAO)
function DetalhesOperacaoModal({ isOpen, onClose, data }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[#05070a]/90 backdrop-blur-xl" onClick={onClose}></div>
      <Card className="relative w-full max-w-xl bg-[#090b11] border-white/5 shadow-2xl p-8 max-h-[85vh] overflow-y-auto rounded-[32px] text-left custom-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white bg-white/5 rounded-full transition-colors">
          <X size={18} />
        </button>
        <div className="mb-6">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-500">Auditoria Operacional</h3>
          <p className="text-xs text-slate-400 mt-1">{data.type || 'Mesa'} • {data.asset?.toUpperCase()}</p>
        </div>
        <div className="space-y-4 font-sans text-xs">
          <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Entrada</span>
              <p className="text-sm font-mono text-white mt-0.5">{data.start || '--'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Saída / Encerramento</span>
              <p className="text-sm font-mono text-white mt-0.5">{data.end || '--'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Aporte Inicial</span>
              <p className="text-sm font-bold text-slate-200 mt-0.5">{data.invested || 'R$ 0,00'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Retorno (ROI)</span>
              <p className={`text-sm font-black mt-0.5 ${data.status?.toLowerCase() === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>{data.percent || '0%'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Delta Realizado</span>
              <p className={`text-sm font-mono font-black mt-0.5 ${data.status?.toLowerCase() === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>{data.result || 'R$ 0,00'}</p>
            </div>
          </div>
          {data.proporcao && (
            <div className="p-4 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">Proporção Balanceada (Spread)</span>
              <p className="text-xs text-slate-300 font-mono mt-1">{data.proporcao}</p>
            </div>
          )}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Tese Aplicada na Época</span>
            <p className="text-slate-300 leading-relaxed italic font-light">
              {data.technicalSummary || data.strategy || "Nenhum relatório técnico anexado a esta auditoria."}
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
          <Button onClick={onClose} className="px-6 py-2.5 bg-slate-900 border border-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl">
            Fechar Relatório
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ──> 2. NOVO: MODAL DO RELATÓRIO DO ESTRATEGISTA CHEFE
function ModalRelatorioEstrategista({ isOpen, onClose, data }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[#030508]/95 backdrop-blur-2xl" onClick={onClose}></div>
      <Card className="relative w-full max-w-2xl bg-[#070a10] border-white/5 shadow-2xl p-8 max-h-[90vh] overflow-y-auto rounded-[32px] text-left custom-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white bg-white/5 rounded-full transition-colors focus:outline-none">
          <X size={18} />
        </button>
        <div className="mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <BrainCircuit size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-500">Diretriz de Escada Kaizen</h3>
              <p className="text-xl font-bold text-white tracking-tight mt-0.5">Ciclo Calibrado</p>
            </div>
          </div>
        </div>
        <div className="space-y-5 font-sans text-xs">
          <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block mb-1">🔎 DIAGNÓSTICO DE REGIME COGNITIVO</span>
            <p className="text-slate-300 leading-relaxed font-light">{data.diagnosticoRegime}</p>
          </div>
          <div className="p-5 bg-red-500/[0.01] border border-red-500/10 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block mb-1">🛡️ VULNERABILIDADES HISTÓRICAS BLOQUEADAS (VACINA)</span>
            <p className="text-slate-300 leading-relaxed font-light italic">{data.vulnerabilidadesBloqueadas}</p>
          </div>
          <div className="p-5 bg-amber-500/[0.01] border border-amber-500/10 rounded-2xl font-mono">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-2 font-sans">⚙️ PARÂMETROS E CALIBRAGEM DE RISCO DA MESA</span>
            <p className="text-slate-200 leading-relaxed text-[11px]">{data.calibragemRisco}</p>
          </div>
          <div className="p-5 bg-emerald-500/[0.01] border border-emerald-500/10 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">🎯 TESE MESTRA OPERACIONAL DO CICLO</span>
            <p className="text-slate-200 leading-relaxed font-bold">{data.diretrizOperacional}</p>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
          <Button onClick={onClose} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
            Aplicar Diretrizes na Mesa
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ──> 3. SEU COMPONENTE PRINCIPAL (ÚNICO EXPORT DEFAULT DA VIEW)
export default function HistoryStation({ user }) {
  const router = useRouter();
  
  // ABAS PRINCIPAIS
  const [activeTab, setActiveTab] = useState('trades'); 

  // ESTADOS DO HISTÓRICO DE TRADES (FILTROS)
  const [filterMode, setFilterMode] = useState('mensal'); 
  const [selectedPeriod, setSelectedPeriod] = useState(''); 
  const [startDate, setStartDate] = useState(''); 
  const [endDate, setEndDate] = useState('');     
  const [selectedGoalId, setSelectedGoalId] = useState('todos'); 

  // ESTADOS DE PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // ESTADOS DO HISTÓRICO DE OBJETIVOS (NEON DB)
  const [cycles, setCycles] = useState([]);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // ESTADOS DO ESTRATEGISTA CHEFE 
  const [loadingEstrategista, setLoadingEstrategista] = useState(false);
  const [modalEstrategistaOpen, setModalEstrategistaOpen] = useState(false);
  const [dadosEstrategista, setDadosEstrategista] = useState(null);

  // FUNÇÃO DE DISPARO DO ESTRATEGISTA CHEFE
  const handleDispararEstrategista = async () => {
    if (!user?.id) {
        alert("Sessão de usuário não identificada.");
        return;
    }

    setLoadingEstrategista(true);

    try {
        // ──> STEP 1: Aciona o Gatilho Assíncrono que libera o timeout da Vercel em milissegundos
        // Importe 'iniciarDiretrizEstrategistaAction' e 'salvarRelatorioEstrategistaAction' no topo do arquivo se necessário
        const resultGatilho = await iniciarDiretrizEstrategistaAction(user.id);

        if (!resultGatilho.success) {
            throw new Error(resultGatilho.error || "Falha ao iniciar canal do estrategista.");
        }

        const { jobId } = resultGatilho;

        // ──> STEP 2: 🛰️ O POLLING - Fica pingando a tabela temporária a cada 2.5 segundos
        const intervalId = setInterval(async () => {
            // Reutiliza a action estável de checagem que ajustamos no actions.js
            const statusResponse = await verificarStatusAnalisePorId(jobId);

            if (statusResponse.status === 'COMPLETED') {
                clearInterval(intervalId); // Para o ping imediatamente ao concluir

                // ──> STEP 3: Consolida os dados gerados de rascunho na tabela oficial chiefStrategistReports
                const consolidacao = await salvarRelatorioEstrategistaAction(user.id, jobId);

                if (consolidacao && consolidacao.success) {
                    console.log("🟢 [KAIZEN] Diretriz Macro e Vacinas gravadas com sucesso no Neon DB!");
                    
                    // Alerta operacional limpo informando o ciclo gerado
                    alert(`Estrategista Treinado com Sucesso! Ciclo Operacional #${consolidacao.ciclo} Iniciado.`);
                    
                    // REATIVIDADE PURA: Atualiza os estados locais se a sua tela carregar o histórico em tempo real
                    if (typeof loadHistoryData === 'function') {
                        await loadHistoryData();
                    }
                    
                    setLoadingEstrategista(false);
                } else {
                    clearInterval(intervalId);
                    alert(`Falha ao consolidar relatório definitivo: ${consolidacao.error}`);
                    setLoadingEstrategista(false);
                }
            } 
            else if (statusResponse.status === 'ERROR') {
                clearInterval(intervalId);
                alert("O motor Phronesis falhou ao computar os desvios históricos.");
                setLoadingEstrategista(false);
            }
        }, 2500); // Frequência calibrada para preservar conexões com o Neon

    } catch (error) {
        console.error("🔴 Erro na esteira assíncrona do Estrategista:", error);
        alert(`Erro operacional: ${error.message}`);
        setLoadingEstrategista(false);
    }
};

  // Inicializa os inputs de data com o momento atual do sistema
  useEffect(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    if (filterMode === 'diario') {
      setSelectedPeriod(`${ano}-${mes}-${dia}`);
    } else if (filterMode === 'mensal') {
      setSelectedPeriod(`${ano}-${mes}`);
    }
    setCurrentPage(1); 
  }, [filterMode]);

  // Buscar operações do Neon
  const fetchTrades = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await db.select().from(operations).where(eq(operations.userId, user.id));
      setTrades(res || []);
    } catch (error) {
      console.error("Erro ao buscar operações do Neon:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // FORMULÁRIO DO OBJETIVO
  const [formCycle, setFormCycle] = useState({
    nickname: '',
    initialCapital: '',
    targetGoal: '',
    status: 'EM ANDAMENTO'
  });

  // Carregar ciclos do banco de dados
  const fetchCycles = async () => {
    if (!user?.id) return;
    try {
        const result = await getHistoryCyclesAction(user.id);
        let dataArray = [];
        if (result && result.success) {
            if (Array.isArray(result.payload)) {
                dataArray = result.payload;
            } else if (result.payload && typeof result.payload === 'object') {
                dataArray = result.payload.data || result.payload.rows || [];
            }
        }
        setCycles(dataArray); 
    } catch (error) {
        console.error("Erro de comunicação no fetchCycles:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { trades, cycles } = await fetchUserHistoryData(user.id);
      setTrades(trades);
      setCycles(cycles);
      setLoading(false);
    };
    loadData();
  }, [user, activeTab]);

  // Salvar / Editar Ciclo
  const handleSaveCycle = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const payload = {
        userId: user.id,
        id: editingCycle ? editingCycle.id : null, 
        nickname: formCycle.nickname,
        initialCapital: formCycle.initialCapital,
        targetGoal: formCycle.targetGoal,
        status: formCycle.status
      };

      const result = await saveHistoryCycleAction(payload);
      if (result.success) {
          setIsCycleModalOpen(false);
          setEditingCycle(null);
          setFormCycle({ nickname: '', initialCapital: '', targetGoal: '', status: 'EM ANDAMENTO' });
          fetchCycles(); 
          router.refresh();
          alert("Objetivo salvo com sucesso.");
      } else {
          alert("Erro ao salvar: " + result.error);
      }
    } catch (error) {
      console.error("Erro ao salvar ciclo:", error);
    }
  };

  // Excluir Ciclo
  const handleDeleteCycle = async (id) => {
    if (!window.confirm("Deseja realmente excluir este registro de objetivo permanentemente?")) return;
    try {
      const result = await deleteHistoryCycleAction(id);
      if (result.success) {
          fetchCycles(); 
          router.refresh();
      } else {
          alert("Erro ao deletar registro: " + result.error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (cycle) => {
    setEditingCycle(cycle);
    setFormCycle({
      nickname: cycle.nickname || '',
      initialCapital: cycle.initialCapital || '',
      targetGoal: cycle.targetGoal || '',
      status: cycle.status || 'EM ANDAMENTO'
    });
    setIsCycleModalOpen(true);
  };

  const formatCurrency = (val) => {
    const num = Number(val);
    return isNaN(num) ? 'R$ 0,00' : `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'CONSOLIDADO': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'CANCELADO': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'EM ANDAMENTO':
      default: return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    }
  };

  const tradesFiltradosEAlinhados = useMemo(() => {
    if (!trades) return [];
    return trades.filter((trade) => {
      if (selectedGoalId !== 'todos') {
        if (!trade.objectiveId) return false; 
        const idDropdown = String(selectedGoalId).trim();
        const idOperacao = String(trade.objectiveId).trim();
        if (idOperacao !== idDropdown) return false;
      }
      if (!trade.start) return false;

      const partes = trade.start.split(' ')[0].split('/'); 
      if (partes.length < 2) return true;
      const diaOperacao = parseInt(partes[0], 10);
      const mesOperacao = parseInt(partes[1], 10);

      if (filterMode === 'diario' && selectedPeriod) {
        const [anoF, mesF, diaF] = selectedPeriod.split('-').map(Number);
        return diaOperacao === diaF && mesOperacao === mesF;
      }
      if (filterMode === 'mensal' && selectedPeriod) {
        const [anoF, mesF] = selectedPeriod.split('-').map(Number);
        return mesOperacao === mesF;
      }
      if (filterMode === 'personalizado' && startDate && endDate) {
        const inicio = new Date(startDate);
        const fim = new Date(endDate);
        const anoAtual = new Date().getFullYear();
        const dataOp = new Date(anoAtual, mesOperacao - 1, diaOperacao);
        inicio.setHours(0,0,0,0);
        fim.setHours(23,59,59,999);
        return dataOp >= inicio && dataOp <= fim;
      }
      return true;
    });
  }, [trades, filterMode, selectedPeriod, startDate, endDate, selectedGoalId]);

  const aproveitamentoPercentual = useMemo(() => {
    const encerradas = tradesFiltradosEAlinhados.filter(t => t.status === 'win' || t.status === 'loss');
    if (encerradas.length === 0) return '0%';
    const vitorias = encerradas.filter(t => t.status === 'win').length;
    return `${((vitorias / encerradas.length) * 100).toFixed(1)}%`;
  }, [tradesFiltradosEAlinhados]);

  const deltaFinanceiroDinamic = useMemo(() => {
    return tradesFiltradosEAlinhados.reduce((acc, t) => {
      if (!t.result) return acc;
      const val = Number(String(t.result).replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [tradesFiltradosEAlinhados]);

  const totalPages = Math.ceil(tradesFiltradosEAlinhados.length / rowsPerPage);
  const tradesPaginados = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return tradesFiltradosEAlinhados.slice(startIndex, startIndex + rowsPerPage);
  }, [tradesFiltradosEAlinhados, currentPage, rowsPerPage]);


  {/*Return Principal Aqui */}
  return (
    <div className="p-8 w-full max-w-7xl mx-auto animate-fade-in pb-20">
      
      {/* ──> MODAL SUBSTITUÍDO: Exibe dados puros de auditoria instantaneamente */}
      <DetalhesOperacaoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={modalData} />

      {/* HEADER DA VIEW */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Central de Auditoria</h2>
          <p className="text-slate-500 text-sm">Navegue entre o histórico operacional e o registro estratégico de objetivos.</p>
        </div>

        {/* CONTROLE DE ABAS (TABS) */}
        <div className="flex bg-slate-950 p-1 rounded-full border border-slate-800 self-start md:self-center">
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-5 py-2 rounded-full text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'trades' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Layers size={14} /> OPERAÇÕES REGISTRADAS
          </button>
          <button
            onClick={() => setActiveTab('objetivos')}
            className={`px-5 py-2 rounded-full text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'objetivos' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Target size={14} /> HISTÓRICO DE OBJETIVOS
          </button>
        </div>
      </header>

      {/* ================== ABA 1: HISTÓRICO DE TRADES ================== */}
      {activeTab === 'trades' && (
        <>
          {/* Grid de Resumo e Filtros Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Card className="md:col-span-2 bg-slate-900/40 p-4 border-slate-800 flex flex-col justify-between gap-4">
              <div className="flex gap-4 w-full">
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Escala Temporal</span>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full">
                    {['diario', 'mensal', 'personalizado'].map((mode) => (
                      <button 
                        key={mode} 
                        type="button" 
                        onClick={() => setFilterMode(mode)}
                        className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all uppercase ${
                          filterMode === mode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {mode === 'diario' ? 'DIÁRIO' : mode === 'mensal' ? 'MENSAL' : 'PERZ.'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col flex-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Período</span>
                  {filterMode !== 'personalizado' ? (
                    <div className="relative">
                      <input 
                        type={filterMode === 'diario' ? "date" : "month"} 
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-[10px] font-bold text-blue-500 outline-none cursor-pointer" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600"><CalendarIcon size={12} /></div>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[9px] font-bold text-blue-500 outline-none" />
                      <span className="text-slate-600 text-[10px]">Até</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[9px] font-bold text-blue-500 outline-none" />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/50 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Aproveitamento</span>
              <p className="text-2xl font-bold text-white tracking-tighter">{aproveitamentoPercentual}</p>
              <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-tighter italic">Win Rate Médio</p>
            </div>
            
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/50 flex flex-col justify-center">
              <span className="text-[10px] text-emerald-500/50 font-bold uppercase tracking-widest">Resultado</span>
              <p className={`text-sm leading-tight font-bold ${deltaFinanceiroDinamic >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {deltaFinanceiroDinamic >= 0 ? '+' : ''} {formatCurrency(deltaFinanceiroDinamic)}
              </p>
              <p className="text-[9px] text-slate-600 font-mono mt-1 italic tracking-widest font-bold uppercase">Delta Financeiro</p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/50 flex flex-col justify-center items-center">
              <span className="text-[10px] text-blue-500/50 font-bold uppercase tracking-widest mb-2">Status Geral</span>
              <div className="flex gap-1 text-blue-500">
                {[...Array(5)].map((_, i) => {
                  const winRateNum = parseFloat(aproveitamentoPercentual.replace('%', '')) || 0;
                  
                  let bolinhasParaAcender = 1; 
                  if (winRateNum >= 70) bolinhasParaAcender = 5;
                  else if (winRateNum >= 55) bolinhasParaAcender = 4;
                  else if (winRateNum >= 45) bolinhasParaAcender = 3;
                  else if (winRateNum >= 30) bolinhasParaAcender = 2;
                  else if (winRateNum > 0) bolinhasParaAcender = 1;

                  const estaAtiva = i < bolinhasParaAcender;

                  return (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${
                        estaAtiva 
                          ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]' 
                          : 'bg-slate-800'
                      }`} 
                    />
                  );
                })}
              </div>
              <span className="text-[8px] text-slate-500 font-bold uppercase mt-2 tracking-wider">
                {parseFloat(aproveitamentoPercentual.replace('%', '')) >= 55 ? 'Consistente' : 'Revisar Tática'}
              </span>
            </div>
          </div>

          {/* SELEÇÕES DE FILTRO AVANÇADO */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider whitespace-nowrap">Filtrar por Objetivo:</span>
              <select
                value={selectedGoalId}
                onChange={(e) => { setSelectedGoalId(e.target.value); setCurrentPage(1); }}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:border-blue-500 min-w-[200px]"
              >
                <option value="todos">🗂️ EXIBIR TODOS OS OBJETIVOS</option>
                {cycles.map((c) => (
                  <option key={c.id} value={String(c.id)}>🎯 {c.nickname || `Ciclo #${c.id}`}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Linhas:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-400 rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                <option value={10}>10 linhas</option>
                <option value={25}>25 linhas</option>
                <option value={50}>50 linhas</option>
              </select>
            </div>
          </div>

          {/* Tabela de Trades */}
          <Card className="bg-slate-900/20 border-slate-800 overflow-hidden mb-4 backdrop-blur-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                  <th className="px-6 py-4">Ativo</th>
                  <th className="px-6 py-4">Objetivo Alvo</th>
                  <th className="px-6 py-4">Entrada</th>
                  <th className="px-6 py-4">Saída</th>
                  <th className="px-6 py-4">Aporte</th>
                  <th className="px-6 py-4 text-center">Alvo (T/S)</th>
                  <th className="px-6 py-4 text-center">ROI</th>
                  <th className="px-6 py-4">Delta / Fin.</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-300 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-10 text-center text-slate-500 uppercase text-[10px] tracking-widest font-black">
                      Sincronizando operações com o Neon...
                    </td>
                  </tr>
                ) : tradesPaginados.length > 0 ? (
                  tradesPaginados.map((row) => {
                    const isLongShort = row.type === 'Long Short' || (row.asset && row.asset.includes('VS'));
                    const [pontaLong, pontaShort] = isLongShort ? row.asset.split(' VS ') : [row.asset, ''];
                    const statusLower = row.status?.toLowerCase().trim() || 'open';

                    const objetivoVinculado = cycles.find(c => String(c.id) === String(row.objectiveId));
                    const nomeObjetivo = objetivoVinculado ? objetivoVinculado.nickname : `Avulso (ID: ${row.objectiveId || 'Nenhum'})`;

                    return (
                      <tr key={row.id} className="border-b border-slate-800/30 hover:bg-blue-500/5 transition-all group">
                        
                        {/* COLUNA 1: ATIVO */}
                        {isLongShort ? (
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider">▲ Long</span>
                                <span className="font-black text-sm text-white">{pontaLong}</span>
                              </div>
                              <span className="text-slate-600 font-black italic text-[10px] self-end pb-1">VS</span>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase text-red-500 tracking-wider">▼ Short</span>
                                <span className="font-black text-sm text-white">{pontaShort}</span>
                              </div>
                            </div>
                          </td>
                        ) : (
                          <td className="px-6 py-5 font-black text-sm text-white tracking-wider">{row.asset?.toUpperCase()}</td>
                        )}

                        {/* COLUNA 2: OBJETIVO */}
                        <td className="px-6 py-5">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            row.objectiveId ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-500'
                          }`}>
                            🎯 {nomeObjetivo}
                          </span>
                        </td>

                        {/* COLUNA 3: ENTRADA */}
                        <td className="px-6 py-5 font-mono text-[11px] text-slate-400">{row.start || '--'}</td>
                        
                        {/* COLUNA 4: SAÍDA */}
                        <td className="px-6 py-5 font-mono text-[11px] text-slate-400">{statusLower === 'open' ? '--/--' : (row.end || '--')}</td>
                        
                        {/* COLUNA 5: APORTE */}
                        <td className="px-6 py-5 font-mono text-slate-300">
                          <div className="flex flex-col">
                            <span>{row.invested || 'R$ 0,00'}</span>
                            <span className="text-[10px] text-indigo-400 font-sans font-bold uppercase">{row.type || 'Mesa'}</span>
                          </div>
                        </td>

                        {/* COLUNA 6: ALVO */}
                        <td className="px-6 py-5 text-center font-mono text-[11px]">
                          {isLongShort ? (
                            <span className="text-indigo-400 font-bold">{row.proporcao || '--'}</span>
                          ) : (
                            <div className="text-slate-500">
                              <span className="text-emerald-500/70">T: {row.take || '--'}</span>
                              <span className="text-slate-700 px-1">|</span>
                              <span className="text-rose-500/70">S: {row.stop || '--'}</span>
                            </div>
                          )}
                        </td>

                        {/* COLUNA 7: ROI */}
                        <td className="px-6 py-5 text-center font-bold">
                          {statusLower === 'open' ? (
                            <span className="text-blue-500 animate-pulse text-[10px] font-black uppercase">Em Aberto</span>
                          ) : (
                            <div className={`flex items-center justify-center gap-1 ${statusLower === 'win' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {row.percent}
                            </div>
                          )}
                        </td>

                        {/* COLUNA 8: DELTA FINANCEIRO */}
                        <td className={`px-6 py-5 font-bold font-mono ${statusLower === 'open' ? 'text-slate-600' : statusLower === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {statusLower === 'open' ? 'R$ --' : (row.result || '--')}
                        </td>

                        {/* COLUNA 9: AÇÕES */}
                        <td className="px-6 py-5 text-center">
                          {/* ──> 3. MUDANÇA DE ÍCONE: Info trocado por Eye */}
                          <button onClick={() => { setModalData(row); setIsModalOpen(true); }} className="text-slate-600 hover:text-blue-500 transition-all p-1">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="p-16 text-center text-slate-600 uppercase text-[10px] tracking-widest font-black opacity-30">
                      Nenhuma operação encontrada para o conjunto de filtros selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* PAGINAÇÃO */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-8">
              <span className="text-xs text-slate-500 font-bold">
                Exibindo <span className="text-slate-300">{(currentPage - 1) * rowsPerPage + 1}</span> a{' '}
                <span className="text-slate-300">{Math.min(currentPage * rowsPerPage, tradesFiltradosEAlinhados.length)}</span> de{' '}
                <span className="text-blue-500">{tradesFiltradosEAlinhados.length}</span> auditorias
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-xs font-black text-slate-400 px-3">
                  PÁGINA <span className="text-blue-500">{currentPage}</span> / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================== ABA 2: HISTÓRICO DE OBJETIVOS ================== */}
      {activeTab === 'objetivos' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider italic">
              Gerenciador de Metas Estratégicas
            </h3>
            <p className="text-[11px] text-slate-500 font-medium italic">
              Apenas leitura e ajustes de auditoria do passado.
            </p>
          </div>
          <Card className="bg-slate-900/20 border-slate-800 overflow-hidden mb-10 backdrop-blur-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                  <th className="px-6 py-4">Estação / Nickname</th>
                  <th className="px-6 py-4">Capital Alocado</th>
                  <th className="px-6 py-4">Meta Alvo</th>
                  <th className="px-6 py-4 text-center">Status Operacional</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-300 font-medium">
                {cycles.length > 0 ? (
                  cycles.map((cycle) => (
                    <tr key={cycle.id} className="border-b border-slate-800/30 hover:bg-emerald-500/5 transition-all group">
                      <td className="px-6 py-5 font-black text-sm text-white tracking-wider">
                        {cycle.nickname || <span className="text-slate-600 italic">Não Informado</span>}
                      </td>
                      <td className="px-6 py-5 font-mono text-slate-300 text-sm">
                        {formatCurrency(cycle.initialCapital)}
                      </td>
                      <td className="px-6 py-5 font-mono text-emerald-400 font-bold text-sm">
                        {formatCurrency(cycle.targetGoal)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full border text-[9px] font-black tracking-widest ${getStatusStyle(cycle.status)}`}>
                          {cycle.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => openEditModal(cycle)}
                            className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                            title="Editar Objetivo"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCycle(cycle.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="Excluir Registro"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-16 text-center text-slate-600 uppercase text-[10px] tracking-widest font-black opacity-30">
                      Nenhum ciclo ou objective arquivado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* MODAL ESTRATÉGICO DE OBJETIVOS */}
      {isCycleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h4 className="text-lg font-black text-white italic uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              {editingCycle ? '⚙️ Parametrizar Objetivo' : '➕ Novo Registro Estratégico'}
            </h4>
            
            <form onSubmit={handleSaveCycle} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Identificação / Nickname</label>
                <input 
                  type="text" 
                  required
                  value={formCycle.nickname}
                  onChange={(e) => setFormCycle({...formCycle, nickname: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all"
                  placeholder="Ex: Ciclo de Alavancagem Tática"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Capital Inicial (R$)</label>
                  <input 
                    type="number" 
                    required
                    value={formCycle.initialCapital}
                    onChange={(e) => setFormCycle({...formCycle, initialCapital: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono font-bold text-white outline-none focus:border-emerald-500 transition-all"
                    placeholder="250.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Meta Alvo (R$)</label>
                  <input 
                    type="number" 
                    required
                    value={formCycle.targetGoal}
                    onChange={(e) => setFormCycle({...formCycle, targetGoal: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500 transition-all"
                    placeholder="2500.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status do Objetivo</label>
                <select
                  value={formCycle.status}
                  onChange={(e) => setFormCycle({...formCycle, status: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="EM ANDAMENTO">⚠️ EM ANDAMENTO</option>
                  <option value="CONSOLIDADO">✅ CONSOLIDADO</option>
                  <option value="CANCELADO">❌ CANCELADO</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCycleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Botão Neural de Performance Baseado na Aba Ativa */}
<Button 
  onClick={handleDispararEstrategista}
  disabled={loadingEstrategista}
  className={`w-full py-6 text-white flex items-center justify-center gap-5 group transition-all rounded-2xl shadow-2xl border border-blue-400/20 ${
    loadingEstrategista 
      ? 'bg-blue-800 cursor-not-allowed opacity-70' 
      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
  }`}
>
  <BrainCircuit size={26} className={`group-hover:scale-110 transition-transform text-blue-100 ${loadingEstrategista ? 'animate-spin' : ''}`} />
  <div className="text-left">
    <p className="font-black text-sm uppercase tracking-[0.1em] leading-none">
      {loadingEstrategista ? "Processando Escada Kaizen..." : "Treinar Estrategista Chefe"}
    </p>
    <p className="text-[10px] text-blue-100 mt-1 opacity-60 font-medium italic">
      {loadingEstrategista 
        ? "Cruzando autópsias de erros, afinidades de regime e injetando vacinas no Neon DB..."
        : activeTab === 'trades' 
          ? "Sincronizar rede neural com o histórico operacional do cliente" 
          : "Analisar consistência histórica de metas consolidadas vs. drawdowns"}
    </p>
  </div>
</Button>
    </div>
  );
}