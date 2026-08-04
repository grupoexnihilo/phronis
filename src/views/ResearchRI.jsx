'use client';
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import { Upload, X, Trash2, Eye, FileText, Download } from 'lucide-react';
import { executarAuditoriaRI, saveAnalysisResult, getAnalysisHistory, deleteAnalysis } from '@/app/actions';

export default function ResearchRI({ user }) {
    const [files, setFiles] = useState([]);
    const [ticker, setTicker] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [saveOnSuccess, setSaveOnSuccess] = useState(true);

    useEffect(() => { fetchHistory(); }, [user]);

    const fetchHistory = async () => {
        if (!user?.id) return;
        const data = await getAnalysisHistory(user.id);
        setHistory(data);
    };

    const handleAnalyze = async () => {
        if (!ticker) return alert("Informe o código do ativo.");
        setIsAnalyzing(true);
        try {
            const data = await executarAuditoriaRI(ticker, files.map(f => f.name));
            // Se o retorno for string, converte para objeto
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            setResult(parsedData);
            
            if (saveOnSuccess) {
                await saveAnalysisResult({ 
                    userId: user.id, assetCode: ticker, filesCount: files.length, aiSummary: JSON.stringify(parsedData) 
                });
                fetchHistory();
            }
        } catch (e) { alert("Erro na Auditoria: " + e.message); } 
        finally { setIsAnalyzing(false); }
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto p-6 text-slate-300">
            <h2 className="text-3xl font-black text-white italic">Terminal de Auditoria (RI)</h2>
            
            <Card className="p-6 border border-slate-800 bg-slate-900/20">
                <input className="w-full bg-slate-950 p-4 rounded-xl text-white mb-4 border border-slate-800" placeholder="Ticker (Ex: HGLG11)" value={ticker} onChange={(e) => setTicker(e.target.value)} />
                
                <div className="border-dashed border-2 border-slate-700 p-8 flex flex-col items-center cursor-pointer relative hover:border-blue-500">
                    <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="mb-2" />
                    <p>{files.length > 0 ? `${files.length} arquivos` : "Arraste os PDFs aqui"}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={saveOnSuccess} onChange={(e) => setSaveOnSuccess(e.target.checked)} />
                        <span className="text-xs">Salvar resumo ao finalizar</span>
                    </label>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                        {isAnalyzing ? "Processando..." : "EXECUTAR PHRONIS AI"}
                    </Button>
                </div>
            </Card>

            {/* Dashboard */}
            {result && (
                <div id="print-area" className="p-8 bg-white text-black rounded-3xl">
                    <h3 className="font-black text-xl mb-4 italic text-blue-900">Relatório: {ticker}</h3>
                    <div className="space-y-4 text-sm font-medium">
                        <p><strong>Resumo:</strong> {result.resumoExecutivo}</p>
                        <p><strong>Saúde Financeira:</strong> {result.saudeFinanceira}</p>
                        <p><strong>Recomendação:</strong> {result.recomendacao}</p>
                    </div>
                    <Button className="mt-6 bg-blue-900 text-white" onClick={() => window.print()}>Exportar PDF A4</Button>
                </div>
            )}
        </div>
    );
}