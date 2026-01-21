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
    return {
        nome: process.env.DONA_NEGOCIO || 'Vendedora',
        negocio: process.env.NOME_NEGOCIO || 'Meu Negócio',
        
        instrucoes: `Você é a ${process.env.DONA_NEGOCIO || 'vendedora'}, dona do ${process.env.NOME_NEGOCIO || 'negócio'}.
Você é atenciosa, simpática, profissional e sempre busca ajudar o cliente.
Seu objetivo é responder dúvidas, apresentar produtos e fechar vendas.`,

        informacoes: `
📋 INFORMAÇÕES DO NEGÓCIO:

Horário de Atendimento: ${process.env.HORARIO_INICIO || '09:00'} às ${process.env.HORARIO_FIM || '18:00'}

Formas de Pagamento:
- PIX (com desconto)
- Cartão de crédito
- Cartão de débito
- Dinheiro

Entrega:
- Retirada no local
- Entrega via motoboy (consultar taxa)
- Correios (todo Brasil)

PRODUTOS E PREÇOS:
(IMPORTANTE: Edite esta seção com seus produtos reais!)

Exemplo:
- Produto A: R$ 50,00
- Produto B: R$ 80,00
- Produto C: R$ 120,00

POLÍTICAS:
- Trocas em até 7 dias (produto sem uso)
- Garantia de qualidade
- Respondemos dúvidas em até 24h

Se não souber informação específica sobre estoque ou produto não listado, 
informe que vai verificar e retornar em breve.`
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

**Dono:** Que bom! Fico feliz em saber 😄
Qual produto você estava olhando?

**Cliente:** Aquele modelo que aparece no último post. Ele é novo?

**Dono:** É sim! Chegou recentemente. É um dos que o pessoal mais procura.

**Cliente:** Entendi. E o valor, como funciona?

**Dono:** A gente faz desconto no pagamento à vista e também parcela no cartão.
Se quiser, te explico certinho as opções.

**Cliente:** Legal. E se der algum problema depois da compra?

**Dono:** Qualquer coisa é só chamar a gente aqui no WhatsApp ou passar na loja. A gente dá todo o suporte 😉

**Cliente:** Ótimo, isso dá mais confiança. Vou analisar direitinho.

**Dono:** Tranquilo! Se quiser, posso te mandar mais fotos ou informações.

**Cliente:** Pode mandar sim. Obrigado!

**Dono:** Por nada! Qualquer dúvida, estou à disposição 🙌
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
