'use client';

import React from 'react';
import { Target, AlertTriangle, Zap, TrendingUp } from 'lucide-react';
import { Card } from '../components/UI';

export default function TraderStation({ selectedClient, user }) { // 🛡️ Acoplado ao tenant
    const isAlpha = selectedClient === 'alpha';

    return (
        <div className="p-8 w-full max-w-7xl mx-auto animate-fade-in pb-20">
            <header className="mb-10">
                <div className="flex items-center gap-3 mb-2 text-blue-500">
                    <Zap size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Sessão de Campo</span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight italic">Operações de Campo</h2>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-blue-600/5 border-blue-500/20 p-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">
                            {isAlpha ? "Plano Ativo: Rumo aos 10x" : "Aguardando Plano..."}
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Posição Atual</p>
                                    <p className="text-4xl font-black text-white">{isAlpha ? "R$ 250,00" : "R$ 0,00"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Take Profit (Meta)</p>
                                    <p className="text-2xl font-bold text-slate-400">{isAlpha ? "R$ 2.500,00" : "R$ 0,00"}</p>
                                </div>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div className={`bg-blue-600 h-full transition-all duration-1000 ${isAlpha ? 'w-[10%]' : 'w-0'}`} />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="bg-slate-900/40 border-slate-800 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-8 text-amber-500">
                            <AlertTriangle size={18} />
                            <h4 className="font-bold text-[10px] uppercase tracking-widest">Risco Institucional</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
                                <span className="text-red-500 font-mono text-xs">STOP: {isAlpha ? "R$ 12,50" : "R$ 0,00"}</span>
                            </div>
                            <div className="flex justify-between bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
                                <span className="text-emerald-500 font-mono text-xs">TAKE: {isAlpha ? "R$ 25,00" : "R$ 0,00"}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}