'use client';

import React from 'react';
import { Card, CardTitle } from '../components/UI';
import { 
    LayoutDashboard, TrendingUp, Users, Zap, 
    ShieldCheck, Globe, ArrowUpRight, BarChart3 
} from 'lucide-react';

export default function Home() {
    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* HEADER COM STATUS DO SERVIDOR */}
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Mission Control</h2>
                    <p className="text-slate-500 font-medium">Bem-vindo à Estação de Inteligência Fox Pro Alpha.</p>
                </div>
                <div className="hidden md:flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Node Status: Online</span>
                </div>
            </header>

            {/* GRID DE MÉTRICAS PRINCIPAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Acerto Global" value="--%" sub="Win Rate" icon={TrendingUp} color="text-teal-400" />
                <StatCard label="Analistas Ativos" value="08" sub="AAI Partners" icon={Users} color="text-blue-400" />
                <StatCard label="Volume Analisado" value="R$ 0,00" sub="Mês Atual" icon={BarChart3} color="text-purple-400" />
                <StatCard label="Latência IA" value="142ms" sub="Gemini 1.5 Flash" icon={Zap} color="text-amber-400" />
            </div>

            {/* ÁREA CENTRAL: INSIGHTS E MERCADO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-l-4 border-teal-500/50">
                    <CardTitle icon={Globe}>Panorama Global (Real-time)</CardTitle>
                    <div className="space-y-4">
                        <MarketItem label="IBOVESPA" value="128.450" change="+0.45%" up={true} />
                        <MarketItem label="DÓLAR COMERCIAL" value="R$ 5,12" change="-0.12%" up={false} />
                        <MarketItem label="S&P 500" value="5.240" change="+0.88%" up={true} />
                    </div>
                    <button className="mt-8 text-xs font-bold text-teal-500 hover:text-teal-400 transition-colors uppercase tracking-widest flex items-center gap-2">
                        Acessar Terminal de Dados <ArrowUpRight className="w-4 h-4" />
                    </button>
                </Card>

                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
                    <CardTitle icon={ShieldCheck}>Cyber Security</CardTitle>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        Sua conexão está protegida por criptografia de ponta a ponta. Todos os racionais gerados são auditados pelo motor Fox Pro.
                    </p>
                    <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Criptografia Ativa</p>
                        <p className="text-xs font-mono text-teal-500/70 truncate">AES-256-GCM-CLOUD-AUTH</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// Sub-componentes para manter o código limpo
function StatCard({ label, value, sub, icon: Icon, color }) {
    return (
        <Card className="stat-card">
            <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
                <Icon className={`w-5 h-5 ${color} opacity-70`} />
            </div>
            <p className={`text-3xl font-black text-white mb-1`}>{value}</p>
            <p className="text-[10px] text-slate-600 font-bold uppercase">{sub}</p>
        </Card>
    );
}

function MarketItem({ label, value, change, up }) {
    return (
        <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-sm font-bold text-slate-300">{label}</span>
            <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-white">{value}</span>
                <span className={`text-xs font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
                    {change}
                </span>
            </div>
        </div>
    );
}