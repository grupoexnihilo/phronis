'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Calendar, TrendingUp, Shield, Loader2, Search, BrainCircuit, Eye, Archive, X } from 'lucide-react';
import { getSimulationsFromDB, archiveSimulationInDB } from '@/app/actions';

export default function SimulationsView({ user }) {
    const [allSimulations, setAllSimulations] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ──> ESTADOS DOS INPUTS DE FILTRO
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterType, setFilterType] = useState('TODOS');

    // ──> ESTADO EFETIVO APLICADO (Evita bugs de dessincronização)
    const [appliedFilters, setAppliedFilters] = useState({
        type: 'TODOS',
        startDate: '',
        endDate: ''
    });

    // ──> ESTADOS DE PAGINAÇÃO
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // ──> ESTADO DO MODAL DETALHADO DA IA
    const [selectedAiData, setSelectedAiData] = useState(null);

    // Carrega as simulações do banco de dados
    const loadSimulations = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // 💡 AJUSTE DE SEGURANÇA: Passando o ID se sua action precisar segmentar
            const data = await getSimulationsFromDB(user?.id);

                               
            let dataArray = [];
            if (Array.isArray(data)) {
                dataArray = data;
            } else if (data && typeof data === 'object') {
                dataArray = data.data || data.simulations || data.rows || [];
            }

            console.log("🔍 DADOS TRATADOS (Array):", dataArray);
            
            const activeSims = dataArray.filter(sim => sim && typeof sim === 'object' && sim.status !== 'archived');
            
            setAllSimulations(activeSims);
            setCurrentPage(1);
        } catch (err) {
            console.error("Erro ao carregar simulações:", err);
            setError(err.message || "Erro desconhecido ao acessar o banco de dados.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSimulations();
    }, [user]);

    // OUVINTE DA TECLA ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedAiData(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ──> DISPARADOR DO BOTÃO PESQUISAR (Apenas consolida os filtros em um estado)
    const handleSearch = () => {
        setAppliedFilters({
            type: filterType,
            startDate: filterStartDate,
            endDate: filterEndDate
        });
        setCurrentPage(1);
    };

    // ──> FILTRAGEM DINÂMICA VIA MEMO (Computação pura e sem bugs de render)
    const filteredSimulations = useMemo(() => {
        let result = [...allSimulations];

        if (appliedFilters.type !== 'TODOS') {
            result = result.filter(sim => 
                (sim.tipoOperacao || sim.tipo_operacao || '').toUpperCase() === appliedFilters.type.toUpperCase()
            );
        }

        if (appliedFilters.startDate) {
            const startDate = new Date(appliedFilters.startDate);
            startDate.setHours(0, 0, 0, 0);
            result = result.filter(sim => new Date(sim.createdAt || sim.created_at) >= startDate);
        }

        if (appliedFilters.endDate) {
            const endDate = new Date(appliedFilters.endDate);
            endDate.setHours(23, 59, 59, 999);
            result = result.filter(sim => new Date(sim.createdAt || sim.created_at) <= endDate);
        }

        return result;
    }, [allSimulations, appliedFilters]);

    // ──> AÇÃO DE ARQUIVAMENTO DEFINITIVO
    const handleArchive = async (id) => {
        if (!confirm("Deseja ocultar e arquivar esta simulação? Ela será desconsiderada nos treinamentos estratégicos.")) return;
        
        try {
            const res = await archiveSimulationInDB(id);
            if (res.success) {
                // Removendo do estado mestre, o useMemo atualiza a tela automaticamente!
                setAllSimulations(prev => prev.filter(sim => sim.id !== id));
            } else {
                alert(`Erro ao arquivar: ${res.error}`);
            }
        } catch (err) {
            console.error("Erro crítico ao arquivar:", err);
        }
    };

    // Cálculos de paginação baseados no array computado pelo useMemo
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredSimulations.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(filteredSimulations.length / rowsPerPage);

   const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    // Se já vier formatado com vírgula de centavos, ajusta para o padrão internacional do Number()
    let cleanValue = value.toString().replace(/\./g, '').replace(',', '.');
    const num = Number(cleanValue.replace(/[^\d.-]/g, '')) || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

    const formatDateTime = (dateString) => {
        if (!dateString) return '--/--/---- --:--';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#05070a] text-slate-400 gap-3">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="text-xs font-black uppercase tracking-widest opacity-60">Sincronizando Terminal de Cenários...</p>
            </div>
        );
    }

    return (
        <div className="p-12 bg-[#05070a] min-h-screen text-slate-200 w-full overflow-y-auto relative">
            
            {/* CABEÇALHO */}
            <div className="mb-10">
                <h1 className="text-lg font-bold text-slate-100 tracking-wide uppercase flex items-center gap-3">
                    <Layout className="text-blue-500" size={28} />
                    Simulações Aprovadas
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Análise preditiva e monitoramento de cenários gerados pela Inteligência Phronis.
                </p>
            </div>

            {/* SEÇÃO DE FILTROS */}
            <div className="grid grid-cols-1 sm:grid-cols-5 items-end gap-4 p-6 bg-[#090b11] border border-white/5 rounded-[24px] mb-8 shadow-xl">
                <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Data Início</label>
                    <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full bg-[#05070a] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer select-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                </div>
                <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Data Fim</label>
                    <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full bg-[#05070a] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                </div>
                <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Tipo de Operação</label>
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-[#05070a] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 font-black uppercase tracking-wider focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                        <option value="TODOS">Todos os Tipos</option>
                        <option value="COMPRA">Compra</option>
                        <option value="VENDA">Venda</option>
                        <option value="DAY TRADE">Day Trade</option>
                        <option value="SWING TRADE">Swing Trade</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Exibir por página</label>
                    <select 
                        value={rowsPerPage}
                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="w-full bg-[#05070a] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 font-black uppercase focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                        <option value={5}>5 Linhas</option>
                        <option value={10}>10 Linhas (Padrão)</option>
                        <option value={20}>20 Linhas</option>
                        <option value={50}>50 Linhas</option>
                    </select>
                </div>
                <button
                    onClick={handleSearch}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 border border-blue-400/20 active:scale-[0.98]"
                >
                    <Search size={14} />
                    Pesquisar
                </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm italic">{error}</div>}

            {/* TABELA PRINCIPAL */}
            <div className="overflow-x-auto border border-white/5 rounded-[24px] bg-[#090b11] shadow-2xl mb-6">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase font-black tracking-wider bg-black/20">
                            <th className="p-5">Data e Hora</th>
                            <th className="p-5">Tipo de Operação</th>
                            <th className="p-5 text-right">Valor Alocado</th>
                            <th className="p-5 text-right">Ganho Projetado</th>
                            <th className="p-5 text-right">Perda Máxima</th>
                            <th className="p-5 text-center">Projeções (IA)</th>
                            <th className="p-5 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {currentRows.length > 0 ? (
                            currentRows.map((sim) => {
                                const tipo = sim.tipoOperacao || sim.tipo_operacao || 'DAY TRADE';
                                const winRateVal = Number(sim.winRate || sim.win_rate || 0);
                                
                                return (
                                    <tr key={sim.id} className="hover:bg-white/[0.02] transition-all group">
                                        <td className="p-5 text-xs text-slate-400 font-medium whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={13} className="text-slate-600" />
                                                {formatDateTime(sim.createdAt || sim.created_at)}
                                            </div>
                                        </td>
                                        <td className="p-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-sm font-black text-white tracking-tight italic uppercase">
                                                    {sim.ativo1 || sim.ativo_1 || 'N/A'}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                                    tipo.toUpperCase().includes('COMPRA') || tipo.toUpperCase() === 'DAY TRADE'
                                                        ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                                        : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                                }`}>
                                                    {tipo}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right font-semibold text-slate-300 whitespace-nowrap">
                                            {formatCurrency(sim.investimento)}
                                        </td>
                                        <td className="p-5 text-right font-black text-emerald-500 whitespace-nowrap text-sm">
    {(() => {
        const val = (sim.alvoPercent || sim.alvo_percent || '0').toString();
        const temSinal = val.includes('+') || val.includes('-');
        const temPorcentagem = val.includes('%');
        return `${temSinal ? '' : '+'}${val}${temPorcentagem ? '' : '%'}`;
    })()}
</td>
<td className="p-5 text-right font-black text-red-500 whitespace-nowrap text-sm">
    {(() => {
        const val = (sim.stopPercent || sim.stop_percent || '0').toString();
        const temSinal = val.includes('+') || val.includes('-');
        const temPorcentagem = val.includes('%');
        return `${temSinal ? '' : '-'}${val}${temPorcentagem ? '' : '%'}`;
    })()}
</td>
                                        <td className="p-5 whitespace-nowrap text-center">
                                            <div className="inline-flex items-center gap-2 bg-[#05070a] px-3 py-1.5 rounded-xl border border-white/5 text-xs">
                                                <BrainCircuit size={13} className="text-blue-400" />
                                                <span className={`font-black ${
                                                    winRateVal >= 65 ? 'text-emerald-500' : winRateVal >= 50 ? 'text-amber-500' : 'text-red-500'
                                                }`}>
                                                    {winRateVal}% Assertividade
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => setSelectedAiData(sim)}
                                                    title="Ver Detalhamento da IA"
                                                    className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleArchive(sim.id)}
                                                    title="Arquivar Cenário"
                                                    className="p-2 text-slate-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <Archive size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="p-20 text-center text-slate-600 uppercase text-[10px] tracking-widest font-black opacity-40">
                                    Nenhum cenário preditivo localizado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* CONTROLES DA PAGINAÇÃO */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-[#090b11] border border-white/5 rounded-xl text-xs text-slate-400">
                    <span>Exibindo de {indexOfFirstRow + 1} a {Math.min(indexOfLastRow, filteredSimulations.length)} de {filteredSimulations.length} simulações</span>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider"
                        >
                            Anterior
                        </button>
                        <span className="font-black text-white px-2">Página {currentPage} de {totalPages}</span>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}

            {/* POPUP DE DETALHAMENTO DA IA */}
            {selectedAiData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070a]/90 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl bg-[#090b11] border border-white/5 p-8 rounded-[32px] shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <button 
                            onClick={() => setSelectedAiData(null)}
                            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <BrainCircuit className="text-blue-500" size={24} />
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Parecer Completo da Inteligência</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">Estratégia Recomendada</p>
                                <p className="text-sm text-slate-200 leading-relaxed font-medium italic">
                                    "{selectedAiData.strategy || "Nenhuma especificação estratégica gravada."}"
                                </p>
                            </div>

                            <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Resumo Técnico & Insights Adicionais</p>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                    {selectedAiData.technicalSummary || selectedAiData.technical_summary || "Cenário verificado com os parâmetros padrões do terminal."}
                                </p>
                            </div>
                        </div>

                        <p className="text-[9px] text-slate-600 text-center uppercase tracking-widest font-black mt-8">
                            Pressione <span className="text-slate-400">ESC</span> ou clique no X para fechar este relatório
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}