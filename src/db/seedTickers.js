// =========================================================================
// SUBSTITUIÇÃO COMPLETA: src/db/seedTickers.js (Agnóstico de Validador de Tipos)
// =========================================================================
import { db } from './db.js';
import { sql } from 'drizzle-orm';

async function rodarCargaInicial() {
    console.log("⚡ Iniciando carga de ativos em modo Texto Puro no Neon...");

    const ativos = [
        { s: 'PETR4', n: 'Petróleo Brasileiro S.A.', seg: 'Ações' },
        { s: 'VALE3', n: 'Vale S.A.', seg: 'Ações' },
        { s: 'ITUB4', n: 'Itaú Unibanco Holding S.A.', seg: 'Ações' },
        { s: 'BBAS3', n: 'Banco do Brasil S.A.', seg: 'Ações' },
        { s: 'BBDC4', n: 'Banco Bradesco S.A.', seg: 'Ações' },
        { s: 'ABEV3', n: 'Ambev S.A.', seg: 'Ações' },
        { s: 'RENT3', n: 'Localiza Rent a Car S.A.', seg: 'Ações' },
        
        { s: 'MXRF11', n: 'Maxi Renda FII', seg: 'FIIs' },
        { s: 'HGLG11', n: 'CGHG Logística FII', seg: 'FIIs' },
        { s: 'XPLG11', n: 'XP Logística FII', seg: 'FIIs' },
        { s: 'KNRI11', n: 'Kinea Renda Imobiliária FII', seg: 'FIIs' },
        { s: 'XPML11', n: 'XP Malls FII', seg: 'FIIs' },
        
        { s: 'BTC-USD', n: 'Bitcoin / Dólar Americano', seg: 'Forex' },
        { s: 'ETH-USD', n: 'Ethereum / Dólar Americano', seg: 'Forex' },
        { s: 'SOL-USD', n: 'Solana / Dólar Americano', seg: 'Forex' },
        { s: 'EUR-USD', n: 'Euro / Dólar Americano', seg: 'Forex' },
        { s: 'GBP-USD', n: 'Libra Esterlina / Dólar Americano', seg: 'Forex' },
        
        { s: 'PETRL300', n: 'Opção de Compra PETR4', seg: 'Opções' },
        { s: 'VALEM500', n: 'Opção de Venda VALE3', seg: 'Opções' },
        { s: 'ITUBK250', n: 'Opção de Compra ITUB4', seg: 'Opções' },
        { s: 'BBDCW400', n: 'Opção de Venda BBDC4', seg: 'Opções' }
    ];

    let inseridos = 0;
    let erros = 0;

    for (const ativo of ativos) {
        try {
            // Criamos a query montando as strings escapadas à moda antiga.
            // O sql.raw impede que o Drizzle tente criar estruturas de binders dinâmicos ($1, $2)
            const queryRaw = sql.raw(`
                INSERT INTO market_tickers (symbol, name, segment, is_active, updated_at)
                VALUES ('${ativo.s}', '${ativo.n.replace(/'/g, "''")}', '${ativo.seg}', true, NOW())
                ON CONFLICT (symbol) DO NOTHING;
            `);
            
            await db.execute(queryRaw);
            inseridos++;
        } catch (err) {
            console.error(`⚠️ Erro ao inserir item individual [${ativo.s}]:`, err.message);
            erros++;
        }
    }

    console.log(`\n📊 Relatório de Carga Inicial:`);
    console.log(`✅ Sucesso: ${inseridos} ativos processados.`);
    console.log(`❌ Falhas: ${erros} erros.`);
    
    process.exit(0);
}

rodarCargaInicial();