// =========================================================================
// VERSÃO DEFINITIVA CORRIGIDA: src/services/marketSync.js
// =========================================================================
import { db } from '../db/db.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Garante a captura exata do token do .env.local
const BRAPI_TOKEN = process.env.DATABASE_URL ? (process.env.VITE_DATABASE_URL ? process.env.BRAPI_TOKEN : process.env.BRAPI_TOKEN) : process.env.BRAPI_TOKEN;
const tokenReal = BRAPI_TOKEN || '';

export async function sincronizarTodosOsMercados() {
    console.log("🌙 [Automação] Iniciando verificação minuciosa multi-endpoint...");
    const ativosParaSalvar = [];
    const agoraStr = new Date().toISOString();

    const headersPadrao = {
        'Accept': 'application/json'
    };

    // --- 1. MERCADO BRASILEIRO BASE (Ações e FIIs) ---
    try {
        console.log("📥 [B3] Chamando endpoint geral...");
        const resB3 = await fetch(`https://brapi.dev/api/available?token=${tokenReal}`, { headers: headersPadrao });
        
        if (resB3.ok) {
            const dadosB3 = await resB3.json();
            const stocks = dadosB3.stocks || [];
            
            stocks.forEach(ticker => {
                const symbol = ticker.toUpperCase();
                let segment = 'Ações';

                const unidadesConhecidas = ['SANB11', 'TAEE11', 'ALUP11', 'KLBN11', 'BPAC11', 'SULA11', 'ENGI11', 'TIET11'];
                if (symbol.endsWith('11') && !unidadesConhecidas.includes(symbol)) {
                    segment = 'FIIs';
                }

                ativosParaSalvar.push({ symbol, name: `Ativo ${symbol}`, segment });
            });
            console.log(`📊 [Fila B3]: ${stocks.length} itens prontos.`);
        } else {
            console.log(`⚠️ Status de erro B3: ${resB3.status}`);
        }
    } catch (err) {
        console.error("❌ Erro no bloco B3:", err.message);
    }

    // --- 2. ÍNDICES MUNDIAIS (Ajustado para buscar os principais de forma segura) ---
    const listaIndices = ['BVSP', 'IXIC', 'DJI', 'GSPC']; // Ibovespa, Nasdaq, Dow Jones, S&P 500
    console.log("📥 [Índices] Chamando referências estruturais...");
    for (const idxName of listaIndices) {
        try {
            const resIdx = await fetch(`https://brapi.dev/api/v2/index?index=%5E${idxName}&token=${tokenReal}`, { headers: headersPadrao });
            if (resIdx.ok) {
                const dadosIdx = await resIdx.json();
                const indexes = dadosIdx.indexes || dadosIdx.results || [];
                indexes.forEach(idx => {
                    ativosParaSalvar.push({
                        symbol: `^${idxName}`,
                        name: idx.name || `Índice ${idxName}`,
                        segment: 'Indices'
                    });
                });
            }
        } catch (err) {
            // Se o plano básico bloquear, criamos o fallback estático para manter seu dropdown perfeito no front
            console.log(`ℹ️ Aplicando Fallback estrutural para o Índice ^${idxName}`);
        }
    }
    // Garante que os principais índices existam de forma perpétua na lista
    ativosParaSalvar.push({ symbol: '^BVSP', name: 'Ibovespa', segment: 'Indices' });
    ativosParaSalvar.push({ symbol: '^GSPC', name: 'S&P 500 Index', segment: 'Indices' });
    ativosParaSalvar.push({ symbol: '^IXIC', name: 'NASDAQ Composite', segment: 'Indices' });
    console.log("📊 [Fila Índices]: Estrutura fixada com sucesso.");

    // --- 3. MERCADO FOREX (Ajustado com Fallback estrutural caso o plano limite a rota v2) ---
    try {
        console.log("📥 [Forex] Chamando moedas globais...");
        const resForex = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL,GBP-BRL,EUR-USD,GBP-USD&token=${tokenReal}`, { headers: headersPadrao });
        
        if (resForex.ok) {
            const dadosForex = await resForex.json();
            const currencyList = dadosForex.currency || dadosForex.results || [];
            currencyList.forEach(item => {
                ativosParaSalvar.push({
                    symbol: item.name.toUpperCase(),
                    name: item.description || `Par Cambial ${item.name}`,
                    segment: 'Forex'
                });
            });
        } else {
            console.log(`⚠️ Plano BRAPI limitou Forex (Status ${resForex.status}). Injetando Pares Estruturais.`);
            // Injeção de Segurança perpétua caso seu plano seja o free/básico
            const moedasFixas = [
                { s: 'USD-BRL', n: 'Dólar Americano / Real Brasileiro' },
                { s: 'EUR-BRL', n: 'Euro / Real Brasileiro' },
                { s: 'GBP-BRL', n: 'Libra Esterlina / Real Brasileiro' },
                { s: 'EUR-USD', n: 'Euro / Dólar Americano' },
                { s: 'GBP-USD', n: 'Libra Esterlina / Dólar Americano' }
            ];
            moedasFixas.forEach(m => ativosParaSalvar.push({ symbol: m.s, name: m.n, segment: 'Forex' }));
        }
    } catch (err) {
        console.error("❌ Erro no bloco Forex:", err.message);
    }

    // --- 4. MERCADO CRIPTO (Ajustado com Fallback estrutural anti-bloqueio) ---
    try {
        console.log("📥 [Crypto] Capturando criptoativos...");
        const resCripto = await fetch(`https://brapi.dev/api/v2/crypto?coin=BTC,ETH,SOL,BNB&token=${tokenReal}`, { headers: headersPadrao });
        
        if (resCripto.ok) {
            const dadosCripto = await resCripto.json();
            const coins = dadosCripto.coins || dadosCripto.results || [];
            coins.forEach(coin => {
                const ticker = (coin.coin || coin.symbol || '').toUpperCase();
                ativosParaSalvar.push({
                    symbol: ticker.includes('-USD') ? ticker : `${ticker}-USD`,
                    name: coin.fullName || coin.name || ticker,
                    segment: 'Crypto'
                });
            });
        } else {
            console.log(`⚠️ Plano BRAPI limitou Cripto (Status ${resCripto.status}). Injetando Moedas de referência.`);
            const criptosFixas = [
                { s: 'BTC-USD', n: 'Bitcoin / Dólar' },
                { s: 'ETH-USD', n: 'Ethereum / Dólar' },
                { s: 'SOL-USD', n: 'Solana / Dólar' }
            ];
            criptosFixas.forEach(c => ativosParaSalvar.push({ symbol: c.s, name: c.n, segment: 'Crypto' }));
        }
    } catch (err) {
        console.error("❌ Erro no bloco Crypto:", err.message);
    }

    // --- 5. ENVIANDO PARA O NEON ---
    console.log(`\n📦 Contagem Final da Fila: Total de ${ativosParaSalvar.length} registros para processar.`);

    if (ativosParaSalvar.length === 0) {
        console.log("❌ Fila vazia. Nenhuma query enviada.");
        return;
    }

    try {
        console.log(`⚡ Descarregando lote de ${ativosParaSalvar.length} ativos direto no Neon...`);

        const tamanhoBloco = 100; // Correção ortográfica realizada aqui
        let inseridosTotal = 0;

        for (let i = 0; i < ativosParaSalvar.length; i += tamanhoBloco) {
            const bloco = ativosParaSalvar.slice(i, i + tamanhoBloco);
            
            const valoresSql = bloco.map(a => {
                const nameLimpo = a.name.replace(/'/g, "''");
                return `('${a.symbol}', '${nameLimpo}', '${a.segment}', true, '${agoraStr}')`;
            }).join(', ');

            const queryPura = `
                INSERT INTO market_tickers (symbol, name, segment, is_active, updated_at)
                VALUES ${valoresSql}
                ON CONFLICT (symbol) DO UPDATE 
                SET is_active = true, name = EXCLUDED.name, segment = EXCLUDED.segment, updated_at = '${agoraStr}';
            `;

            await db.execute(sql.raw(queryPura));
            inseridosTotal += bloco.length;
        }

        console.log(`✅ Sucesso Absoluto: ${inseridosTotal} ativos sincronizados no banco físico.`);

        const queryLimpeza = `UPDATE market_tickers SET is_active = false WHERE updated_at < '${agoraStr}' AND segment != 'Indices';`;
        await db.execute(sql.raw(queryLimpeza));
        console.log("🧹 Dropped list limpa.");

    } catch (error) {
        console.error("❌ Falha crítica de execução SQL no Neon:", error.message);
    }
}

if (import.meta.url.endsWith(process.argv[1])) {
    sincronizarTodosOsMercados().then(() => process.exit(0));
}