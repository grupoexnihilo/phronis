// =========================================================================
// ARQUIVO NOVO: src/services/scheduler.js (Agendador de 24 Horas)
// =========================================================================
import { sincronizarTodosOsMercados } from './marketSync.js';

const VINTE_QUATRO_HORAS = 24 * 60 * 60 * 1000; // Tempo em milissegundos

async function iniciarAgendador() {
    console.log("🚀 Servidor de Agendamento da TraderArea Iniciado!");
    console.log("⏳ Executando a primeira sincronização de teste agora...");
    
    // Executa imediatamente no início
    await sincronizarTodosOsMercados();

    console.log(`\n💤 Sincronização concluída. Próxima execução agendada para daqui a 24 horas.`);
    
    // Deixa o processo escutando e rodando a cada 24 horas cravadas
    setInterval(async () => {
        console.log("⏰ [Timer] Disparando rotina diária automática...");
        await sincronizarTodosOsMercados();
        console.log("💤 Tarefa concluída. Aguardando mais 24 horas...");
    }, VINTE_QUATRO_HORAS);
}

iniciarAgendador();