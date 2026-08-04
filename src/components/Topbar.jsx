import React, { useState, useEffect } from 'react';
import { LogOut, User, ChevronDown, ShieldCheck, UserCircle, Clock } from 'lucide-react';
// 💡 IMPORTANTE: Importando a Server Action que busca os dados no Neon
import { getUserFromDB } from '../db/actions'; 

export default function Topbar({ user, isConsultantMode, setIsConsultantMode, onClientChange }) {
  const [time, setTime] = useState('');
  const [dbUser, setDbUser] = useState(null);

  // Extrai o ID do usuário de forma segura sem forçar fallbacks concorrentes globais
  const currentUserId = user?.id;

  // --- RELÓGIO DO TERMINAL ---
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTime(`${dateStr} | ${timeStr}`);
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 💡 EFFECT CORRIGIDO: Proteção contra Loops e Condicional de Carregamento
  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      // Se o ID do usuário ainda não existir no contexto, tenta usar o ID 1 como padrão temporário,
      // mas evita reexecutar o bloco se os dados já tiverem sido preenchidos.
      const idToFetch = currentUserId || 1;
      
      try {
        const response = await getUserFromDB(idToFetch);
        if (response.success && isMounted) {
          setDbUser(response.user);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do operador na Topbar:", err);
      }
    }

    loadUserData();

    // Função de limpeza para evitar vazamento de memória e atualizar estados de componentes desmontados
    return () => {
      isMounted = false;
    };
  }, [currentUserId]); // 💡 Monitora estritamente a mudança do ID real do usuário

  // 🚩 FEATURE FLAG: Mude para 'true' quando quiser reativar o Modo Consultoria em todo o painel
  const ENABLE_CONSULTANT_MODE = false;

  return (
    <header className="w-full bg-[#05070a]/80 backdrop-blur-md border-b border-slate-800/50 pt-8 pb-6 px-8 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          {/* Identidade */}
          <div className={`flex items-center gap-3 pr-6 ${ENABLE_CONSULTANT_MODE ? 'border-r border-slate-800' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <User className="text-blue-500" size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-tight">
                {ENABLE_CONSULTANT_MODE ? "Operador" : "Operador Ativo"}
              </p>
              {/* EXIBIÇÃO DINÂMICA DO NOME DO USUÁRIO DO NEON DB: */}
              <h4 className="text-white text-sm font-semibold tracking-wide italic">
                {dbUser ? dbUser.name : "Carregando Operador..."}
              </h4>
            </div>
          </div>

          {/* O BLOCO ABAIXO SÓ EXISTE VISUALMENTE SE A FEATURE FLAG FOR TRUE */}
          {ENABLE_CONSULTANT_MODE && (
            <>
              {/* INTERRUPTOR DE MODO (Toggle) */}
              <button 
                onClick={() => {
                    setIsConsultantMode(!isConsultantMode);
                    if(isConsultantMode) onClientChange(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    isConsultantMode 
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                {isConsultantMode ? <ShieldCheck size={14} /> : <UserCircle size={14} />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isConsultantMode ? "MODO CONSULTORIA" : "MODO INDIVIDUAL"}
                </span>
              </button>

              {/* Seletor de Cliente */}
              {isConsultantMode && (
                <div className="flex flex-col relative animate-fade-in">
                  <div className="relative">
                    <select 
                      onChange={(e) => onClientChange(e.target.value)}
                      className="appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-bold rounded-lg pl-3 pr-10 py-2 outline-none cursor-pointer hover:border-slate-700 transition-all"
                    >
                      <option value="">Selecione o Cliente...</option>
                      <option value="alpha">Cliente Alpha (R$ 250,00)</option>
                      <option value="beta">Cliente Beta (R$ 1.200,00)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2"></div>

        {/* Relógio do Terminal */}
        <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-950/50 border border-slate-800/40 text-slate-400 font-mono text-[10px] font-bold tracking-wider">
          <Clock size={13} className="text-blue-500 animate-pulse" />
          <span className="uppercase">{time}</span>
        </div>

        {/* Botão Sair */}
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold"
        >
          <LogOut size={14} />
          <span className="uppercase tracking-widest">Sair</span>
        </button>
      </div>
    </header>
  );
}