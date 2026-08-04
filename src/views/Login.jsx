'use client';

import React, { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Card, Input, Button } from '../components/UI';
import { loginAction } from '../app/actions';


export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            // Executa a validação direto no banco de dados via Drizzle
             const userData = await loginAction(email, password);
            
            // Sucesso! Passa o usuário logado para a aplicação
            onLogin(userData); 
        } catch (error) {
            setErrorMessage(error.message || 'Erro interno na validação da estação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#05070a] relative overflow-hidden">
            {/* Efeito de Luz de Fundo */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md p-4 z-10">
                <div className="text-center mb-8">
                    <img src="/logo.png" className="h-20 mx-auto mb-4 object-contain" alt="Phrones Logo" 
                         onError={(e) => e.target.style.display='none'} />
                    <p className="text-slate-500 mt-2 italic font-medium">Estação de Inteligência</p>
                </div>

                <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-800 p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Exibição do Alerta de Erro Visual */}
                        {errorMessage && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold text-center tracking-wide">
                                ⚠️ {errorMessage}
                            </div>
                        )}

                        <Input 
                            label="E-mail Institucional"
                            type="email"
                            placeholder="seu@email.com"
                            icon={Mail}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        
                        <div className="space-y-1">
                            <Input 
                                label="Chave de Acesso"
                                type="password"
                                placeholder="••••••••"
                                icon={Lock}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20 text-white"
                            isLoading={loading}
                            icon={LogIn}
                        >
                            ACESSAR ESTAÇÃO
                        </Button>
                    </form>
                </Card>

                <p className="text-center text-slate-600 text-xs mt-8 uppercase tracking-widest font-bold">
                    Acesso restrito a operadores autorizados
                </p>
            </div>
        </div>
    );
}