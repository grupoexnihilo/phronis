import React, { useState } from 'react';
import { X, Zap, BrainCircuit, Save } from 'lucide-react';
import { Button } from './UI';

export default function NewOperationModal({ isOpen, onClose, clientName }) {
  // --- 1. TODOS OS HOOKS NO TOPO (ESSENCIAL) ---
  const [opType, setOpType] = useState('');
  const [market, setMarket] = useState(''); // 💡 ADICIONE ESTA LINHA AQUI
  const [analysisActive, setAnalysisActive] = useState(false);
  const [investimento, setInvestimento] = useState('0,00');
  const [showParecer, setShowParecer] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [leverage, setLeverage] = useState('1x'); // 💡 Estado para controlar o valor selecionado da alavancagem

  // Hook do teclado para fechar parecer ou modal
  
React.useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setShowParecer(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showParecer, isOpen, onClose]);

// --- 2. LÓGICA DE ESTILOS E CONSTANTES ---

  // Simulação do valor vindo da IA (depois integraremos com a API)

const aiConfidence = 68.4; 

const getConfidenceStyles = (val) => {
  if (val >= 65) return { 
    color: 'text-emerald-500', 
    border: 'border-emerald-500/50', 
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]', // Glow sutil verde
    bgBtn: 'bg-emerald-500/10', 
    hover: 'hover:bg-emerald-500/20',
    label: 'Alta Confiança',
    advice: 'Cenário de alta probabilidade estatística. Prossiga com o gerenciamento de risco padrão.' 
  };
  if (val >= 50) return { 
    color: 'text-amber-500', 
    border: 'border-amber-500/50', 
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]', // Glow sutil amarelo
    bgBtn: 'bg-amber-500/10', 
    hover: 'hover:bg-amber-500/20',
    label: 'Confiança Moderada',
    advice: 'Cenário de equilíbrio. Considere reduzir o tamanho da mão (position sizing) para mitigar volatilidade.' 
  };
  return { 
    color: 'text-red-500', 
    border: 'border-red-500/50', 
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]', // Glow sutil vermelho
    bgBtn: 'bg-red-500/10', 
    hover: 'hover:bg-red-500/20',
    label: 'Baixa Confiança',
    advice: 'Cenário de alto risco. Recomenda-se evitar a entrada ou aguardar confirmações adicionais.' 
  };
};

const styles = getConfidenceStyles(aiConfidence);

// --- 3. VERIFICAÇÃO DE RENDERIZAÇÃO (DEPOIS DOS HOOKS) ---
  if (!isOpen) return null;

  const isPairs = opType === 'Long & Short' || opType === 'Arbitragem' || opType === 'Pair Trading';

  const handleMoneyChange = (e) => {
    const cleanValue = e.target.value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    setInvestimento(numberValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  };

return (
<div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/40 backdrop-blur-[10px] animate-in fade-in duration-500 overflow-y-auto py-3">
<div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-slate-950/90 to-slate-950 pointer-events-none -z-10" />      
      {/* HEADER FIXO */}
      <div className="w-full h-24 px-10 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-md z-20">
        {/* LOGO: Tamanho ampliado para maior presença visual */}
      {/* LOGO: Escala Ultra para máxima presença */}
<div className="flex items-center gap-6">
  <img 
    src="/logo.png" 
    alt="Phrones Logo" 
    className="w-20 h-20 object-contain transition-transform hover:scale-105 duration-300 drop-shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
  />
  <div className="h-12 w-[2px] bg-white/10 mx-2" />
  <div>
    <h3 className="text-white font-black text-3xl italic uppercase tracking-tighter leading-none">Phrones</h3>
    <p className="text-blue-500 text-[11px] font-black uppercase tracking-[0.5em] mt-2 opacity-90">Intelligence Terminal</p>
  </div>
</div>
        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-1 max-h-[calc(100vh-6rem)] overflow-hidden relative">
        
        {/* PAINEL ESQUERDO: ENGENHARIA */}
        {/* Se isExpanded for true, o painel esquerdo "some" (w-0) */}
<div className={`h-full transition-all duration-700 ease-in-out flex flex-col items-center justify-start pt-8 bg-slate-900/60 overflow-y-auto pb-10
  ${isExpanded ? 'w-0 opacity-0 overflow-hidden' : analysisActive ? 'w-[580px] border-r border-white/5' : 'w-full'}`}>
          <div className="w-full max-w-4xl px-8 space-y-5">
            
            {/* TIPO E MERCADO */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Tipo de Operação</label>
                   <select 
  onChange={(e) => {
    setOpType(e.target.value);
    // Se não for Day Trade e não for Forex, reseta para 1x
    if (e.target.value !== 'Day Trade' && market !== 'Forex') {
      setLeverage('1x');
    }
  }} 
  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500"
>
                  <option value="">Selecione...</option>
                  <option value="Swing Trade">Swing Trade</option>
                  <option value="Long & Short">Long & Short</option>
                  <option value="Arbitragem">Arbitragem</option>
                  <option value="Day Trade">Day Trade</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Mercado</label>
                {/* 💡 ADICIONADO O onChange para monitorar quando o usuário escolhe Forex */}
                 <select onChange={(e) => { setMarket(e.target.value); setLeverage(e.target.value === 'Forex' ? '1:100' : '1x'); }} 
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500"
                   >
                  <option value="">Selecione...</option>
                  <option value="B3">B3</option>
                  <option value="NYSE">NYSE</option>
                  <option value="Forex">Forex</option>
                </select>
              </div>
            </div>

           {/* CAMPO CONDICIONAL: ALAVANCAGEM CONDICIONAL AO MERCADO E TIPO */}
{((market !== 'Forex' && opType === 'Day Trade') || market === 'Forex') && (
  <div className="col-span-2 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
    <label className="text-[9px] text-orange-500 font-black uppercase tracking-widest">
      {market === 'Forex' ? 'Alavancagem da Conta (Forex Proporcional)' : 'Fator de Alavancagem (Poder de Compra Day Trade)'}
    </label>
    
    <select 
      value={leverage}
      onChange={(e) => setLeverage(e.target.value)}
      className="w-full bg-slate-950 border border-orange-500/20 rounded-xl py-3 px-4 text-sm text-orange-400 outline-none focus:border-orange-500/50 cursor-pointer appearance-none font-mono font-bold"
    >
      {market === 'Forex' ? (
        /* LISTA FOREX: Independe de ser Day Trade ou não */
        <>
          <option value="1:1" className="bg-slate-950 text-white">1:0 (Sem Alavancagem)</option>
          <option value="1:25" className="bg-slate-950 text-white">1:25</option>
          <option value="1:50" className="bg-slate-950 text-white">1:50</option>
          <option value="1:100" className="bg-slate-950 text-white">1:100</option>
          <option value="1:200" className="bg-slate-950 text-white">1:200</option>
          <option value="1:500" className="bg-slate-950 text-white">1:500 (High Leverage)</option>
        </>
      ) : (
        /* LISTA TRADICIONAL B3/NYSE: Só renderiza se for Day Trade */
        <>
          <option value="1x" className="bg-slate-950 text-white">1x (Sem Alavancagem)</option>
          <option value="5x" className="bg-slate-950 text-white">5x</option>
          <option value="10x" className="bg-slate-950 text-white">10x</option>
          <option value="20x" className="bg-slate-950 text-white">20x</option>
          <option value="50x" className="bg-slate-950 text-white">50x</option>
          <option value="100x" className="bg-slate-950 text-white">100x (High Risk)</option>
           </>
           )}
           </select>
           </div>
          )}

            {/* BOX DE MONTAGEM */}
            <div className="p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Tipo de Ativo</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none">
                  <option>Ações</option><option>Futuros</option>
                </select>
              </div>

              {/* ATIVOS DINÂMICOS */}
              <div className="space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{isPairs ? 'Ativo 1 (Principal)' : 'Ativo'}</label>
                    <input list="tickers" placeholder="Escolha o ticker..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none font-sans" />
                  </div>
                  {isPairs && (
                    <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 h-11">
                      <button className="px-4 text-[9px] font-black uppercase rounded-lg bg-blue-600 text-white">Long</button>
                      <button className="px-4 text-[9px] font-black uppercase rounded-lg text-slate-600">Short</button>
                    </div>
                  )}
                </div>

                {isPairs && (
                  <div className="flex gap-3 items-end animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] text-purple-500 font-black uppercase tracking-widest">Ativo 2 (Contraparte)</label>
                      <input list="tickers" placeholder="Escolha o ticker..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none" />
                    </div>
                    <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 h-11">
                      <button className="px-4 text-[9px] font-black uppercase rounded-lg text-slate-600">Long</button>
                      <button className="px-4 text-[9px] font-black uppercase rounded-lg bg-red-600 text-white">Short</button>
                    </div>
                  </div>
                )}
              </div>

              {/* PRAZO, MOEDA E INVESTIMENTO (Alinhamento Centralizado) */}
<div className="grid grid-cols-12 gap-4 items-end"> {/* items-end garante que a base dos campos se alinhe */}
  
  <div className="col-span-5 space-y-1.5">
    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block">Prazo Estimado</label>
    <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden h-11">
      <input type="number" placeholder="4" className="w-12 bg-transparent text-center text-sm text-white outline-none" />
      <select className="flex-1 bg-slate-900 text-[8px] font-black uppercase text-white px-2 outline-none border-l border-white/5 cursor-pointer appearance-none">
        <option>Horas</option><option>Dias</option><option>Semanas</option><option>Anos</option>
      </select>
    </div>
  </div>

  <div className="col-span-2 space-y-1.5">
    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center block">Moeda</label>
    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl h-11 px-2 text-xs text-white outline-none appearance-none text-center cursor-pointer">
      <option>BRL</option><option>USD</option>
    </select>
  </div>

  <div className="col-span-5 space-y-1.5">
    <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-right block">Investimento</label>
    <div className="relative">
      <input 
        type="text" 
        value={investimento} 
        onChange={handleMoneyChange} 
        className="w-full bg-slate-950 border border-slate-800 rounded-xl h-11 px-4 text-lg text-white font-bold text-right outline-none focus:border-blue-500 transition-colors" 
      />
    </div>
  </div>
</div>

              {/* ALVOS */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[9px] text-emerald-500 font-black uppercase tracking-widest text-center block">Target Gain (%)</label>
                  <input type="text" placeholder="15%" className="w-full bg-slate-950 border border-emerald-500/10 rounded-xl py-3 text-sm text-emerald-500 text-center outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-red-500 font-black uppercase tracking-widest text-center block">Stop Loss (%)</label>
                  <input type="text" placeholder="5%" className="w-full bg-slate-950 border border-red-500/10 rounded-xl py-3 text-sm text-red-500 text-center outline-none" />
                </div>
              </div>
            </div>

            {/* BOTÃO DE AÇÃO */}
            <div className="flex items-center gap-6">
              <Button onClick={() => setAnalysisActive(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-5 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all">
                <BrainCircuit size={20} /> Gerar Análise Phrones
              </Button>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="h" className="w-5 h-5 accent-blue-600 cursor-pointer" />
                <label htmlFor="h" className="text-[8px] text-slate-500 font-bold uppercase cursor-pointer leading-tight">Consultar<br/>Histórico</label>
              </div>
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO: ESTRATÉGIA (ROLAGEM LATERAL) */}
{/* O painel direito ocupa a tela inteira se isExpanded for true */}
<div className={`flex flex-col h-full border-l border-white/5 transition-all duration-700 ease-in-out z-10 
  ${isExpanded ? 'w-full bg-slate-950' : 'flex-1 bg-slate-950/80'} 
  ${analysisActive ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 absolute right-0'}`}>          {/* Header da Estratégia com Botão de Expansão */}
<div className="p-10 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
  <h4 className="text-white font-black text-xl uppercase tracking-[0.4em]">
    Estratégia de Operação
  </h4>
  
  <div className="flex items-center gap-3">
    <button 
      onClick={() => {
    setAnalysisActive(false);
    setIsExpanded(false); // 💡 O pulo do gato: traz o painel esquerdo de volta caso estivesse expandido
  }}
      className="px-5 py-2 bg-slate-900 text-[10px] font-black text-slate-500 uppercase rounded-xl hover:text-white transition-all border border-white/5"
    >
      Editar Dados
    </button>

    {/* Botão de Expansão Quadrado */}
    <button 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`p-2.5 rounded-xl border border-white/10 transition-all flex items-center justify-center
        ${isExpanded ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
    >
      {isExpanded ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 15 6 6m-6-6v6m0-6h6M9 9 3 3m6 6H3m6 0V3"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 9 6-6m-6 6V3m0 6h6M9 15l-6 6m6-6H3m6 0v6"/></svg>
      )}
    </button>
  </div>
</div>
          
<div className="flex-1 px-12 pt-4 pb-10 flex flex-col justify-start gap-6 max-w-4xl mx-auto w-full overflow-y-auto">            {/* Ajuste 2: Percentual Reduzido e Condicional */}
{/* BLOCO DO PERCENTUAL E BARRA (Já ajustado) */}
<div className="flex items-center gap-6 w-full h-[120px]">
  
  {/* PERCENTUAL (LADO ESQUERDO) */}
  <div className="flex items-center gap-4 shrink-0">
    <span className={`text-5xl font-black italic ${styles.color}`}>{aiConfidence}%</span>
    <div className="w-20">
      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">{styles.label}</span>
      <div className="w-full h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
        <div className={`h-full ${styles.bg}`} style={{ width: `${aiConfidence}%` }} />
      </div>
    </div>
  </div>

  {/* BOTÃO MORPHING (LADO DIREITO - EXPANSÍVEL) */}
  <div className={`transition-all duration-500 ease-in-out ${showParecer ? 'grow' : 'w-[200px]'}`}>
    <div 
      onClick={() => setShowParecer(!showParecer)}
      className={`cursor-pointer overflow-hidden transition-all duration-500 border ${styles.glow} ${showParecer ? `w-full p-6 rounded-3xl bg-slate-950 ${styles.border}` : `h-[45px] rounded-full flex items-center justify-center ${styles.bgBtn} ${styles.border}`}`}
    >
      {!showParecer ? (
        <span className={`text-[10px] font-black uppercase tracking-widest ${styles.color}`}>Parecer Técnico</span>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[9px] font-black uppercase tracking-widest ${styles.color}`}>Phrones Insight</span>
            <X size={14} className="text-slate-500" />
          </div>
          <p className="text-base text-slate-200 italic leading-snug">"{styles.advice}"</p>
        </div>
      )}
    </div>
  </div>
</div>

            <div className="bg-blue-600/5 border border-blue-500/10 p-10 rounded-[40px]">
              <p className="text-xl text-slate-300 leading-relaxed italic font-medium">
                "Análise institucional concluída. Detectamos fluxo de ordens pesadas na ponta compradora. Recomenda-se entrada fracionada."
              </p>
            </div>

           {/* Ajuste 5: Cards de Ganho e Risco - Layout Compacto */}
{/* Ajuste 6: Cards de Projeção com Referência Percentual */}
<div className="grid grid-cols-2 gap-6">
  
  {/* CARD DE GANHO */}
  <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[24px] flex flex-col items-center justify-center transition-all hover:bg-emerald-500/10 group">
    <span className="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-1 opacity-70">
      Projeção de Ganho
    </span>
    <div className="flex items-baseline gap-1">
      <span className="text-xs font-bold text-emerald-500/50 italic">R$</span>
      <p className="text-3xl font-sans font-black text-emerald-500 tracking-tighter group-hover:scale-105 transition-transform">
        1.150,00
      </p>
    </div>
    {/* Referência Percentual */}
    <span className="text-[10px] font-bold text-emerald-500/40 mt-1 uppercase tracking-widest">
      +15.00%
    </span>
  </div>

  {/* CARD DE RISCO */}
  <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-[24px] flex flex-col items-center justify-center transition-all hover:bg-red-500/10 group">
    <span className="text-[9px] text-red-600 font-black uppercase tracking-[0.2em] mb-1 opacity-70">
      Risco Máximo
    </span>
    <div className="flex items-baseline gap-1">
      <span className="text-xs font-bold text-red-500/50 italic">R$</span>
      <p className="text-3xl font-sans font-black text-red-500 tracking-tighter group-hover:scale-105 transition-transform">
        950,00
      </p>
    </div>
    {/* Referência Percentual */}
    <span className="text-[10px] font-bold text-red-500/40 mt-1 uppercase tracking-widest">
      -5.00%
    </span>
  </div>
</div>

            {/* Ajuste 7: Botão de Ação Final com Zoom Interno Seletivo */}
<div className="mt-4">
<button className="w-full py-6 bg-blue-600/90 hover:bg-blue-500 bg-gradient-to-r from-blue-700 to-blue-500 rounded-[24px] flex items-center justify-center gap-4 shadow-xl shadow-blue-900/20 transition-all duration-300 group overflow-hidden border border-blue-400/20">    
    {/* Container interno com efeito de zoom seletivo */}
    <div className="flex items-center gap-4 transition-transform duration-500 group-hover:scale-110">
      <Save size={44} className="text-white" />
      <div className="text-center">
        <p className="font-black text-lg uppercase tracking-[0.15em] text-white leading-none">
          Confirmar Operação
        </p>
        <p className="text-[9px] text-emerald-100 uppercase font-bold tracking-tight mt-1">
          Registrar ordem no terminal
        </p>
      </div>
    </div>
    
  </button>
</div>
          </div>
        </div>

      </div>
      
      <datalist id="tickers">
        <option value="PETR4" /><option value="VALE3" /><option value="ITUB4" />
      </datalist>
    </div>
  );
}