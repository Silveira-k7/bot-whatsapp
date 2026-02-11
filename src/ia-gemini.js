import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { carregarPersonalidade, carregarConversasAntigas } from './config/personalidade.js';
import { registrarPergunta } from './database.js';

dotenv.config();

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest',
    generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 200
    }
});

const personalidade = carregarPersonalidade();
const conversasAntigas = carregarConversasAntigas();

// CACHE DE RESPOSTAS para evitar exceder quota
const cacheRespostas = new Map();

// RESPOSTAS PRÉ-PROGRAMADAS quando quota excedida
const respostasPadrao = {
    saudacao: [
        'Oi! Tudo bem? 😊',
        'Oiee! Como você está? ✨',
        'Bom dia! Tudo certo? 💚',
    ],
    preco: [
        'Quanto você gostaria de investir? 💰',
        'Temos opções pra todos os orçamentos! Qual sua faixa? 😊',
        'Depende do produto, mas temos de vários valores! Qual te interessou? 💚',
    ],
    confirmacao: [
        'Oba! 🎉 Você vai amar!',
        'Perfeito! Vou separar agora mesmo 😊',
        'Que bom! Já está separado aqui 💚',
    ],
    desconhecida: [
        'Me conta mais sobre isso! 😊',
        'Entendi! E como posso te ajudar? 💚',
        'Ótimo! Me passa mais informações? 📱',
    ]
};

/**
 * Classifica mensagem para usar resposta padrão apropriada
 */
function classificarMensagem(mensagem) {
    const msg = mensagem.toLowerCase();
    
    if (msg.match(/^(oi|ola|olá|oiee|e aí|e ai|bom dia|boa tarde|boa noite)/)) {
        return 'saudacao';
    }
    if (msg.includes('prec') || msg.includes('cust') || msg.includes('valor') || msg.includes('tabela')) {
        return 'preco';
    }
    if (msg.match(/^(quero|vou|fechad|confirm|sim|pode|sep)/)) {
        return 'confirmacao';
    }
    return 'desconhecida';
}

/**
 * Processa mensagem do cliente usando Google Gemini com cache e fallback
 */
export async function processarMensagem(mensagem, historico = [], nomeCliente = 'Cliente', contextoExpandido = null) {
    try {
        // Verificar se já temos resposta em cache para esta mensagem
        const chaveCache = `${nomeCliente}:${mensagem}`;
        if (cacheRespostas.has(chaveCache)) {
            console.log('💾 Usando resposta em cache');
            const resposta = cacheRespostas.get(chaveCache);
            return resposta;
        }

        // Tentar com Gemini
        let respostaTexto = '';
        
        try {
            const contextoHistorico = historico.length > 0
                ? `Você já falou com ${nomeCliente}:\n${historico.slice(0, 2).map(h =>
                    `${nomeCliente}: ${h.mensagem}\nVocê: ${h.resposta}`
                ).join('\n')}\n\n`
                : '';

            // Adicionar informações do contexto expandido
            let infoCliente = '';
            if (contextoExpandido && contextoExpandido.resumo) {
                const { total_mensagens, total_compras } = contextoExpandido.resumo;
                if (total_mensagens > 0) {
                    infoCliente = `[Cliente com ${total_mensagens} interações`;
                    if (total_compras > 0) {
                        infoCliente += `, já comprou ${total_compras}x`;
                    }
                    infoCliente += `]\n`;
                }
            }

            const exemplosConversa = conversasAntigas.length > 0
                ? `Seu estilo:\n${conversasAntigas.slice(0, 1).map(conv => 
                    conv.substring(0, 300)
                ).join('\n\n')}\n\n`
                : '';

            const prompt = `Você é ${personalidade.nome}, vendedora ANIMADA! 🌟
- Casual e calorosa (use "nossa", "oba", "aiii")
- Emojis naturais 😊💚✨
- Respostas curtas (2-3 linhas max)
${exemplosConversa}${infoCliente}${contextoHistorico}${nomeCliente}: "${mensagem}"
Responda como vendedora:`;

            const result = await model.generateContent(prompt);
            respostaTexto = result.response.text();
            
            console.log(`📝 Gemini OK (${respostaTexto.length} chars)`);
        } catch (err) {
            // Se falhar por quota ou erro, usar resposta padrão
            if (err.message.includes('429') || err.message.includes('quota')) {
                console.log('⚠️ Quota Gemini excedida, usando respostas pré-programadas');
            } else {
                console.log('⚠️ Erro Gemini:', err.message?.substring(0, 50));
            }
            
            // Classificar mensagem e usar resposta apropriada
            const tipo = classificarMensagem(mensagem);
            const opcoesResposta = respostasPadrao[tipo];
            respostaTexto = opcoesResposta[Math.floor(Math.random() * opcoesResposta.length)];
            
            console.log(`📦 Usando resposta padrão (${tipo})`);
        }

        if (!respostaTexto || respostaTexto.trim().length === 0) {
            respostaTexto = 'Oi! Que bom te ver aqui 😊 Me conta, como posso te ajudar?';
        }

        const analise = analisarMensagemSimples(mensagem, respostaTexto);

        if (analise.categoria) {
            await registrarPergunta(mensagem, analise.categoria);
        }

        const resposta = {
            texto: respostaTexto,
            foiVenda: analise.foiVenda,
            valorVenda: analise.valorVenda,
            precisaHumano: analise.precisaHumano,
            categoria: analise.categoria
        };

        // Guardar em cache por 24h
        cacheRespostas.set(chaveCache, resposta);

        return resposta;

    } catch (error) {
        console.error('❌ Erro crítico:', error.message?.substring(0, 50));
        return {
            texto: 'Oi! Que bom te ver 😊 Me dá só um minutinho?',
            foiVenda: false,
            precisaHumano: true,
            categoria: 'erro'
        };
    }
}

/**
 * Análise simples da conversa (sem segunda chamada)
 */
function analisarMensagemSimples(mensagem, resposta) {
    const msgLower = mensagem.toLowerCase();

    const palavrasVenda = [
        'vou querer', 'quero comprar', 'pode separar', 'fechado',
        'confirmo', 'quero sim', 'vou levar', 'pode enviar'
    ];
    const foiVenda = palavrasVenda.some(p => msgLower.includes(p));

    let valorVenda = 0;
    const matchValor = resposta.match(/R\$\s*(\d+(?:[.,]\d{2})?)/);
    if (matchValor && foiVenda) {
        valorVenda = parseFloat(matchValor[1].replace(',', '.'));
    }

    const palavrasComplexas = [
        'reclamação', 'reclamacao', 'problema grave', 'processo', 'reembolso',
        'advogado', 'procon', 'devolução', 'devolver', 'não funciona'
    ];
    const precisaHumano = palavrasComplexas.some(p => msgLower.includes(p));

    let categoria = 'geral';
    if (msgLower.includes('preço') || msgLower.includes('preco') || msgLower.includes('quanto') || msgLower.includes('valor') || msgLower.includes('custa')) {
        categoria = 'preco';
    } else if (msgLower.includes('entrega') || msgLower.includes('frete') || msgLower.includes('envio')) {
        categoria = 'entrega';
    } else if (msgLower.includes('pagamento') || msgLower.includes('pix') || msgLower.includes('cartão') || msgLower.includes('cartao')) {
        categoria = 'pagamento';
    } else if (msgLower.includes('produto') || msgLower.includes('tem') || msgLower.includes('disponível') || msgLower.includes('disponivel') || msgLower.includes('estoque')) {
        categoria = 'produto';
    } else if (msgLower.includes('reclamação') || msgLower.includes('reclamacao') || msgLower.includes('problema')) {
        categoria = 'reclamacao';
    }

    return { foiVenda, valorVenda, precisaHumano, categoria };
}

export { analisarMensagemSimples as analisarConversa };
