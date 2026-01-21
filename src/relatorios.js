import { obterRelatorio } from './database.js';
import { client } from './whatsapp.js';
import { enviarRelatorioDiario } from './notificacoes.js';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Gera relatório para um período específico
 */
export async function gerarRelatorio(dataInicio, dataFim) {
    try {
        const relatorio = await obterRelatorio(dataInicio, dataFim);
        
        console.log('\n' + '='.repeat(60));
        console.log(`📊 RELATÓRIO DE VENDAS - ${dataInicio} a ${dataFim}`);
        console.log('='.repeat(60));
        
        console.log('\n📈 ESTATÍSTICAS GERAIS:');
        console.log(`   Total de conversas: ${relatorio.conversas.total_conversas || 0}`);
        console.log(`   Clientes únicos: ${relatorio.conversas.clientes_unicos || 0}`);
        console.log(`   Vendas realizadas: ${relatorio.conversas.total_vendas || 0}`);
        console.log(`   Faturamento total: R$ ${(relatorio.conversas.valor_total || 0).toFixed(2)}`);
        
        if (relatorio.conversas.total_conversas > 0) {
            const taxaConversao = (relatorio.conversas.total_vendas / relatorio.conversas.clientes_unicos * 100).toFixed(1);
            const ticketMedio = relatorio.conversas.total_vendas > 0 
                ? (relatorio.conversas.valor_total / relatorio.conversas.total_vendas).toFixed(2)
                : 0;
            
            console.log(`   Taxa de conversão: ${taxaConversao}%`);
            console.log(`   Ticket médio: R$ ${ticketMedio}`);
        }
        
        console.log('\n❓ PERGUNTAS MAIS FREQUENTES:');
        if (relatorio.perguntasFrequentes.length > 0) {
            relatorio.perguntasFrequentes.slice(0, 10).forEach((p, i) => {
                console.log(`   ${i + 1}. [${p.categoria}] ${p.pergunta.substring(0, 60)}... (${p.contador}x)`);
            });
        } else {
            console.log('   Nenhuma pergunta registrada ainda');
        }
        
        console.log('\n⏰ HORÁRIOS DE MAIOR MOVIMENTO:');
        if (relatorio.horariosPico.length > 0) {
            relatorio.horariosPico.forEach(h => {
                console.log(`   ${h.hora}:00h - ${h.total} mensagens`);
            });
        } else {
            console.log('   Sem dados de horário ainda');
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        return relatorio;
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório:', error);
    }
}

/**
 * Gera relatório do dia
 */
export async function gerarRelatorioDiario() {
    const hoje = new Date().toISOString().split('T')[0];
    return await gerarRelatorio(hoje, hoje);
}

/**
 * Gera relatório semanal
 */
export async function gerarRelatorioSemanal() {
    const hoje = new Date();
    const semanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return await gerarRelatorio(
        semanaAtras.toISOString().split('T')[0],
        hoje.toISOString().split('T')[0]
    );
}

/**
 * Gera relatório mensal
 */
export async function gerarRelatorioMensal() {
    const hoje = new Date();
    const mesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    
    return await gerarRelatorio(
        mesAtras.toISOString().split('T')[0],
        hoje.toISOString().split('T')[0]
    );
}

/**
 * Agenda envio automático de relatórios
 */
export function agendarRelatorios() {
    if (process.env.ENVIAR_RELATORIO_DIARIO !== 'true') {
        console.log('📊 Relatórios automáticos desativados');
        return;
    }

    const horario = process.env.HORARIO_RELATORIO || '20:00';
    const [hora, minuto] = horario.split(':');

    // Agendar relatório diário
    cron.schedule(`${minuto} ${hora} * * *`, async () => {
        console.log('📊 Gerando relatório diário automático...');
        const relatorio = await gerarRelatorioDiario();
        
        // Enviar por WhatsApp se o client estiver pronto
        if (client && relatorio) {
            await enviarRelatorioDiario(client, relatorio);
        }
    });

    console.log(`📊 Relatórios diários agendados para ${horario}`);
}

// Exportar funções
export default {
    gerarRelatorio,
    gerarRelatorioDiario,
    gerarRelatorioSemanal,
    gerarRelatorioMensal,
    agendarRelatorios
};
