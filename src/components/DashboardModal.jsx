// DashboardModal.jsx
import React from 'react';
import LoadingState from './LoadingState';

const DashboardModal = ({ data, status }) => {
  if (status === 'loading') return <LoadingState />;
  
  // O 'data' agora já chega como um objeto (graças ao JSON.parse no salvamento)
  // Se não existir, retornamos nulo.
  if (status !== 'success' || !data) return null;

  // Como o parse ocorreu no backend, 'data' já é o objeto com as chaves:
  // resumo, estrategia, performance, projecao, backtest, riscos, recomendacao
  const safeData = typeof data === 'string' ? JSON.parse(data) : data;

  return (
    <div 
      id="dashboard-modal-content" 
      className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-white w-full max-w-4xl mx-auto shadow-2xl"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">PHRONES ANALYSIS REPORT</h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Ex Nihilo Intelligence Engine</p>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/50 px-3 py-1 rounded-full text-[10px] font-bold text-purple-300">
          RECOMENDAÇÃO: {safeData?.recomendacao || "N/A"}
        </div>
      </div>

      {/* Grid de Informações */}
     <div className="space-y-6">
    {/* 1. LINHA DE DECISÃO: Foco total no que o analista precisa decidir primeiro */}
    <div className="grid grid-cols-2 gap-4">
        <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
            <p className="text-[9px] text-purple-400 uppercase font-bold mb-1 tracking-wider">Ação Sugerida</p>
            <p className="text-xl font-bold text-white truncate">{safeData?.acaoSugerida || "Aguardando"}</p>
        </div>
        <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-500/30">
            <p className="text-[9px] text-emerald-400 uppercase font-bold mb-1 tracking-wider">Temperatura / Saúde</p>
            <p className="text-xl font-bold text-white truncate">{safeData?.temperaturaSaude || "N/A"}</p>
        </div>
    </div>

    {/* 2. ANÁLISES TÉCNICAS: Cards com altura fixa e scroll interno */}
    <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 h-32 overflow-y-auto">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">Resumo Executivo</p>
            <p className="text-xs text-slate-300 leading-tight">{safeData?.resumo}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 h-32 overflow-y-auto">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">Estratégia</p>
            <p className="text-xs text-slate-300 leading-tight">{safeData?.estrategia}</p>
        </div>
    </div>

    {/* 3. PERFORMANCE E PROJEÇÃO */}
    <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 h-32 overflow-y-auto">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">Performance</p>
            <p className="text-xs text-slate-300 leading-tight">{safeData?.performance}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 h-32 overflow-y-auto">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">Projeção Curto Prazo</p>
            <p className="text-xs text-slate-300 leading-tight">{safeData?.projecao}</p>
        </div>
    </div>

    {/* 4. ANÁLISE DE LONGO PRAZO E RISCOS (Full width para dar espaço) */}
    <div className="grid grid-cols-1 gap-4">
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 h-28 overflow-y-auto">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">Visão Setorial (5 Anos)</p>
            <p className="text-xs text-slate-300 leading-tight">{safeData?.visaoSetorial5Anos}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg border border-red-900/30 h-24 overflow-y-auto">
            <p className="text-[9px] text-red-400 uppercase font-bold mb-2">Riscos</p>
            <p className="text-xs text-slate-300 leading-tight">{safeData?.riscos}</p>
        </div>
    </div>
      </div>
    </div>
  );
};

export default DashboardModal;