'use client';

import React, { useState, useEffect } from 'react';
import { getSettingsAction, saveSettingsAction } from '../app/actions';

export default function SettingsStation({ user }) {
  const [nickname, setNickname] = useState('');
  const [capitalInicial, setCapitalInicial] = useState('');
  const [perfilRisco, setPerfilRisco] = useState('moderado');
  const [metaCustomizada, setMetaCustomizada] = useState('');
  const [isCustomMeta, setIsCustomMeta] = useState(false);
  
  // Estados para gerenciar feedback visual do operador
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // 1. Busca os dados salvos no Neon DB assim que o componente monta
  // 1. Carregando dados ao montar a tela
  useEffect(() => {
    if (!user?.id) return;

    async function loadStoredSettings() {
      try {
        setLoading(true);
        
        // Chamando a action que roda no servidor de forma segura
        const storedData = await getSettingsAction(user.id);
        
        if (storedData) {
          setNickname(storedData.nickname || '');
          setCapitalInicial(storedData.initialCapital || '');
          setPerfilRisco(storedData.riskProfile?.toLowerCase() || 'moderado');
          
          if (storedData.targetGoal) {
            setMetaCustomizada(storedData.targetGoal);
            setIsCustomMeta(true);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configurações via Action:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStoredSettings();
  }, [user]);

  // 2. Salvando dados no formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage({ type: '', text: '' });

    const valorMeta = isCustomMeta ? metaCustomizada : String(Number(capitalInicial || 0) * 10);

    try {
      const payloadEnvio = {
        nickname,
        initialCapital: capitalInicial,
        riskProfile: perfilRisco,
        targetGoal: valorMeta
      };

      // Disparando a gravação segura no banco através da action
      await saveSettingsAction(user.id, payloadEnvio);

      setStatusMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro ao salvar configurações no servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-[#020408] min-h-screen text-white">
      <div className="max-w-xl mx-auto bg-[#05070a] border border-white/5 rounded-2xl p-6 shadow-2xl mt-10">
        <div className="mb-6 border-b border-white/5 pb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Definição de Ciclo e Objetivos</h3>
          <p className="text-[11px] text-slate-500 mt-1">Configure os parâmetros base que alimentarão os cards de controle da estação.</p>
        </div>

        {/* Alertas de Feedback Visual */}
        {statusMessage.text && (
          <div className={`p-3 rounded-xl text-center text-xs font-bold tracking-wide mb-4 border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {statusMessage.type === 'success' ? '✓ ' : '⚠️ '} {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação da Estação (Nickname)</label>
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Operador Alpha"
              disabled={loading}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capital Alocado Inicial (R$)</label>
            <input 
              type="number" 
              value={capitalInicial}
              onChange={(e) => setCapitalInicial(e.target.value)}
              placeholder="0,00"
              disabled={loading}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-mono disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil de Gerenciamento de Risco</label>
            <div className="grid grid-cols-3 gap-2">
              {['conservador', 'moderado', 'agressivo'].map((perfil) => (
                <button
                  key={perfil}
                  type="button"
                  disabled={loading}
                  onClick={() => setPerfilRisco(perfil)}
                  className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all disabled:opacity-50 ${
                    perfilRisco === perfil 
                      ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' 
                      : 'bg-slate-950 border-white/5 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {perfil}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definição da Meta Alvo</span>
              <button 
                type="button"
                disabled={loading}
                onClick={() => setIsCustomMeta(!isCustomMeta)}
                className="text-[9px] font-bold uppercase tracking-wider text-blue-500 hover:underline disabled:opacity-50"
              >
                {isCustomMeta ? "Usar Padrão (10x)" : "Customizar Valor"}
              </button>
            </div>

            {!isCustomMeta ? (
              <div className="flex items-center justify-between text-xs py-2 px-1">
                <span className="text-slate-500 font-medium">Meta Sugerida (Fator 10x):</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {capitalInicial ? `R$ ${(capitalInicial * 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                </span>
              </div>
            ) : (
              <input 
                type="number" 
                value={metaCustomizada}
                onChange={(e) => setMetaCustomizada(e.target.value)}
                disabled={loading}
                placeholder="Digite o valor final da meta (R$)"
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-mono disabled:opacity-50"
              />
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/10 mt-2 disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "Sincronizando com a Nuvem..." : "Inicializar Estação / Atualizar Ciclo"}
          </button>
        </form>
      </div>
    </div>
  );
}