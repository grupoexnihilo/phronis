'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck,
  ArrowUpRight, 
  ArrowDownRight,
  PlusCircle,
  Database,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { Card, Button } from '../components/UI';
import StrategyModal from '../components/StrategyModal';
import ProjectionChart from '../components/ProjectionChart';
import NewOperationModal from '../components/NewOperationModal';
import InsertHistoryModal from '../components/InsertHistoryModal'; 

// 🎯 CONEXÃO DIRETA COM O NEON: Importando as Server Actions oficiais
import { getActiveTargetCycle, getRecentOperationsAction, consolidateCycleAction } from '@/app/actions';

export default function Dashboard({ user }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isNewOpOpen, setIsNewOpOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Estados reativos que alimentam a tela
  const [cicloAtivo, setCicloAtivo] = useState(null);
  const [recentesOps, setRecentesOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Função centralizada que chama as Server Actions (Seguras no Servidor)
  async function carregarDadosDashboard() {
    if (!user?.id) return;
    try {
      setLoading(true);

      // 1. Busca a meta/ciclo ativo do usuário ('EM ANDAMENTO')
      const respostaCiclo = await getActiveTargetCycle(user.id);
      if (respostaCiclo.success && respostaCiclo.cycle) {
        // 🎯 AJUSTE FINO: Removemos o JSON.parse. Passamos o objeto direto!
        setCicloAtivo(respostaCiclo.cycle);
      } else {
        setCicloAtivo(null);
      }

      // 2. Busca o histórico de operações do usuário logado
      const respostaOps = await getRecentOperationsAction(user.id);
      if (respostaOps.success) {
        setRecentesOps(respostaOps.payload || []);
      }
    } catch (error) {
      console.error("Erro ao sincronizar Dashboard pelas Actions:", error);
    } finally {
      setLoading(false);
    }
  }

  // Sincroniza os dados ao montar o componente
  useEffect(() => {
    carregarDadosDashboard();
   }, [user]);

   // 1. Coloque a função aqui, junto com a carregarDadosDashboard
  // Dentro do seu Dashboard.jsx
async function handleFinalizarCiclo() {
  // 1. Log de segurança para verificar o que está sendo enviado
  console.log("DEBUG: Iniciando finalização para UserID:", user?.id, "CycleID:", cicloAtivo?.id);

  if (!cicloAtivo?.id || !user?.id) {
    alert("Erro: Dados do ciclo ou do usuário não encontrados.");
    return;
  }

  const confirmacao = window.confirm("Finalizar o ciclo atual consolidará os dados no histórico e limpará o painel. Continuar?");
  if (!confirmacao) return;

  try {
    // 2. Garante que ambos são passados como números, evitando "Dados insuficientes"
    const result = await consolidateCycleAction(Number(user.id), Number(cicloAtivo.id)); 

    if (result.success) {
      await carregarDadosDashboard();
    } else {
      alert("Falha ao consolidar o ciclo: " + result.error);
    }
  } catch (error) {
    console.error("Erro ao consolidar ciclo:", error);
    alert("Erro inesperado ao finalizar o ciclo.");
  }
}

   // 🧮 ENGENHARIA QUANTITATIVA: Processamento das Fórmulas para o Ciclo Ativo
  const metrics = useMemo(() => {
    // 🎯 O FUNIL: Separa apenas as operações que pertencem ao ciclo atual
    const opsDoCiclo = recentesOps.filter(op => {
      if (!cicloAtivo) return false;
      const opObjectiveId = op.objectiveId || op.objective_id;
      return Number(opObjectiveId) === Number(cicloAtivo.id);
    });

    // 👇 A partir daqui, a matemática usa APENAS o opsDoCiclo, e não mais o recentesOps
    const totalTrades = opsDoCiclo.length;
    
    // Operações no Gain (Wins)
    const wins = opsDoCiclo.filter(op => op.status?.toLowerCase() === 'win');
    const totalWins = wins.length;
    
    // FÓRMULA 1: Assertividade (Win Rate Global do Ciclo)
    const winRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : '0.0';

    // Separação de Ganhos e Perdas Brutas
    let lucroBruto = 0;
    let prejuizoBruto = 0;

    const limparDinheiro = (val) => {
      if (!val || val === '--') return 0;
      // Remove "R$", pontos de milhar, e troca vírgula por ponto
      const limpo = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      return parseFloat(limpo) || 0;
    };

    opsDoCiclo.forEach(op => {
      const valor = limparDinheiro(op.result); // 🛡️ AGORA LIMPA ANTES DE SOMAR
      if (op.status?.toLowerCase() === 'win') {
        lucroBruto += valor;
      } else if (op.status?.toLowerCase() === 'loss') {
        prejuizoBruto += Math.abs(valor);
      }
    });

    // FÓRMULA 2: Retorno Líquido (Faturamento Puro)
    const netProfit = lucroBruto - prejuizoBruto;

    // FÓRMULA 3: Capital sob Gestão (AUM) = Capital Inicial + Lucros - Perdas
    const capitalInicial = cicloAtivo ? Number(cicloAtivo.initialCapital || cicloAtivo.initial_capital) || 0 : 0;
    const aum = capitalInicial + netProfit;

    // FÓRMULA 4: Fator de Lucro (Profit Factor) = Lucro Bruto / Prejuízo Bruto
    let profitFactor = '0.00';
    if (totalTrades > 0) {
      if (prejuizoBruto === 0) {
        profitFactor = lucroBruto > 0 ? 'Max (Estável)' : '1.00';
      } else {
        profitFactor = (lucroBruto / prejuizoBruto).toFixed(2);
      }
    }

    console.log("DEBUG [Metrics]:", { totalTrades: totalTrades, lucroBruto, prejuizoBruto, capitalInicial, netProfit, aum });

    return {
      aum,
      winRate,
      netProfit,
      profitFactor: isNaN(Number(profitFactor)) ? 1.00 : Number(profitFactor)
    };
  }, [recentesOps, cicloAtivo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs font-mono uppercase tracking-widest text-slate-500">
        Sincronizando ambiente com o Neon...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. CONTROL TOP BAR (Painel Estratégico de Metas - Limpo) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 px-6">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">
            Dashboard de Performance
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-normal mt-0.5 block">
            Objetivo Global: <span className="text-blue-400 font-bold">{cicloAtivo 
      ? `R$ ${Number(cicloAtivo.targetGoal || cicloAtivo.target_goal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      : 'Nenhum Ciclo Ativo'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">

          {/* Botão de Atualização (Novo) */}
  <button 
    onClick={carregarDadosDashboard}
    className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-white/5 hover:border-white/10 rounded-lg transition-all duration-200"
    title="Atualizar dados"
  >
    <RefreshCw size={16} />
  </button>
  
          <button 
  onClick={handleFinalizarCiclo}
  className="px-4 py-2 text-xs font-semibold text-green-400 bg-green-950/20 border border-green-500/20 rounded-lg hover:bg-green-950/40 hover:border-green-500/40 transition-all duration-200 tracking-wide uppercase"
>
  Finalizar Ciclo
</button>
          <Button 
            onClick={() => setIsHistoryModalOpen(true)} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-300 font-bold text-[10px] tracking-widest uppercase px-5 py-2.5 rounded-xl transition-all"
          >
            <Database size={14} /> Inserir Operação
          </Button>
        </div>
      </div>

      {/* 2. OS 4 BALÕES SUPERIORES (Design Compacto e Padronizado) */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6">
  
  {/* BALÃO 1: CAPITAL */}
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Capital Alocado</p>
      <h3 className="text-xl font-bold text-slate-100 mt-0.5">R$ {metrics.aum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
    </div>
    <div className="bg-blue-600/10 p-2 rounded-xl text-blue-500">
      <Wallet size={18} />
    </div>
  </div>

  {/* BALÃO 2: ASSERTIVIDADE (Padronizado como o Balão 1) */}
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assertividade</p>
      <h3 className="text-xl font-bold text-emerald-300 mt-0.5">{metrics.winRate}%</h3>
    </div>
    <div className="bg-emerald-600/10 p-2 rounded-xl text-emerald-300">
      <TrendingUp size={18} />
    </div>
  </div>

  {/* BALÃO 3: RETORNO LÍQUIDO */}
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Retorno Líquido</p>
      <h3 className={`text-xl font-bold mt-0.5 ${metrics.netProfit >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
        {metrics.netProfit >= 0 ? '+' : ''} R$ {metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </h3>
    </div>
    <div className="bg-purple-600/10 p-2 rounded-xl text-purple-500">
      <DollarSign size={18} />
    </div>
  </div>

  {/* BALÃO 4: FATOR DE LUCRO */}
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fator de Lucro</p>
      <h3 className={`text-xl font-bold mt-0.5 ${
        metrics.profitFactor >= 1.5 ? 'text-amber-400' : metrics.profitFactor >= 1.0 ? 'text-slate-300' : 'text-red-500'
      }`}>
        {metrics.profitFactor.toFixed(2)}
      </h3>
    </div>
    <div className={`p-2 rounded-xl ${
      metrics.profitFactor >= 1.5 ? 'bg-amber-600/10 text-amber-500' : 'bg-slate-800 text-slate-400'
    }`}>
      <ShieldCheck size={18} />
    </div>
  </div>

</div>

      {/* 3. GRÁFICO CENTRAL: CURVA DE PATRIMÔNIO VS METAS */}
<div className="px-6">
  <Card className="bg-slate-950/40 border-white/5 p-6">
    <div className="h-[415px]">
      {/* O ProjectionChart assume o controle total do espaço interno */}
      <ProjectionChart 
  // 🛡️ PROTEÇÃO: Se cicloAtivo for null, o filter retorna false imediatamente
  data={Array.from(new Map(
    recentesOps
      .filter(op => {
        if (!cicloAtivo) return false; // Se não tem ciclo, não mostra nada
        const opObjectiveId = op.objectiveId || op.objective_id;
        return Number(opObjectiveId) === Number(cicloAtivo.id);
      })
      .map(op => [op.id, op])
  ).values())}
  isActive={!!cicloAtivo} 
  initialCapital={cicloAtivo ? Number(cicloAtivo.initial_capital || cicloAtivo.initialCapital || 0) : 0} 
  targetGoal={cicloAtivo ? Number(cicloAtivo.target_goal || cicloAtivo.targetGoal || 0) : 0} 
/>
    </div>
  </Card>
</div>

      {/* 4. REGISTRO ANALÍTICO DE ATIVOS (Tabela) */}
    {/* 4. REGISTRO ANALÍTICO DE ATIVOS (Tabela Paginada) */}
<div className="px-6 pb-12">
  <Card className="bg-slate-950/40 border-white/5 overflow-hidden">
    <div className="flex items-center justify-between p-5 border-b border-white/5">
      <h4 className="text-xs font-black text-white uppercase tracking-wider">Histórico de Performance (10 por página)</h4>
      <div className="flex gap-2">
        <Button onClick={() => setPage(p => Math.max(0, p - 1))} className="p-2 bg-slate-900 border border-white/5 hover:bg-slate-800">
          <ArrowLeft size={14} />
        </Button>
        <Button onClick={() => setPage(p => Math.min(Math.ceil(recentesOps.length / 10) - 1, p + 1))} className="p-2 bg-slate-900 border border-white/5 hover:bg-slate-800">
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
    
    <table className="w-full text-left text-xs text-slate-300">
      <thead className="text-[10px] uppercase tracking-widest font-black bg-slate-950/50 text-slate-500 border-b border-white/5">
        <tr>
          <th className="px-6 py-4">Data</th>
          <th className="px-6 py-4">Ativo</th>
          <th className="px-6 py-4 text-center">Status</th>
          <th className="px-6 py-4">Resultado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
  {recentesOps
    // 🛡️ FILTRO: Mantém apenas o ciclo atual
    .filter(op => Number(op.objectiveId || op.objective_id) === Number(cicloAtivo?.id))
    // 🛡️ ORDENAÇÃO POR START: Agora baseada no momento real da operação
    .sort((a, b) => {
      const parse = (d) => {
        if (!d) return 0;
        const [data, hora] = d.split(' ');
        const [dia, mes] = data.split('/');
        // Considera o ano 2026 para comparação
        return new Date(`2026-${mes}-${dia}T${hora || '00:00'}:00`).getTime();
      };
      return parse(b.start) - parse(a.start); // Do mais recente para o mais antigo
    })
    .slice(page * 10, (page + 1) * 10)
    .map((row) => {
      const valorNumerico = parseFloat(String(row.result || 0).replace(/[^\d,.-]/g, '').replace(',', '.'));
      const isWin = row.status?.toLowerCase() === 'win';
      
      return (
        <tr key={row.id} className="hover:bg-white/[0.01]">
          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
            {row.start || '--'}
          </td>
          <td className="px-6 py-4 font-bold text-white text-[11px]">
            {row.assetCode || row.asset || 'N/A'}
          </td>
          <td className="px-6 py-4 text-center">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isWin ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {isWin ? 'WIN' : 'LOSS'}
            </span>
          </td>
          <td className={`px-6 py-4 font-bold font-mono text-[11px] ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
            {isWin ? '+' : ''} R$ {isNaN(valorNumerico) ? '0,00' : valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      );
    })}
</tbody>
    </table>
  </Card>
</div>

      {/* 5. MODAIS COMPLEMENTARES */}
      {isModalOpen && <StrategyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={modalData} />}
      {isNewOpOpen && <NewOperationModal isOpen={isNewOpOpen} onClose={() => setIsNewOpOpen(false)} userId={user.id} onRefresh={carregarDadosDashboard} />}
      <InsertHistoryModal 
  isOpen={isHistoryModalOpen} 
  onClose={() => setIsHistoryModalOpen(false)} 
  user={user} 
  onRefresh={carregarDadosDashboard} 
/>
    </div>
  );
}