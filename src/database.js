import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const sqlite = sqlite3.verbose();
const db = new sqlite.Database('./database.sqlite');

// Promisificar métodos
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Criar tabelas
async function inicializarDB() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS conversas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_cliente TEXT NOT NULL,
            nome_cliente TEXT,
            mensagem TEXT NOT NULL,
            resposta TEXT,
            tipo TEXT DEFAULT 'cliente',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            foi_venda BOOLEAN DEFAULT 0,
            valor_venda REAL DEFAULT 0,
            assumido_humano BOOLEAN DEFAULT 0
        )
    `);

    await dbRun(`
        CREATE TABLE IF NOT EXISTS metricas_diarias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL UNIQUE,
            total_conversas INTEGER DEFAULT 0,
            total_vendas INTEGER DEFAULT 0,
            valor_total REAL DEFAULT 0,
            clientes_unicos INTEGER DEFAULT 0
        )
    `);

    await dbRun(`
        CREATE TABLE IF NOT EXISTS perguntas_frequentes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pergunta TEXT NOT NULL,
            categoria TEXT,
            contador INTEGER DEFAULT 1,
            ultima_vez DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('✅ Banco de dados inicializado');
}

// Salvar conversa
async function salvarConversa(dados) {
    const { numero, nome, mensagem, resposta, tipo, foiVenda, valorVenda, assumidoHumano } = dados;
    
    await dbRun(`
        INSERT INTO conversas (numero_cliente, nome_cliente, mensagem, resposta, tipo, foi_venda, valor_venda, assumido_humano)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [numero, nome, mensagem, resposta || null, tipo || 'cliente', foiVenda || 0, valorVenda || 0, assumidoHumano || 0]);
}

// Buscar histórico de cliente
async function buscarHistoricoCliente(numero, limite = 10) {
    return await dbAll(`
        SELECT mensagem, resposta, timestamp, foi_venda
        FROM conversas
        WHERE numero_cliente = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `, [numero, limite]);
}

// Registrar pergunta frequente
async function registrarPergunta(pergunta, categoria = 'geral') {
    const existe = await dbGet(`
        SELECT id, contador FROM perguntas_frequentes 
        WHERE pergunta = ?
    `, [pergunta]);

    if (existe) {
        await dbRun(`
            UPDATE perguntas_frequentes 
            SET contador = contador + 1, ultima_vez = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [existe.id]);
    } else {
        await dbRun(`
            INSERT INTO perguntas_frequentes (pergunta, categoria)
            VALUES (?, ?)
        `, [pergunta, categoria]);
    }
}

// Atualizar métricas diárias
async function atualizarMetricasDiarias(data, vendaRealizada = false, valorVenda = 0) {
    const metricas = await dbGet(`
        SELECT * FROM metricas_diarias WHERE data = ?
    `, [data]);

    if (metricas) {
        await dbRun(`
            UPDATE metricas_diarias 
            SET total_conversas = total_conversas + 1,
                total_vendas = total_vendas + ?,
                valor_total = valor_total + ?
            WHERE data = ?
        `, [vendaRealizada ? 1 : 0, valorVenda, data]);
    } else {
        await dbRun(`
            INSERT INTO metricas_diarias (data, total_conversas, total_vendas, valor_total)
            VALUES (?, 1, ?, ?)
        `, [data, vendaRealizada ? 1 : 0, valorVenda]);
    }
}

// Obter relatório período
async function obterRelatorio(dataInicio, dataFim) {
    const conversas = await dbGet(`
        SELECT 
            COUNT(*) as total_conversas,
            COUNT(DISTINCT numero_cliente) as clientes_unicos,
            SUM(foi_venda) as total_vendas,
            SUM(valor_venda) as valor_total
        FROM conversas
        WHERE DATE(timestamp) BETWEEN ? AND ?
    `, [dataInicio, dataFim]);

    const perguntasFrequentes = await dbAll(`
        SELECT pergunta, contador, categoria
        FROM perguntas_frequentes
        ORDER BY contador DESC
        LIMIT 10
    `);

    const horariosPico = await dbAll(`
        SELECT 
            strftime('%H', timestamp) as hora,
            COUNT(*) as total
        FROM conversas
        WHERE DATE(timestamp) BETWEEN ? AND ?
        GROUP BY hora
        ORDER BY total DESC
        LIMIT 5
    `, [dataInicio, dataFim]);

    return {
        conversas,
        perguntasFrequentes,
        horariosPico
    };
}

/**
 * Exportar conversas bem-sucedidas para treinamento
 * Retorna conversas completas formatadas para treinar o modelo
 */
async function exportarConversasParaTreinamento(opcoes = {}) {
    const {
        limite = 100,
        apenasVendas = false,
        dataInicio = null,
        dataFim = null
    } = opcoes;

    let query = `
        SELECT 
            c1.numero_cliente,
            c1.nome_cliente,
            c1.mensagem,
            c1.resposta,
            c1.timestamp,
            c1.foi_venda
        FROM conversas c1
        WHERE c1.resposta IS NOT NULL
    `;

    const params = [];

    if (apenasVendas) {
        query += ` AND c1.foi_venda = 1`;
    }

    if (dataInicio && dataFim) {
        query += ` AND DATE(c1.timestamp) BETWEEN ? AND ?`;
        params.push(dataInicio, dataFim);
    }

    query += `
        ORDER BY c1.timestamp DESC
        LIMIT ?
    `;
    params.push(limite);

    const conversas = await dbAll(query, params);
    
    // Agrupar conversas por cliente e sessão (conversas próximas no tempo)
    const conversasAgrupadas = {};
    
    for (const conv of conversas) {
        const chave = conv.numero_cliente;
        if (!conversasAgrupadas[chave]) {
            conversasAgrupadas[chave] = [];
        }
        conversasAgrupadas[chave].push(conv);
    }

    return conversasAgrupadas;
}

/**
 * Formatar conversas para arquivo de treinamento
 * Retorna texto formatado pronto para salvar em arquivo .txt
 */
async function formatarConversasParaTreinamento(opcoes = {}) {
    const conversasAgrupadas = await exportarConversasParaTreinamento(opcoes);
    let textoFormatado = '';

    for (const [numeroCliente, conversas] of Object.entries(conversasAgrupadas)) {
        const nomeCliente = conversas[0]?.nome_cliente || 'Cliente';
        textoFormatado += `\n=== Conversa com ${nomeCliente} ===\n\n`;

        // Reverter ordem para mostrar cronologicamente
        conversas.reverse();

        for (const conv of conversas) {
            textoFormatado += `Cliente: ${conv.mensagem}\n`;
            if (conv.resposta) {
                textoFormatado += `Vendedor: ${conv.resposta}\n\n`;
            }
        }

        textoFormatado += '\n';
    }

    return textoFormatado;
}

/**
 * Buscar contexto expandido da conversa
 * Retorna mais contexto sobre conversas anteriores para manter o ritmo
 */
async function buscarContextoExpandido(numero, mensagensRecentes = 5, incluirHistoricoAntigo = true) {
    // Buscar mensagens recentes
    const recentes = await dbAll(`
        SELECT mensagem, resposta, timestamp, foi_venda
        FROM conversas
        WHERE numero_cliente = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `, [numero, mensagensRecentes]);

    let contexto = {
        recentes: recentes.reverse(), // Ordem cronológica
        resumo: {},
        padroes: {}
    };

    if (incluirHistoricoAntigo) {
        // Estatísticas do cliente
        const stats = await dbGet(`
            SELECT 
                COUNT(*) as total_mensagens,
                SUM(foi_venda) as total_compras,
                MAX(timestamp) as ultima_interacao,
                MIN(timestamp) as primeira_interacao
            FROM conversas
            WHERE numero_cliente = ?
        `, [numero]);

        contexto.resumo = stats;

        // Categorias de perguntas deste cliente
        const categorias = await dbAll(`
            SELECT DISTINCT categoria, COUNT(*) as total
            FROM conversas c
            JOIN perguntas_frequentes pf ON pf.pergunta = c.mensagem
            WHERE c.numero_cliente = ?
            GROUP BY categoria
            ORDER BY total DESC
        `, [numero]);

        contexto.padroes = {
            categorias_interesse: categorias.map(c => c.categoria),
            eh_cliente_recorrente: stats.total_compras > 0,
            frequencia_compra: stats.total_compras || 0
        };
    }

    return contexto;
}

/**
 * Obter melhores conversas (com vendas ou alta qualidade)
 * Útil para selecionar conversas exemplares para treinamento
 */
async function obterMelhoresConversas(limite = 50) {
    return await dbAll(`
        SELECT 
            c.numero_cliente,
            c.nome_cliente,
            c.mensagem,
            c.resposta,
            c.foi_venda,
            c.valor_venda,
            c.timestamp,
            COUNT(*) OVER (PARTITION BY c.numero_cliente) as total_interacoes
        FROM conversas c
        WHERE c.resposta IS NOT NULL
        AND (
            c.foi_venda = 1 
            OR LENGTH(c.resposta) > 50
        )
        ORDER BY 
            c.foi_venda DESC,
            c.valor_venda DESC,
            c.timestamp DESC
        LIMIT ?
    `, [limite]);
}

export {
    inicializarDB,
    salvarConversa,
    buscarHistoricoCliente,
    registrarPergunta,
    atualizarMetricasDiarias,
    obterRelatorio,
    exportarConversasParaTreinamento,
    formatarConversasParaTreinamento,
    buscarContextoExpandido,
    obterMelhoresConversas,
    db
};
