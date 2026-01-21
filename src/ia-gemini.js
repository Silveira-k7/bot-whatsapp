import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { carregarPersonalidade, carregarConversasAntigas } from './config/personalidade.js';
import { registrarPergunta } from './database.js';

dotenv.config();

// Inicializar Gemini com configuração correta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Tentar modelo disponível (sem prefixo models/)
const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 300
    }
});

const personalidade = carregarPersonalidade();
const conversasAntigas = carregarConversasAntigas();

/**
 * Processa mensagem do cliente usando Google Gemini
 */
export async function processarMensagem(mensagem, historico = [], nomeCliente = 'Cliente') {
    try {
        // Construir contexto com histórico
        const contextoHistorico = historico.length > 0
            ? `\n\nHistórico de conversas com este cliente:\n${historico.slice(0, 5).map(h =>
                `Cliente: ${h.mensagem}\nVocê: ${h.resposta}`
            ).join('\n')}`
            : '';

        // Construir contexto com conversas antigas (treinamento)
        const contextoTreinamento = conversasAntigas.length > 0
            ? `\n\nExemplos de como você costuma conversar:\n${conversasAntigas.slice(0, 3).join('\n\n---\n\n')}`
            : '';

        const prompt = `${personalidade.instrucoes}\n\n${personalidade.informacoes}\n\n${contextoTreinamento}\n\nIMPORTANTE:\n- Seja natural, cordial e use emojis moderadamente (1-2 por mensagem)\n- Responda exatamente como a ${personalidade.nome} responderia\n- Se for pergunta sobre preço, informe e tente fechar venda\n- Se não souber algo específico, seja honesta mas mantenha o interesse\n- Mantenha respostas curtas e objetivas (máximo 3-4 linhas)\n\n${contextoHistorico}\n\nAgora responda esta mensagem de ${nomeCliente}:\n"${mensagem}"\n\nSua resposta (seja natural e humana):`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const respostaTexto = response.text();

        const analise = analisarMensagemSimples(mensagem, respostaTexto);

        if (analise.categoria) {
            await registrarPergunta(mensagem, analise.categoria);
        }

        return {
            texto: respostaTexto,
            foiVenda: analise.foiVenda,
            valorVenda: analise.valorVenda,
            precisaHumano: analise.precisaHumano,
            categoria: analise.categoria
        };

    } catch (error) {
        console.error('❌ Erro ao processar com Gemini:', error.message);
        return {
            texto: 'Oi! Estou com um probleminha técnico agora, mas já avisei a responsável. Ela vai te responder em breve! 😊',
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
