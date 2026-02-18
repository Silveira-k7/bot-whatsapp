import dotenv from 'dotenv';

dotenv.config();

/**
 * Envia notificação para o número pessoal
 */
export async function enviarNotificacao(client, dados) {
    const { nomeCliente, numeroCliente, mensagem, resposta, foiVenda } = dados;
    
    try {
        const numeroNotificacao = process.env.NUMERO_NOTIFICACAO;
        
        if (!numeroNotificacao || numeroNotificacao === '5511999999999') {
            console.log('⚠️ Configure NUMERO_NOTIFICACAO no arquivo .env');
            return;
        }

        // Formatar número (adicionar @c.us se necessário)
        const numeroFormatado = numeroNotificacao.includes('@c.us') 
            ? numeroNotificacao 
            : `${numeroNotificacao}@c.us`;

        // Emoji baseado no tipo de mensagem
        const emoji = foiVenda ? '🎉💰' : '💬';

        // Criar mensagem de notificação COMPACTA com número do cliente
        const numeroLimpo = numeroCliente.replace('@c.us', '');
        const notificacao = `${emoji} *NOVA MENSAGEM*
👤 ${nomeCliente} (${numeroLimpo})
💬 "${mensagem}"
🤖 "${resposta.substring(0, 80)}${resposta.length > 80 ? '...' : ''}"
${foiVenda ? '✅ POSSÍVEL VENDA!' : ''}`;

        // Tentar enviar notificação com mais logs
        console.log(`📤 Tentando enviar notificação para ${numeroFormatado}...`);
        
        try {
            const resultado = await client.sendMessage(numeroFormatado, notificacao);
            console.log('✅ Notificação enviada para número pessoal', resultado ? 'com confirmação' : '');
        } catch (err) {
            console.error('❌ Erro ao enviar notificação:', err.message);
            console.error('❌ Stack:', err.stack);
        }

    } catch (error) {
        // Não logar erro para não poluir console
    }
}

/**
 * Envia solicitação de atendimento humano
 */
export async function enviarSolicitacaoHumana(client, dados) {
    const { nomeCliente, numeroCliente, mensagem } = dados;

    try {
        const numeroAdmin = process.env.NUMERO_ADMIN || process.env.NUMERO_NOTIFICACAO;

        if (!numeroAdmin || numeroAdmin === '5511999999999') {
            console.log('⚠️ Configure NUMERO_ADMIN no arquivo .env');
            return;
        }

        const numeroFormatado = numeroAdmin.includes('@c.us')
            ? numeroAdmin
            : `${numeroAdmin}@c.us`;

        // Avisos BEM SIMPLES
        const numLimpo = numeroCliente.replace('@c.us', '').replace('@lid', '');
        
        const notificacao = `🆘 ${nomeCliente} | ${numLimpo}
"${mensagem}"

👉 Responda a esta mensagem para o cliente`;

        await client.sendMessage(numeroFormatado, notificacao);
        console.log('✅ Solicitação humana enviada para admin');
    } catch (error) {
        console.error('❌ Erro ao enviar solicitação humana:', error.message);
    }
}

/**
 * Envia relatório diário
 */
export async function enviarRelatorioDiario(client, relatorio) {
    try {
        const numeroNotificacao = process.env.NUMERO_NOTIFICACAO;
        
        if (!numeroNotificacao || numeroNotificacao === '5511999999999') {
            return;
        }

        const numeroFormatado = numeroNotificacao.includes('@c.us') 
            ? numeroNotificacao 
            : `${numeroNotificacao}@c.us`;

        const mensagem = `📊 *RELATÓRIO DIÁRIO - ${new Date().toLocaleDateString('pt-BR')}*

📈 *ESTATÍSTICAS GERAIS*
• Total de conversas: ${relatorio.conversas.total_conversas || 0}
• Clientes únicos: ${relatorio.conversas.clientes_unicos || 0}
• Vendas realizadas: ${relatorio.conversas.total_vendas || 0}
• Faturamento: R$ ${(relatorio.conversas.valor_total || 0).toFixed(2)}

❓ *PERGUNTAS MAIS FREQUENTES*
${relatorio.perguntasFrequentes.slice(0, 5).map((p, i) => 
    `${i + 1}. ${p.pergunta} (${p.contador}x)`
).join('\n') || 'Nenhuma pergunta registrada'}

⏰ *HORÁRIOS DE PICO*
${relatorio.horariosPico.map(h => 
    `• ${h.hora}:00h - ${h.total} mensagens`
).join('\n') || 'Sem dados'}

---
Bot operando normalmente ✅`;

        await client.sendMessage(numeroFormatado, mensagem);
        console.log('✅ Relatório diário enviado');

    } catch (error) {
        console.error('❌ Erro ao enviar relatório:', error.message);
    }
}
