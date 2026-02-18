import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { processarMensagem } from './ia.js';
import { salvarConversa, buscarHistoricoCliente, buscarContextoExpandido, atualizarMetricasDiarias, obterRelatorio } from './database.js';
import { enviarNotificacao, enviarSolicitacaoHumana } from './notificacoes.js';
import dotenv from 'dotenv';

dotenv.config();

const headless = process.env.WWEBJS_HEADLESS !== 'false';

const allowFromMe = process.env.ALLOW_FROM_ME === 'true';

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: process.env.WWEBJS_CLIENT_ID || 'default'
    }),
    puppeteer: {
        headless,
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

const numeroAdminEnv = process.env.NUMERO_ADMIN || '';

function normalizarNumero(numero) {
    if (!numero) return '';
    return numero.replace(/\D/g, '');
}

function isAdminNumero(numeroWhatsApp) {
    const numeroAdmin = normalizarNumero(numeroAdminEnv);
    const numeroMsg = normalizarNumero(numeroWhatsApp);
    const isAdmin = numeroAdmin && numeroMsg && numeroMsg.endsWith(numeroAdmin);
    console.log(`🔍 Verificar admin: numeroMsg=${numeroMsg} vs numeroAdmin=${numeroAdmin} → ${isAdmin ? '✅ É ADMIN' : '❌ Não é admin'}`);
    return isAdmin;
}

function formatarNumeroWhatsApp(numero) {
    if (!numero) return '';
    if (numero.includes('@c.us') || numero.includes('@lid')) return numero;
    return `${numero}@c.us`;
}

function obterNumeroAdminFormatado() {
    const numeroAdmin = normalizarNumero(numeroAdminEnv);
    return numeroAdmin ? `${numeroAdmin}@c.us` : '';
}

const solicitacoesHumanas = new Map();
const ultimoPendentesAdmin = new Map();

async function responderComDadosAdmin(message) {
    const comando = message.body.toLowerCase().trim();

    if (comando === '!dados' || comando === '!relatorio') {
        const hoje = new Date().toISOString().split('T')[0];
        const relatorio = await obterRelatorio(hoje, hoje);

        const totalConversas = relatorio.conversas?.total_conversas || 0;
        const clientesUnicos = relatorio.conversas?.clientes_unicos || 0;
        const totalVendas = relatorio.conversas?.total_vendas || 0;
        const valorTotal = relatorio.conversas?.valor_total || 0;

        const resposta =
            `📊 Dados de hoje (${hoje})\n` +
            `- Conversas: ${totalConversas}\n` +
            `- Clientes únicos: ${clientesUnicos}\n` +
            `- Vendas: ${totalVendas}\n` +
            `- Valor total: R$ ${Number(valorTotal).toFixed(2)}`;

        await client.sendMessage(message.from, resposta);
        return true;
    }

    if (comando === '!ajuda') {
        const resposta =
            `🛠️ Comandos admin:\n` +
            `- !dados → resumo de hoje\n` +
            `- /resp <numero> <texto> → responder cliente\n` +
            `- /ign <numero> → ignorar cliente\n` +
            `- !ajuda → esta mensagem`;
        await client.sendMessage(message.from, resposta);
        return true;
    }

    // Novo comando: /resp <numero> <texto>
    if (comando.startsWith('/resp ')) {
        const textoOriginal = message.body.trim();
        const after = textoOriginal.substring('/resp '.length).trim();

        if (!after) {
            await client.sendMessage(message.from, '⚠️ Use: /resp <numero> <texto>');
            return true;
        }

        const partes = after.split(' ');
        const numeroCliente = partes[0];
        const mensagemHumana = partes.slice(1).join(' ').trim();

        if (!numeroCliente || !mensagemHumana) {
            await client.sendMessage(message.from, '⚠️ Use: /resp <numero> <texto>');
            return true;
        }

        const numeroFormatado = formatarNumeroWhatsApp(numeroCliente);
        
        try {
            await client.sendMessage(numeroFormatado, mensagemHumana);

            const pendente = solicitacoesHumanas.get(normalizarNumero(numeroCliente)) || {};
            await salvarConversa({
                numero: pendente.numeroWhatsApp || numeroFormatado,
                nome: pendente.nomeCliente || 'Cliente',
                mensagem: pendente.mensagem || 'Mensagem não registrada',
                resposta: mensagemHumana,
                tipo: 'humano',
                foiVenda: false,
                valorVenda: 0,
                assumidoHumano: 1
            });

            conversasAtivas.set(pendente.numeroWhatsApp || numeroFormatado, { assumidoPorHumano: true });
            solicitacoesHumanas.delete(normalizarNumero(numeroCliente));

            await client.sendMessage(message.from, '✅ Resposta enviada!');
            return true;
        } catch (err) {
            await client.sendMessage(message.from, `❌ Erro: ${err.message}`);
            return true;
        }
    }

    // Novo comando: /ign <numero>
    if (comando.startsWith('/ign ')) {
        const textoOriginal = message.body.trim();
        const numeroCliente = textoOriginal.substring('/ign '.length).trim();

        if (!numeroCliente) {
            await client.sendMessage(message.from, '⚠️ Use: /ign <numero>');
            return true;
        }

        solicitacoesHumanas.delete(normalizarNumero(numeroCliente));
        await client.sendMessage(message.from, '🗑️ Pendente removido');
        return true;
    }

    // Antigos comandos ainda funcionam (!responder, !ignorar)
    if (comando.startsWith('!responder')) {
        const textoOriginal = message.body.trim();
        const after = textoOriginal.substring('!responder'.length).trim();

        if (!after) {
            await client.sendMessage(message.from, '⚠️ Use: !responder <numero> <texto> ou !responder <texto>');
            return true;
        }

        const partes = after.split(' ');
        let numeroCliente = '';
        let mensagemHumana = '';

        if (partes.length >= 2 && /\d{8,}/.test(partes[0])) {
            numeroCliente = partes[0];
            mensagemHumana = partes.slice(1).join(' ').trim();
        } else {
            numeroCliente = ultimoPendentesAdmin.get(message.from) || '';
            mensagemHumana = after;
        }

        if (!numeroCliente) {
            await client.sendMessage(message.from, '⚠️ Nenhum cliente pendente encontrado. Use: !responder <numero> <texto>');
            return true;
        }

        if (!mensagemHumana) {
            await client.sendMessage(message.from, '⚠️ Escreva o texto da resposta.');
            return true;
        }

        const numeroNormalizado = normalizarNumero(numeroCliente);
        const numeroFormatado = formatarNumeroWhatsApp(numeroNormalizado || numeroCliente);
        await client.sendMessage(numeroFormatado, mensagemHumana);

        const pendente = solicitacoesHumanas.get(numeroNormalizado) || {};
        await salvarConversa({
            numero: pendente.numeroWhatsApp || numeroFormatado,
            nome: pendente.nomeCliente || 'Cliente',
            mensagem: pendente.mensagem || 'Mensagem não registrada',
            resposta: mensagemHumana,
            tipo: 'humano',
            foiVenda: false,
            valorVenda: 0,
            assumidoHumano: 1
        });

        conversasAtivas.set(pendente.numeroWhatsApp || numeroFormatado, { assumidoPorHumano: true });
        solicitacoesHumanas.delete(numeroNormalizado);

        await client.sendMessage(message.from, '✅ Resposta enviada ao cliente.');
        return true;
    }

    if (comando.startsWith('!ignorar')) {
        const textoOriginal = message.body.trim();
        const after = textoOriginal.substring('!ignorar'.length).trim();
        let numeroCliente = '';

        if (after && /\d{8,}/.test(after.split(' ')[0])) {
            numeroCliente = after.split(' ')[0];
        } else {
            numeroCliente = ultimoPendentesAdmin.get(message.from) || '';
        }

        if (!numeroCliente) {
            await client.sendMessage(message.from, '⚠️ Nenhum cliente pendente para ignorar.');
            return true;
        }

        solicitacoesHumanas.delete(normalizarNumero(numeroCliente));
        await client.sendMessage(message.from, '🗑️ Pendente removido.');
        return true;
    }

    return false;
}

// Sobrescrever métodos problemáticos do WhatsApp Web
client.on('authenticated', () => {
    console.log('🔐 Autenticado com sucesso!');
});

// Armazenar conversas ativas
const conversasAtivas = new Map();

// Gerar QR Code
client.on('qr', (qr) => {
    console.log('\n🔄 Escaneie o QR Code com WhatsApp Business:\n');
    qrcode.generate(qr, { small: true });
});

// Cliente pronto
client.on('ready', () => {
    console.log('✅ Bot conectado ao WhatsApp!');
    console.log('📱 Aguardando mensagens...');
    console.log('🔍 Listener de mensagens:', client.listenerCount('message'), 'registrado(s)\n');
});

// Debug: Loading screen
client.on('loading_screen', (percent, message) => {
    console.log('⏳ Carregando:', percent, message);
});

// Debug: Disconnected
client.on('disconnected', (reason) => {
    console.log('❌ Desconectado:', reason);
});

// Processar mensagens
// Testar se eventos estão funcionando
client.on('message_create', (msg) => {
    console.log('🔔 Evento message_create disparado:', msg.from, msg.body?.substring(0, 30));
});

client.on('message', async (message) => {
    console.log('🔔 Evento message disparado!');
    try {
        const isGrupo = message.from.includes('@g.us');
        console.log(`📩 Detalhes: from=${message.from} fromMe=${message.fromMe} grupo=${isGrupo} body=${message.body?.substring(0, 50)}`);

        // Ignorar mensagens de grupos e do próprio bot (a menos que allowFromMe=true)
        if (isGrupo || (!allowFromMe && message.fromMe)) {
            console.log('❌ Mensagem ignorada (grupo ou fromMe)');
            return;
        }

        // ✅ VERIFICAR SE É RESPOSTA DO ADMIN COM REPLY (citando mensagem)
        if (isAdminNumero(message.from) && message.hasQuotedMsg) {
            console.log('📌 Admin com reply detectado! Processando...');
            try {
                const quotedMsg = await message.getQuotedMessage();
                const respostaTexto = (message.body || '').trim();
                
                console.log('📋 Mensagem citada de:', quotedMsg.from, 'fromMe:', quotedMsg.fromMe);
                console.log('📝 Texto da resposta:', respostaTexto);
                
                if (!respostaTexto) {
                    console.log('⚠️ Resposta vazia, ignorando');
                    return;
                }
                
                let clientePendente = null;
                
                // Caso 1: Admin citou mensagem direta do cliente
                if (!quotedMsg.fromMe && !isAdminNumero(quotedMsg.from)) {
                    clientePendente = quotedMsg.from;
                    console.log('✅ Cliente identificado pela mensagem citada:', clientePendente);
                }
                // Caso 2: Admin citou notificação/resposta do bot - buscar número na notificação
                else if (quotedMsg.fromMe) {
                    console.log('🔍 Buscando número no texto da notificação...');
                    console.log('📄 Texto completo:', quotedMsg.body);
                    
                    // Buscar padrão: (5519971006980) ou similar no texto
                    const numeroMatch = quotedMsg.body?.match(/\((\d{10,13})\)/);
                    if (numeroMatch) {
                        const numeroEncontrado = numeroMatch[1];
                        clientePendente = formatarNumeroWhatsApp(numeroEncontrado);
                        console.log('✅ Cliente identificado pelo número entre parênteses:', clientePendente);
                    } else {
                        // Tentar encontrar qualquer sequência de 10-13 dígitos
                        const numeroAlt = quotedMsg.body?.match(/(\d{10,13})/);
                        if (numeroAlt) {
                            const numeroEncontrado = numeroAlt[1];
                            clientePendente = formatarNumeroWhatsApp(numeroEncontrado);
                            console.log('✅ Cliente identificado por dígitos no texto:', clientePendente);
                        } else {
                            // Pegar último pendente registrado
                            const ultimoPendente = Array.from(solicitacoesHumanas.values()).pop();
                            if (ultimoPendente) {
                                clientePendente = ultimoPendente.numeroWhatsApp;
                                console.log('✅ Cliente identificado pelo último pendente:', clientePendente);
                            }
                        }
                    }
                }
                
                if (!clientePendente) {
                    console.log('⚠️ Não foi possível identificar o cliente');
                    await client.sendMessage(message.from, '⚠️ Não consegui identificar o cliente. Use: /resp <numero> <mensagem>');
                    return;
                }
                
                const nomeCliente = (await client.getContactById(clientePendente)).pushname || 'Cliente';
                console.log('👤 Enviando resposta humana para:', nomeCliente);
                
                // Enviar resposta do admin ao cliente
                console.log('📤 Enviando resposta para cliente:', clientePendente);
                await client.sendMessage(clientePendente, respostaTexto);
                console.log('✅ Mensagem enviada para o cliente:', clientePendente);
                
                // Registrar como resposta humana no banco
                await salvarConversa({
                    numero: clientePendente,
                    nome: nomeCliente,
                    mensagem: quotedMsg.body || 'Mensagem anterior',
                    resposta: respostaTexto,
                    tipo: 'humano',
                    foiVenda: false,
                    valorVenda: 0,
                    assumidoHumano: 1
                });
                
                // Remover de pendentes (se existir)
                solicitacoesHumanas.delete(normalizarNumero(clientePendente));
                conversasAtivas.delete(clientePendente);
                
                // Confirmar ao admin
                await client.sendMessage(message.from, `✅ Resposta enviada para ${nomeCliente}`);
                
                console.log('✅ Resposta humana enviada ao cliente. Bot volta a atender.');
                return;
            } catch (err) {
                console.log('⚠️ Erro ao processar resposta humana:', err.message);
                console.log('Stack:', err.stack);
                await client.sendMessage(message.from, `❌ Erro: ${err.message}`);
            }
        }

        // Comandos do admin
        if (isAdminNumero(message.from)) {
            const atendeu = await responderComDadosAdmin(message);
            if (atendeu) return;
            
            // Se não foi comando e é do admin, ignorar
            console.log('❌ Mensagem do admin ignorada (não é comando)');
            return;
        }

        const numeroCliente = message.from;
        const nomeCliente = (await message.getContact()).pushname || 'Cliente';
        const mensagemTexto = message.body;

        console.log(`\n📨 Nova mensagem de ${nomeCliente} (${numeroCliente})`);
        console.log(`💬 Mensagem: ${mensagemTexto}`);

        // Buscar histórico e contexto expandido do cliente
        const historico = await buscarHistoricoCliente(numeroCliente);
        const contextoExpandido = await buscarContextoExpandido(numeroCliente, 5, true);

        // Processar com IA (passa contexto adicional)
        const resposta = await processarMensagem(mensagemTexto, historico, nomeCliente, contextoExpandido);

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
            console.log('⚠️ IA não soube responder - solicitando humano');
            const chaveCliente = normalizarNumero(numeroCliente);
            solicitacoesHumanas.set(chaveCliente, {
                numeroWhatsApp: numeroCliente,
                nomeCliente,
                mensagem: mensagemTexto,
                timestamp: new Date().toISOString()
            });

            const numeroAdminFormatado = obterNumeroAdminFormatado();
            if (numeroAdminFormatado) {
                ultimoPendentesAdmin.set(numeroAdminFormatado, chaveCliente);
            }

            try {
                await enviarSolicitacaoHumana(client, {
                    nomeCliente,
                    numeroCliente,
                    mensagem: mensagemTexto
                });
            } catch (err) {
                console.error('⚠️ Falha ao enviar solicitação humana:', err.message);
            }
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
        console.log('🔄 Iniciando cliente WhatsApp...');
        await client.initialize();
        console.log('✅ Cliente inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao iniciar bot:', error);
        process.exit(1);
    }
}

export { iniciarBot, client };
