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

        // Criar mensagem de notificação
        const notificacao = `${emoji} *NOVA MENSAGEM NO NEGÓCIO*

👤 Cliente: ${nomeCliente}
📱 Número: ${numeroCliente.replace('@c.us', '')}

💬 *Mensagem do cliente:*
"${mensagem}"

🤖 *Resposta do bot:*
"${resposta}"

${foiVenda ? '✅ *BOT IDENTIFICOU POSSÍVEL VENDA!*' : ''}

---
Para assumir esta conversa, responda diretamente ao cliente.
Para desativar o bot para este cliente, envie: !assumir ${numeroCliente}`;

        // Enviar notificação
        await client.sendMessage(numeroFormatado, notificacao);
        console.log('✅ Notificação enviada para número pessoal');

    } catch (error) {
        console.error('❌ Erro ao enviar notificação:', error.message);
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
