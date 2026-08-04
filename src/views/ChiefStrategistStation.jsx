'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '@/components/UI';
import { 
  BrainCircuit, 
  ShieldAlert, 
  Target, 
  Sparkles, 
  Calendar as CalendarIcon,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { getChiefStrategistReportsAction } from '@/app/actions';

// ──> MODAL PARA EXPANDIR O RELATÓRIO COMPLETO
function ModalRelatorioExpandido({ isOpen, onClose, data }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden animate-fade-in">
      <div className="absolute inset-0 bg-[#030508]/95 backdrop-blur-2xl" onClick={onClose}></div>
      <Card className="relative w-full max-w-3xl bg-[#070a10] border-slate-800 shadow-2xl p-8 max-h-[90vh] overflow-y-auto rounded-[32px] text-left custom-scrollbar">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white bg-white/5 rounded-full transition-colors focus:outline-none"
        >
          <X size={18} />
        </button>

        <div className="mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
              <BrainCircuit size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-purple-400 uppercase tracking-widest">
                  Ciclo #{data.cicloAlvo}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  • {new Date(data.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Diretriz de Escada Kaizen
              </h3>
            </div>
          </div>
        </div>

        <div className="space-y-6 font-sans text-xs">
          <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
              🔎 DIAGNÓSTICO DE REGIME COGNITIVO
            </span>
            <p className="text-slate-200 leading-relaxed font-mono text-xs">{data.diagnosticoRegime}</p>
          </div>

          <div className="p-5 bg-red-500/[0.02] border border-red-500/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert size={16} />
              <span className="text-[10px] font-black uppercase tracking-wider block">
                VACINA / VULNERABILIDADES HISTÓRICAS BLOQUEADAS
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed font-mono italic">{data.vulnerabilidadesBloqueadas}</p>
          </div>

          <div className="p-5 bg-amber-500/[0.02] border border-amber-500/20 rounded-2xl space-y-2 font-mono">
            <div className="flex items-center gap-2 text-amber-400 font-sans">
              <Target size={16} />
              <span className="text-[10px] font-black uppercase tracking-wider block">
                PARAMETRIZAÇÃO E CALIBRAGEM DE RISCO DA MESA
              </span>
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">{data.calibragemRisco}</p>
          </div>

          <div className="p-5 bg-emerald-500/[0.02] border border-emerald-500/20 rounded-2xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
              🎯 TESE MESTRA OPERACIONAL DO CICLO
            </span>
            <p className="text-emerald-300 leading-relaxed font-bold text-sm bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
              {data.diretrizOperacional}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end">
          <Button onClick={onClose} className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
            Fechar Visualização
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ──> VIEW PRINCIPAL DO ESTRATEGISTA CHEFE
export default function ChiefStrategistStation({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. ESTADO DOS DROPDOWNS DE MÊS E ANO
  const hoje = new Date();
  const [selectedMonth, setSelectedMonth] = useState(hoje.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(hoje.getFullYear());

  // 2. ESTADOS DE PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 3. MODAL DE EXPANSÃO
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Busca relatórios do banco Neon DB
  const fetchReports = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await getChiefStrategistReportsAction(user.id);
      if (response.success) {
        setReports(response.reports || []);
      } else {
        console.error("Erro ao carregar relatórios:", response.error);
      }
    } catch (error) {
      console.error("Erro de comunicação ao buscar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user?.id]);

  // Reseta para a primeira página quando o filtro de Mês/Ano mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear]);

  // Filtra por Mês e Ano selecionados e garante ordenação do mais recente ao mais antigo
  const relatoriosFiltradosEOrdenados = useMemo(() => {
    if (!reports.length) return [];
    
    return reports
      .filter(r => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === Number(selectedYear) && (d.getMonth() + 1) === Number(selectedMonth);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Mais recente -> Mais antigo
  }, [reports, selectedMonth, selectedYear]);

  // Paginação dos dados
  const totalPages = Math.ceil(relatoriosFiltradosEOrdenados.length / rowsPerPage);
  const relatoriosPaginados = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return relatoriosFiltradosEOrdenados.slice(startIndex, startIndex + rowsPerPage);
  }, [relatoriosFiltradosEOrdenados, currentPage, rowsPerPage]);

  const relatorioVigente = reports[0]; // O relatório mais recente absoluto para o destaque

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 text-left">
      
      {/* MODAL EXPANSÍVEL */}
      <ModalRelatorioExpandido 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={modalData} 
      />

      {/* HEADER DA VIEW */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/60 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <BrainCircuit size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inteligência Kaizen</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Estrategista Chefe</h2>
          <p className="text-slate-500 text-xs mt-1">Diretrizes macroeconômicas, autópsias cumulativas e imunidade operacional da mesa.</p>
        </div>

        {/* SELETOR DE MÊS E ANO (DROPDOWNS INTELIGENTES) */}
<div className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
  <CalendarIcon size={16} className="text-purple-400" />
  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Período:</span>
  
  {/* DROPDOWN DE MÊS */}
  <select 
    value={selectedMonth}
    onChange={(e) => setSelectedMonth(Number(e.target.value))}
    className="bg-slate-950 border border-slate-800 rounded-xl py-1 px-3 text-xs font-bold text-purple-300 outline-none cursor-pointer focus:border-purple-500"
  >
    {[
      { val: 1, label: 'Janeiro' },
      { val: 2, label: 'Fevereiro' },
      { val: 3, label: 'Março' },
      { val: 4, label: 'Abril' },
      { val: 5, label: 'Maio' },
      { val: 6, label: 'Junho' },
      { val: 7, label: 'Julho' },
      { val: 8, label: 'Agosto' },
      { val: 9, label: 'Setembro' },
      { val: 10, label: 'Outubro' },
      { val: 11, label: 'Novembro' },
      { val: 12, label: 'Dezembro' }
    ].map(m => (
      <option key={m.val} value={m.val}>{m.label}</option>
    ))}
  </select>

  {/* DROPDOWN DE ANO DINÂMICO (GERADO AUTOMATICAMENTE) */}
  <select 
    value={selectedYear}
    onChange={(e) => setSelectedYear(Number(e.target.value))}
    className="bg-slate-950 border border-slate-800 rounded-xl py-1 px-3 text-xs font-bold text-purple-300 outline-none cursor-pointer focus:border-purple-500"
  >
    {(() => {
      const anoAtual = new Date().getFullYear();
      const anoInicial = 2024; // Ano de início da plataforma
      const anos = [];
      
      // Constrói do ano inicial até 2 anos no futuro
      for (let y = anoInicial; y <= anoAtual + 2; y++) {
        anos.push(y);
      }
      
      return anos.map(ano => (
        <option key={ano} value={ano}>{ano}</option>
      ));
    })()}
  </select>
</div>
      </header>

      {/* RELATÓRIO VIGENTE (DESTAQUE) */}
      {relatorioVigente ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2">
              <Sparkles size={14} /> Diretriz Operacional Ativa (Ciclo #{relatorioVigente.cicloAlvo})
            </h3>
            <button 
              onClick={() => { setModalData(relatorioVigente); setIsModalOpen(true); }}
              className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20 transition-all"
            >
              <Maximize2 size={13} /> Expandir Análise
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                  🔎 Diagnóstico de Regime Cognitivo
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-mono bg-black/20 p-4 rounded-2xl border border-white/5 line-clamp-3">
                  {relatorioVigente.diagnosticoRegime}
                </p>
              </div>

              <div className="bg-slate-900/40 border border-emerald-500/20 p-6 rounded-3xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                  🎯 Diretriz Operacional (Regra de Ouro)
                </span>
                <p className="text-xs text-emerald-300 font-bold leading-relaxed bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 line-clamp-2">
                  {relatorioVigente.diretrizOperacional}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-red-500/20 p-6 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <ShieldAlert size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Vacina Bloqueada</span>
                </div>
                <p className="text-xs text-slate-300 font-mono leading-relaxed bg-red-500/5 p-4 rounded-2xl border border-red-500/10 line-clamp-3 italic">
                  {relatorioVigente.vulnerabilidadesBloqueadas}
                </p>
              </div>

              <div className="bg-slate-900/40 border border-amber-500/20 p-6 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Target size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Parametrização</span>
                </div>
                <p className="text-xs text-slate-300 font-mono leading-relaxed bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 line-clamp-2">
                  {relatorioVigente.calibragemRisco}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/20 border border-slate-800 rounded-3xl text-slate-500 font-mono text-xs">
          Nenhuma diretriz cadastrada ainda.
        </div>
      )}

      {/* TABELA DE HISTÓRICO COM PAGINAÇÃO */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-purple-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Histórico ({relatoriosFiltradosEOrdenados.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
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

        <Card className="bg-slate-900/20 border-slate-800 overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="px-6 py-4">Ciclo / Data</th>
                <th className="px-6 py-4">Diagnóstico do Regime</th>
                <th className="px-6 py-4">Diretriz Operacional</th>
                <th className="px-6 py-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-500 uppercase text-[10px] tracking-widest font-black">
                    Carregando relatórios do Neon DB...
                  </td>
                </tr>
              ) : relatoriosPaginados.length > 0 ? (
                relatoriosPaginados.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/30 hover:bg-purple-500/5 transition-all group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-purple-400 text-xs">Ciclo #{row.cicloAlvo}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(row.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-slate-300 text-xs truncate font-mono">{row.diagnosticoRegime}</p>
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <p className="text-emerald-400 text-xs truncate font-semibold">{row.diretrizOperacional}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => { setModalData(row); setIsModalOpen(true); }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 mx-auto"
                      >
                        <Maximize2 size={12} /> Expandir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-slate-600 uppercase text-[10px] tracking-widest font-black opacity-40">
                    Nenhum registro encontrado para o mês/ano selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* CONTROLE DE PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-500 font-bold">
              Exibindo <span className="text-slate-300">{(currentPage - 1) * rowsPerPage + 1}</span> a{' '}
              <span className="text-slate-300">{Math.min(currentPage * rowsPerPage, relatoriosFiltradosEOrdenados.length)}</span> de{' '}
              <span className="text-purple-400">{relatoriosFiltradosEOrdenados.length}</span> relatórios
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
                PÁGINA <span className="text-purple-400">{currentPage}</span> / {totalPages}
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
      </div>

    </div>
  );
}