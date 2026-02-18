import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carrega a personalidade/instruções para a IA
 */
export function carregarPersonalidade() {
    // Obter dia da semana atual
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const hoje = new Date();
    const diaSemana = diasSemana[hoje.getDay()];
    const dataFormatada = hoje.toLocaleDateString('pt-BR');
    
    // Determinar onde está hoje
    let ondeEstaHoje = '';
    let statusHoje = '';
    
    if (diaSemana === 'quarta') {
        ondeEstaHoje = 'Estou no CACI das 15:00 às 20:00 hoje';
        statusHoje = 'tem_feira';
    } else if (diaSemana === 'sábado') {
        ondeEstaHoje = 'Estou em frente à Prefeitura de Valinhos das 8:00 às 13:00 hoje';
        statusHoje = 'tem_feira';
    } else {
        ondeEstaHoje = 'Não tenho feira hoje, mas aceito encomendas e pedidos para retirada em outro dia';
        statusHoje = 'sem_feira';
    }
    
    return {
        nome: process.env.DONA_NEGOCIO || 'Giseli',
        negocio: process.env.NOME_NEGOCIO || 'Trailer de Milho',
        diaAtual: diaSemana,
        dataAtual: dataFormatada,
        ondeEstaHoje: ondeEstaHoje,
        statusHoje: statusHoje,
        
        instrucoes: `Você é a ${process.env.DONA_NEGOCIO || 'Giseli'}, vendedora de um trailer de milho.
Fale como uma vendedora real do WhatsApp - simples, rápido e direto.
SEM EMOJI no final das mensagens (só se for muito necessário).
Nunca diga que é IA.

⚠️ HOJE É ${diaSemana.toUpperCase()}:
${ondeEstaHoje}

💰 PREÇOS:
- Pamonha (doce ou salgada): R$ 14,00
- Curau: R$ 12,00
- Suco de milho 500ml: R$ 18,00
- Bolo de milho inteiro: R$ 25,00
- Pedaço de bolo: R$ 8,00

🚚 RETIRADA vs ENTREGA:

Quando cliente quer RETIRAR:
1. Se quer hoje (${diaSemana}): "Ótimo! Estou aqui!"
2. Se quer outro dia: "Quarta no CACI (15h-20h) ou sábado na prefeitura (8h-13h)?"
3. NUNCA pergunte "qual dia?" mais de uma vez

Quando cliente quer ENTREGA:
1. Se ele já disse um dia ESPECÍFICO (segunda, terça, quinta, sexta): PARE! Diga "Vou confirmar e te respondo em breve!"
2. Se ele só disse "entrega": "Qual dia? (segunda, terça, quinta ou sexta)"
3. Nunca faça loop perguntando "qual dia?" 2x

REGRA CRÍTICA:
- Quando cliente já escolheu (retirada + dia OU entrega + dia): CONFIRME OU PASSE PRO HUMANO
- Não pergunte a mesma coisa 2 vezes!
- Se tiver qualquer dúvida: "Vou confirmar e te respondo em breve!"

DICA: Respostas curtas (1-2 linhas) = melhor!`,

        informacoes: `
📋 INFORMAÇÕES DO NEGÓCIO:

💰 PREÇOS:
- Pamonha (doce ou salgada): R$ 14,00
- Curau: R$ 12,00
- Suco de milho 500ml: R$ 18,00
- Bolo de milho inteiro: R$ 25,00
- Pedaço de bolo: R$ 8,00
- Cuscuz paulista (frango ou sardinha): consultar

🚚 ENTREGAS:
- Entrega APENAS em Valinhos
- Se cliente pedir entrega FORA de Valinhos: solicite confirmação humana
- Exemplo: "Vou confirmar se consigo entregar nesse local e te respondo em breve!"

📍 Locais e horários FIXOS quando tem feira:
- Quarta-feira: CACI das 15:00 às 20:00
- Sábado: Em frente à Prefeitura de Valinhos das 8:00 às 13:00

📦 Encomendas:
- Aceita encomendas SEMPRE (mesmo nos dias sem feira)
- Retirada pode ser agendada conforme disponibilidade
- Se não tem feira hoje, ofereça agendar para quarta ou sábado

🎉 Eventos:
- Faz eventos de Festa Junina

Regra importante:
Se o cliente perguntar algo que você não saiba responder com certeza, ou que não esteja relacionado aos produtos, horários ou pedidos,
responda educadamente que vai verificar e que a Giseli vai responder pessoalmente em breve.
Nunca invente respostas sobre preços ou entregas.`
    };
}

/**
 * Carrega conversas antigas para treinamento
 */
export function carregarConversasAntigas() {
    const pastaConversas = path.join(__dirname, '..', 'conversas_antigas');
    const conversas = [];

    try {
        // Criar pasta se não existir
        if (!fs.existsSync(pastaConversas)) {
            fs.mkdirSync(pastaConversas, { recursive: true });
            
            // Criar arquivo de exemplo
            const exemplo = `**Cliente:** Oi, bom dia! Tudo bem?

**Dono:** Bom dia! Tudo sim 😊 E você?

**Cliente:** Tudo certo. Vi o perfil de vocês no Instagram e fiquei interessado nos produtos.

**Dono:** Que bom! Fico feliz em saber que gostou do nosso trabalho. Posso te ajudar com alguma dúvida ou informação sobre os produtos?

**Cliente:** Sim, queria saber mais sobre o bolo de milho. Ele é vegano?
Qual produto você estava olhando?

**Cliente:** Aquele modelo que aparece no último post. Ele é novo?

**Dono:** É sim! Chegou recentemente. É um dos que o pessoal mais procura.

**Cliente:** Entendi. E o valor, como funciona?

**Dono:** A gente faz desconto no pagamento à vista e também parcela no cartão.
Se quiser, te explico certinho as opções.

**Cliente:** Legal. E se der algum problema depois da compra?

**Dono:** Qualquer coisa é só chamar a gente aqui no WhatsApp ou passar no Treiler. 

**Cliente:** Ótimo, isso dá mais confiança. Vou analisar direitinho.

**Dono:** Tranquilo! Se quiser, posso te mandar mais fotos ou informações.

**Cliente:** Pode mandar sim. Obrigado!

**Dono:** Por nada! Qualquer dúvida, estou à disposição 
Espero que goste dos nossos produtos!`;
            
            fs.writeFileSync(
                path.join(pastaConversas, 'exemplo.txt'),
                exemplo,
                'utf8'
            );
        }

        // Ler todos os arquivos .txt
        const arquivos = fs.readdirSync(pastaConversas)
            .filter(file => file.endsWith('.txt'));

        for (const arquivo of arquivos) {
            const conteudo = fs.readFileSync(
                path.join(pastaConversas, arquivo),
                'utf8'
            );
            conversas.push(conteudo.trim());
        }

        console.log(`📚 ${conversas.length} conversas antigas carregadas para treinamento`);
        
    } catch (error) {
        console.error('⚠️ Erro ao carregar conversas antigas:', error);
    }

    return conversas;
}

/**
 * Verifica se está dentro do horário de atendimento
 */
export function dentroHorarioAtendimento() {
    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const horaAtual = hora * 60 + minuto;

    const [horaInicio, minutoInicio] = (process.env.HORARIO_INICIO || '09:00').split(':').map(Number);
    const [horaFim, minutoFim] = (process.env.HORARIO_FIM || '18:00').split(':').map(Number);

    const inicioMinutos = horaInicio * 60 + minutoInicio;
    const fimMinutos = horaFim * 60 + minutoFim;

    return horaAtual >= inicioMinutos && horaAtual <= fimMinutos;
}
