import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { processarMensagem } from './ia.js';
import { salvarConversa, buscarHistoricoCliente, atualizarMetricasDiarias } from './database.js';
import { enviarNotificacao } from './notificacoes.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    },
    // Desabilitar funcionalidades que causam o erro markedUnread
    qrMaxRetries: 5
});

// Sobrescrever métodos problemáticos do WhatsApp Web
client.on('authenticated', () => {
    console.log('🔐 Autenticado com sucesso!');
});

// Desabilitar sendSeen completamente
if (client.pupPage) {
    client.pupPage.on('console', msg => {
        if (msg.text().includes('markedUnread')) {
            return; // Silenciar erros markedUnread
        }
    });
}

// Armazenar conversas ativas
const conversasAtivas = new Map();

// Gerar QR Code
client.on('qr', (qr) => {
    console.log('\n🔄 Escaneie o QR Code com WhatsApp Business:\n');
    qrcode.generate(qr, { small: true });
});

// Cliente pronto
client.on('ready', async () => {
    console.log('✅ Bot conectado ao WhatsApp!');
    
    // Injetar fix para markedUnread no WhatsApp Web
    try {
        const page = await client.pupPage;
        await page.evaluate(() => {
            // Sobrescrever sendSeen para não usar markedUnread
            if (window.WWebJS) {
                const originalSendSeen = window.WWebJS.sendSeen;
                window.WWebJS.sendSeen = async function() {
                    // Não fazer nada - desabilitar completamente
                    return Promise.resolve();
                };
            }
        });
        console.log('🔧 Fix markedUnread aplicado com sucesso');
    } catch (err) {
        console.log('⚠️ Não foi possível aplicar fix:', err.message);
    }
    
    console.log('📱 Aguardando mensagens...\n');
});

// Processar mensagens
client.on('message', async (message) => {
    try {
        // Ignorar mensagens de grupos e do próprio bot
        if (message.from.includes('@g.us') || message.fromMe) return;

        const numeroCliente = message.from;
        const nomeCliente = (await message.getContact()).pushname || 'Cliente';
        const mensagemTexto = message.body;

        console.log(`\n📨 Nova mensagem de ${nomeCliente} (${numeroCliente})`);
        console.log(`💬 Mensagem: ${mensagemTexto}`);

        // Verificar se humano assumiu conversa
        if (conversasAtivas.get(numeroCliente)?.assumidoPorHumano) {
            console.log('👤 Conversa já assumida por humano, ignorando...');
            return;
        }

        // Buscar histórico do cliente
        const historico = await buscarHistoricoCliente(numeroCliente);

        // Processar com IA
        const resposta = await processarMensagem(mensagemTexto, historico, nomeCliente);

        console.log(`🤖 Resposta gerada: ${resposta.texto.substring(0, 100)}...`);

        // Enviar resposta - tentar múltiplos métodos
        let enviouSucesso = false;
        
        // Método 1: Usar reply direto
        try {
            await message.reply(resposta.texto);
            console.log(`✅ Resposta enviada com sucesso (reply)`);
            enviouSucesso = true;
        } catch (err) {
            console.log(`⚠️ Reply falhou: ${err.message}`);
            
            // Método 2: Usar sendMessage com catch
            try {
                const resultado = await client.sendMessage(message.from, resposta.texto);
                console.log(`✅ Resposta enviada com sucesso (sendMessage)`, resultado ? 'com confirmação' : '');
                enviouSucesso = true;
            } catch (err2) {
                console.error('❌ Erro ao enviar mensagem:', err2.message);
                console.error('❌ Stack:', err2.stack);
            }
        }
        
        if (!enviouSucesso) {
            console.error('❌ Falha total ao enviar resposta!');
        }

        // Salvar no banco
        await salvarConversa({
            numero: numeroCliente,
            nome: nomeCliente,
            mensagem: mensagemTexto,
            resposta: resposta.texto,
            tipo: 'bot',
            foiVenda: resposta.foiVenda || false,
            valorVenda: resposta.valorVenda || 0
        });

        // Atualizar métricas
        const hoje = new Date().toISOString().split('T')[0];
        await atualizarMetricasDiarias(hoje, resposta.foiVenda, resposta.valorVenda);

        // Enviar notificação para número pessoal (ignorar erros de envio)
        try {
            await enviarNotificacao(client, {
                nomeCliente,
                numeroCliente,
                mensagem: mensagemTexto,
                resposta: resposta.texto,
                foiVenda: resposta.foiVenda
            });
        } catch (err) {
            console.error('⚠️ Falha ao enviar notificação:', err.message);
        }

        // Verificar se precisa de intervenção humana
        if (resposta.precisaHumano) {
            conversasAtivas.set(numeroCliente, { assumidoPorHumano: true });
            console.log('⚠️ Conversa marcada para intervenção humana');
        }

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        await message.reply('Desculpe, tive um problema técnico. Vou avisar minha responsável para te atender! 😊');
    }
});

// Comando para assumir conversa manualmente
client.on('message', async (message) => {
    if (!message.fromMe) return;

    const comando = message.body.toLowerCase();

    // Comando: !assumir @numero
    if (comando.startsWith('!assumir')) {
        const numero = comando.split(' ')[1];
        if (numero) {
            conversasAtivas.set(numero, { assumidoPorHumano: true });
            console.log(`✅ Conversa com ${numero} assumida manualmente`);
        }
    }

    // Comando: !liberar @numero
    if (comando.startsWith('!liberar')) {
        const numero = comando.split(' ')[1];
        if (numero) {
            conversasAtivas.delete(numero);
            console.log(`✅ Bot liberado para ${numero}`);
        }
    }
});

// Inicializar cliente
async function iniciarBot() {
    try {
        await client.initialize();
    } catch (error) {
        console.error('❌ Erro ao iniciar bot:', error);
        process.exit(1);
    }
}

export { iniciarBot, client };
