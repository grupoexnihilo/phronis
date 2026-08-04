import React, { useState } from 'react';
import { 
    ChevronLeft, 
    ChevronRight, 
    LayoutDashboard, 
    LineChart, 
    Zap, 
    History as HistoryIcon,
    Settings,
    Layout,
    BrainCircuit
} from 'lucide-react';

export default function Sidebar({ currentView, setView }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Mapeamos os IDs para as views. 
    // Acrescentado o item 'simulations' utilizando o ícone Layout
    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Monitor Central' },
        { id: 'trader', icon: Zap, label: 'Área Trader' }, // Seu novo terminal dedicado
        { id: 'simulations', icon: Layout, label: 'Simulações' }, // Conectado à view do Neon
        { id: 'history', icon: HistoryIcon, label: 'Histórico de Auditoria' },
        { id: 'analyst', icon: LineChart, label: 'Terminal de Análise' },
        { id: 'chief_strategist', icon: BrainCircuit, label: 'Estrategista Chefe' },
        { id: 'settings', icon: Settings, label: 'Configurações' },
    ];

    return (
        <aside 
            className={`h-screen sticky top-0 bg-[#0a0d12] border-r border-slate-800 transition-all duration-300 flex flex-col z-50 ${
                isCollapsed ? 'w-20' : 'w-64'
            }`}
        >
            {/* BOTÃO TOGGLE */}
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-10 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition-colors border-2 border-[#05070a] z-[60]"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* LOGO (DINÂMICA: SE ADAPTA SE A SIDEBAR ESTIVER ABERTA OU FECHADA) */}
            <div className={`p-6 mb-6 flex items-center overflow-hidden ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                {isCollapsed ? (
                    /* Caso a Sidebar esteja FECHADA: Mantém o Ícone (avatar.png) no tamanho padrão */
                    <img 
                        src="/avatar.png" 
                        alt="Ícone Phrones" 
                        className="w-10 h-10 object-contain animate-in fade-in zoom-in-95 duration-200" 
                    />
                ) : (
                    /* 💡 Caso a Sidebar esteja ABERTA: Logo ampliada de h-10 para h-14 */
                    <img 
                        src="/logo.png" 
                        alt="Phrones Logo" 
                        className="h-25 w-auto object-contain pr-4 animate-in fade-in slide-in-from-left-3 duration-300" 
                    />
                )}
            </div>

            {/* NAVEGAÇÃO */}
            <nav className="flex-1 px-3 space-y-2">
                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative ${
                                isActive 
                                ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' 
                                : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent'
                            }`}
                        >
                            <item.icon size={22} className={`${isActive ? 'text-blue-500' : 'group-hover:scale-110 transition-transform'}`} />
                            
                            {!isCollapsed && (
                                <span className="font-bold text-sm tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-2">
                                    {item.label}
                                </span>
                            )}

                            {/* Indicador Ativo Lateral */}
                            {isActive && (
                                <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* PERFIL / FOOTER */}
            <div className="p-4 border-t border-slate-800/50">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/5">
                        OP
                    </div>
                    {!isCollapsed && (
                        <div className="animate-in fade-in duration-700">
                            <p className="text-xs font-bold text-white leading-none">Trader Pro</p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Sessão Ativa</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}