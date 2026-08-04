'use client';

import React from 'react';
import { Card, CardTitle } from '../components/UI';
import { ShieldCheck, Settings } from 'lucide-react';

export default function OfficeManager() {
    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h2 className="text-3xl font-black text-white">Gestão do Escritório</h2>
                <p className="text-slate-500">Configurações de equipe e permissões B2B.</p>
            </header>
            <Card>
                <CardTitle icon={ShieldCheck}>Segurança & Analistas</CardTitle>
                <p className="text-slate-400 text-sm">Lista de usuários autorizados e limites de cota Gemini/MarketData.</p>
            </Card>
        </div>
    );
}