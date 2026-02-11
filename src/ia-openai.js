import dotenv from 'dotenv';
import OpenAI from 'openai';
import { carregarPersonalidade, carregarConversasAntigas } from './config/personalidade.js';
import { registrarPergunta } from './database.js';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const personalidade = carregarPersonalidade();
const conversasAntigas = carregarConversasAntigas();

async function processarMensagem(mensagem, historico = [], nomeCliente = 'Cliente', contextoExpandido = null) {
    try {
        const contextoHistorico = historico.length > 0
            ? `\n\nHistórico de conversas com este cliente:\n${historico.map(h => `Cliente: ${h.mensagem}\nVocê: ${h.resposta}`).join('\n')}`
            : '';

        // Adicionar informações do contexto expandido
        let infoAdicional = '';
        if (contextoExpandido && contextoExpandido.resumo) {
            const { total_mensagens, total_compras, primeira_interacao } = contextoExpandido.resumo;
            if (total_mensagens > 0) {
                infoAdicional = `\n\nInformações sobre este cliente:\n`;
                infoAdicional += `- Total de interações anteriores: ${total_mensagens}\n`;
                if (total_compras > 0) {
                    infoAdicional += `- Cliente já comprou ${total_compras} vez(es) antes\n`;
                }
                if (contextoExpandido.padroes?.eh_cliente_recorrente) {
                    infoAdicional += `- Cliente recorrente - seja especialmente atencioso!\n`;
                }
            }
        }

        const contextoTreinamento = conversasAntigas.length > 0
            ? `\n\nExemplos de como você costuma conversar:\n${conversasAntigas.join('\n\n')}`
            : '';

        const systemPrompt = `${personalidade.instrucoes}\n\n${personalidade.informacoes}\n\n${contextoTreinamento}\n\nIMPORTANTE:\n- Seja natural, cordial e use emojis moderadamente\n- Responda como a ${personalidade.nome} responderia\n- Se for pergunta sobre preço, informe e tente fechar venda\n- Se não souber algo, seja honesta mas não perca a venda\n- Identifique se a mensagem indica uma venda e marque isso\n- Se o assunto for muito complexo ou delicado, sugira que a dona do negócio entrará em contato\n- Mantenha consistência e ritmo da conversa baseado no histórico\n\n${infoAdicional}${contextoHistorico}`;

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${nomeCliente} disse: ${mensagem}` }
            ],
            temperature: 0.8,
            max_tokens: 300
        });

        const respostaTexto = completion.choices[0].message.content;
        const analise = await analisarConversa(mensagem, respostaTexto);

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
        console.error('❌ Erro ao processar com IA:', error);
        return {
            texto: 'Oi! Estou com um probleminha técnico agora, mas já avisei a responsável. Ela vai te responder em breve! 😊',
            foiVenda: false,
            precisaHumano: true
        };
    }
}

async function analisarConversa(mensagem, resposta) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `Analise esta conversa e retorne JSON com:\n{\n  "foiVenda": boolean,\n  "valorVenda": number,\n  "precisaHumano": boolean,\n  "categoria": string\n}` },
                { role: 'user', content: `Cliente: ${mensagem}\nResposta: ${resposta}` }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error('❌ Erro na análise:', error);
        return {
            foiVenda: false,
            valorVenda: 0,
            precisaHumano: false,
            categoria: 'outro'
        };
    }
}

export { processarMensagem, analisarConversa };
