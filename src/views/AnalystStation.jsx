'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import { Sparkles, FileText, Download, Search, Upload, X, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardModal from '../components/DashboardModal';
import LoadingState from '../components/LoadingState';
import { 
    dispararAnaliseAssincrona, 
    verificarStatusAnalisePorId,
    saveAnalysisResult, 
    deleteAnalysisFromNeon, 
    getAnalysisHistory 
} from '@/app/actions';
import ReportModal from '../components/ReportModal';


export default function AnalystStation({ user: propUser }) {
    // 🛡️ REDUNDÂNCIA DE TENANT:
    const [user, setUser] = useState(propUser || null);

    useEffect(() => {
        if (!user && typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('phronis_user') || localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
        }
    }, [propUser]);

    // Trava de segurança contra vazamento
    if (!user?.id) {
        return <div className="p-8 text-xs font-mono uppercase text-red-500">Aguardando validação de credenciais de segurança...</div>;
    }

    const currentUserId = user.id; // Segura e isolada

    const [assetCode, setAssetCode] = useState('HGLG11');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [aiResult, setAiResult] = useState(null); // Armazena o resultado real da IA
    const [saveSummary, setSaveSummary] = useState(true);
    const [history, setHistory] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [activeModalSummary, setActiveModalSummary] = useState(null);
    const itemsPerPage = 10;
    const [customDirective, setCustomDirective] = useState('');
    const [viewStatus, setViewStatus] = useState('idle');
    const [isReportOpen, setIsReportOpen] = React.useState(false);
    const [activeModalData, setActiveModalData] = React.useState(null);
    
    // Carrega o histórico real do banco ao montar a página
    useEffect(() => {
        const loadHistory = async () => {
            const data = await getAnalysisHistory(currentUserId);
            setHistory(data);
        };
        loadHistory();
    }, [currentUserId]);

    // --- Adicione esta função para limpar/preparar os dados ---
const prepareAndOpenReport = (item) => {
    // 1. Pega o dado (seja do item direto ou de dentro de aiSummary)
    let rawData = item.aiSummary || item;

    // 2. Se for string, transforma em objeto. Se já for objeto, usa ele mesmo.
    let parsedData;
    try {
        parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch (e) {
        console.error("Erro ao converter JSON:", e);
        parsedData = {}; // Fallback de segurança
    }

    // 3. Adapter: Garante o formato esperado pelo ReportModal
    const cleanData = {
        acaoSugerida: parsedData.acaoSugerida || item.acaoSugerida || "N/A",
        temperaturaSaude: parsedData.temperaturaSaude || item.temperaturaSaude || "N/A",
        resumo: parsedData.resumo || "Resumo não disponível.",
        estrategia: parsedData.estrategia || "Estratégia não disponível.",
        projecao: parsedData.projecao || "Projeção não disponível.",
        riscos: parsedData.riscos || "Riscos não disponíveis."
    };

    setActiveModalData(cleanData);
    setIsReportOpen(true);
};

    // 1. FUNÇÃO: Executar Análise Real com Phronesis AI
    // Nova função auxiliar: Converte o PDF para Base64 para o Gemini ler
   const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ mimeType: file.type, data: reader.result.split(',')[1] });
        reader.onerror = error => reject(error);
    });
};

    // 1. FUNÇÃO: Executar Análise Real com Phronesis AI
   // Dentro do seu arquivo src/views/AnalystStation.jsx

const handleExecuteAnalysis = async () => {
    setViewStatus('loading');
    setAiResult(null);

    try {
        // 1. Converter arquivos
        const filesData = await Promise.all(uploadedFiles.map(async (file) => {
            return await fileToBase64(file);
        }));

        // 2. Disparar análise
        const result = await dispararAnaliseAssincrona(currentUserId, assetCode, filesData, customDirective);

        if (!result.success) {
            alert("Erro ao iniciar: " + result.error);
            setViewStatus('idle');
            return;
        }

        const { jobId } = result;

        // 3. Inicia o Polling
        const intervalId = setInterval(async () => {
            const statusResponse = await verificarStatusAnalisePorId(jobId);

            if (statusResponse.status === 'COMPLETED') {
                clearInterval(intervalId);
                
                // O backend já nos entrega o objeto estruturado pronto para uso
                const payload = statusResponse.payload;

                console.log("DEBUG [Dados Recebidos]:", payload);
                
                setAiResult(payload);
                setViewStatus('success');
            } 
            else if (statusResponse.status === 'ERROR') {
                clearInterval(intervalId);
                console.error("Erro reportado pelo servidor:", statusResponse.error);
                alert("A análise falhou no processamento.");
                setViewStatus('idle');
            }
        }, 3000);

    } catch (err) {
        console.error("Erro na execução:", err);
        alert("Erro ao processar arquivos.");
        setViewStatus('idle');
    }
};

    // 2. FUNÇÃO: Excluir Real do Neon
    const handleDelete = async (id) => {
        if (confirm("Deletar permanentemente do banco?")) {
            const result = await deleteAnalysisFromNeon(id);
            if (result.success) setHistory(prev => prev.filter(item => item.id !== id));
        }
    };

        // Lógica para upload de PDFs
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
        setUploadedFiles(prev => [...prev, ...files].slice(0, 5));
    };

    // Paginação simples do carrossel horizontal
    const pageCount = Math.ceil(history.length / itemsPerPage);
    const displayedHistory = history.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);




    return (
        <div className="p-8 w-full max-w-7xl mx-auto animate-fade-in pb-20">
            
            {/* INJEÇÃO DE CSS DE IMPRESSÃO INTELIGENTE A4 */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; background: transparent !important; color: black !important; }
                    #print-report-area, #print-report-area * { visibility: visible; }
                    #print-report-area { 
                        position: absolute; left: 0; top: 0; width: 210mm; height: 297mm; 
                        padding: 20mm; border: none !important; box-shadow: none !important;
                    }
                    .print\\:hidden { display: none !important; }
                }
            `}} />

            {/* HEADER */}
            <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 print:hidden">
                <div>
                    <div className="flex items-center gap-3 mb-2 text-purple-500">
                        <Sparkles size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Phronesis Intelligence</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Terminal de Análise</h2>
                    <p className="text-slate-500 text-sm">Painel tático de auditoria fundamentalista</p>
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                    
                    </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* BARRA LATERAL (FILTROS + CONFIGURAÇÕES + TABELA DE HISTÓRICO) */}
                <div className="lg:col-span-1 space-y-6 print:hidden">
                    
                    {/* CARD FILTROS */}
                    <Card className="bg-slate-900/40 border-slate-800 p-6">
                        <h4 className="text-white font-bold text-xs mb-4 uppercase tracking-widest">Filtros de Análise</h4>
                        <div className="space-y-5">
                            
                            {/* Input do Ativo */}
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Ativo de Referência</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                    <input 
                                        type="text" 
                                        value={assetCode}
                                        onChange={(e) => setAssetCode(e.target.value)}
                                        placeholder="Ex: HGLG11" 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:border-purple-500 outline-none uppercase font-mono font-bold" 
                                    />
                                </div>
                            </div>

                            {/* Upload de Documentos */}
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Suporte ({uploadedFiles.length}/5)</label>
                                <input type="file" id="pdf-upload" multiple accept=".pdf" onChange={handleFileChange} className="hidden" />
                                <label htmlFor="pdf-upload" className="w-full flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/50 hover:border-purple-500/50 transition-all cursor-pointer group">
                                    <Upload size={14} className="text-slate-500 mb-1" />
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Subir PDFs</span>
                                </label>
                            </div>

                             {/* 💡 Campo personalizado para injetar parâmetros personalizados.*/}

                            <div>
                               <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Diretriz de Análise (Opcional)</label>
                                 <textarea 
                                 value={customDirective}
                                 onChange={(e) => setCustomDirective(e.target.value)}
                                   placeholder="Ex: Foque na sustentabilidade da dívida e riscos cambiais..."
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:border-purple-500 outline-none h-20 resize-none"
                                  />
                             </div>

                            {/* 💡 NOVO: Botão Chave / Toggle Switch para salvar resumo */}
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-850">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salvar resumo da IA</span>
                                <button 
                                    type="button"
                                    onClick={() => setSaveSummary(!saveSummary)}
                                    className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${saveSummary ? 'bg-purple-600' : 'bg-slate-800'}`}
                                >
                                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-200 ${saveSummary ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <Button 
    onClick={handleExecuteAnalysis}
    disabled={viewStatus === 'loading'} // Verifica se o status é 'loading'
    className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest bg-purple-600/10 border border-purple-500/20 text-purple-500 hover:bg-purple-600 hover:text-white transition-all rounded-lg"
>
    {viewStatus === 'loading' ? "Sincronizando..." : "Executar Phronis AI"}
</Button>
                        </div>
                    </Card>

                    {/* 💡 NOVA: Tabela de Visualização de Análises com Deslizamento Lateral */}
                    <Card className="bg-slate-900/40 border-slate-800 p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-white font-bold text-[10px] uppercase tracking-widest">Histórico do Banco</h4>
                            
                            {/* Botões do Carrossel */}
                            {pageCount > 1 && (
                                <div className="flex gap-1">
                                    <button 
                                        disabled={currentPage === 0}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="p-1 rounded bg-slate-950 text-slate-400 disabled:opacity-20 hover:text-white"
                                    >
                                        <ChevronLeft size={12} />
                                    </button>
                                    <button 
                                        disabled={currentPage >= pageCount - 1}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="p-1 rounded bg-slate-950 text-slate-400 disabled:opacity-20 hover:text-white"
                                    >
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="w-full overflow-x-auto rounded border border-slate-950 bg-slate-950/40">
                            <table className="w-full min-w-[220px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-850 bg-slate-950 text-[9px] text-slate-500 font-bold uppercase">
                                        <th className="p-2">Ativo</th>
                                        <th className="p-2 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px] text-slate-300 font-mono">
                                    {displayedHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan="2" className="p-4 text-center text-slate-600 text-[10px]">Sem dados salvos</td>
                                        </tr>
                                    ) : (
                                        displayedHistory.map((item) => (
                                            <tr key={item.id} className="border-b border-slate-900/60 hover:bg-slate-900/30">
                                                <td className="p-2 font-bold text-white">{item.assetCode}</td>
                                                <td className="p-2 flex gap-1 justify-end">
                                                    {/* Botão Expansível (Abre Pop-up) */}
                                                    <button 
                                                        onClick={() => prepareAndOpenReport(item)}
                                                        className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                                                        title="Visualizar Análise"
                                                    >
                                                        <Eye size={12} />
                                                    </button>
                                                    {/* Botão de Exclusão */}
                                                    <button 
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* PAINEL DE INSIGHTS COM ID ÚNICO DE IMPRESSÃO A4 */}
                <div className="lg:col-span-3">
    <Card id="print-report-area" className="bg-slate-900/20 border-slate-800 min-h-[520px] p-10 relative overflow-hidden backdrop-blur-sm">
        {/* O DashboardModal agora gerencia o próprio Loading e a exibição do conteúdo */}
        <DashboardModal 
            status={viewStatus} 
            data={aiResult} 
        />
    </Card>
</div>
            </div>

            {/* 💡 POP-UP MODAL: Exibe o Resumo Expandido do Histórico do Banco */}
            {activeModalSummary && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in text-white">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Sparkles size={14} />
                                <h4 className="text-xs font-bold uppercase tracking-widest font-mono">Resumo IA - Ativo {activeModalSummary.assetCode}</h4>
                            </div>
                            <button onClick={() => setActiveModalSummary(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-900">
    {activeModalSummary.aiSummary || "Nenhum resumo disponível."}
</p>
                        <div className="mt-5 flex justify-end">
                            <Button onClick={() => setActiveModalSummary(null)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] px-4 py-2">
                                FECHAR REVISÃO
                            </Button>
                        </div>
                    </div>
                </div>
            )}
<ReportModal 
    isOpen={isReportOpen}
    data={activeModalData}
    onClose={() => setIsReportOpen(false)} 
/>

        </div>
    );
}