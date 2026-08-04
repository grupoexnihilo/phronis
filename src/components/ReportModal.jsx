import React, { useEffect } from 'react';

const ReportModal = ({ isOpen, data, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !data) return null;

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#report-modal-content) { display: none; }
          #report-modal-content { 
            position: absolute; left: 0; top: 0; width: 100%; 
            background-color: white !important; color: black !important; 
          }
          #report-modal-content * { border-color: #ccc !important; color: black !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
        <div id="report-modal-content" className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-white w-full max-w-2xl mx-auto shadow-2xl relative max-h-[90vh] overflow-y-auto">
          
          {/* Controles de Ação */}
          <div className="flex justify-end gap-2 mb-4 print:hidden">
            <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded text-xs hover:bg-slate-700">Fechar</button>
             </div>

          {/* Cabeçalho do Relatório */}
          <div className="mb-8 border-b border-slate-700 pb-4">
            <h2 className="text-xl font-bold uppercase tracking-widest">Phronis Intelligence Report</h2>
            <p className="text-[10px] text-slate-400">Ex Nihilo Strategy Engine | {new Date().toLocaleDateString()}</p>
          </div>

          {/* Grid de Dados (Estrutura idêntica ao dashboard) */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-700 p-3 rounded"><p className="text-[9px] text-slate-500 uppercase">Ação Sugerida</p><p className="text-sm font-bold">{data.acaoSugerida}</p></div>
              <div className="border border-slate-700 p-3 rounded"><p className="text-[9px] text-slate-500 uppercase">Temperatura</p><p className="text-sm font-bold">{data.temperaturaSaude}</p></div>
            </div>
            
            <div className="border border-slate-700 p-4 rounded"><p className="text-[9px] text-slate-500 uppercase mb-1">Resumo Executivo</p><p className="text-xs">{data.resumo}</p></div>
            <div className="border border-slate-700 p-4 rounded"><p className="text-[9px] text-slate-500 uppercase mb-1">Estratégia</p><p className="text-xs">{data.estrategia}</p></div>
            <div className="border border-slate-700 p-4 rounded"><p className="text-[9px] text-slate-500 uppercase mb-1">Projeção Curto Prazo</p><p className="text-xs">{data.projecao}</p></div>
            <div className="border border-slate-700 p-4 rounded"><p className="text-[9px] text-slate-500 uppercase mb-1">Riscos</p><p className="text-xs">{data.riscos}</p></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportModal;