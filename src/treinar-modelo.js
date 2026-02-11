import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    formatarConversasParaTreinamento,
    obterMelhoresConversas,
    exportarConversasParaTreinamento 
} from './database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para exportar conversas do banco de dados para arquivos de treinamento
 * Isso permite que o bot aprenda com conversas reais bem-sucedidas
 */

console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   📚 EXPORTAÇÃO DE CONVERSAS PARA TREINO     ║
║                                               ║
║   Exporta conversas do banco para treinar    ║
║   o modelo com seu estilo de atendimento     ║
║                                               ║
╚═══════════════════════════════════════════════╝
`);

async function exportarConversas() {
    try {
        const pastaDestino = path.join(__dirname, 'conversas_antigas');
        
        // Criar pasta se não existir
        if (!fs.existsSync(pastaDestino)) {
            fs.mkdirSync(pastaDestino, { recursive: true });
            console.log('📁 Pasta conversas_antigas criada');
        }

        // Exportar todas as conversas (últimas 100)
        console.log('\n📤 Exportando conversas gerais...');
        const textoGeral = await formatarConversasParaTreinamento({
            limite: 100,
            apenasVendas: false
        });

        const arquivoGeral = path.join(pastaDestino, `conversas_exportadas_${Date.now()}.txt`);
        fs.writeFileSync(arquivoGeral, textoGeral, 'utf8');
        console.log(`✅ Conversas gerais exportadas: ${arquivoGeral}`);

        // Exportar apenas conversas com vendas
        console.log('\n📤 Exportando conversas com vendas...');
        const textoVendas = await formatarConversasParaTreinamento({
            limite: 50,
            apenasVendas: true
        });

        if (textoVendas.trim().length > 0) {
            const arquivoVendas = path.join(pastaDestino, `vendas_exitosas_${Date.now()}.txt`);
            fs.writeFileSync(arquivoVendas, textoVendas, 'utf8');
            console.log(`✅ Conversas de vendas exportadas: ${arquivoVendas}`);
        } else {
            console.log('⚠️ Nenhuma venda registrada ainda');
        }

        // Exportar melhores conversas para análise
        console.log('\n📤 Exportando melhores conversas...');
        const melhoresConversas = await obterMelhoresConversas(30);
        
        if (melhoresConversas.length > 0) {
            let textoMelhores = '\n=== MELHORES CONVERSAS (Para Treinamento Prioritário) ===\n\n';
            
            const conversasAgrupadas = {};
            for (const conv of melhoresConversas) {
                const chave = conv.numero_cliente;
                if (!conversasAgrupadas[chave]) {
                    conversasAgrupadas[chave] = [];
                }
                conversasAgrupadas[chave].push(conv);
            }

            for (const [numeroCliente, conversas] of Object.entries(conversasAgrupadas)) {
                const nomeCliente = conversas[0]?.nome_cliente || 'Cliente';
                const temVenda = conversas.some(c => c.foi_venda);
                
                textoMelhores += `\n--- ${nomeCliente} ${temVenda ? '💰 VENDA' : ''} ---\n\n`;
                
                for (const conv of conversas) {
                    textoMelhores += `Cliente: ${conv.mensagem}\n`;
                    if (conv.resposta) {
                        textoMelhores += `Vendedor: ${conv.resposta}\n\n`;
                    }
                }
            }

            const arquivoMelhores = path.join(pastaDestino, `melhores_conversas_${Date.now()}.txt`);
            fs.writeFileSync(arquivoMelhores, textoMelhores, 'utf8');
            console.log(`✅ Melhores conversas exportadas: ${arquivoMelhores}`);
        }

        console.log('\n✨ Exportação concluída com sucesso!');
        console.log(`\n📚 Arquivos salvos em: ${pastaDestino}`);
        console.log('\n💡 Dica: Revise os arquivos exportados e use os melhores para treinar o modelo');
        console.log('   O bot automaticamente carrega arquivos .txt desta pasta ao iniciar');

    } catch (error) {
        console.error('❌ Erro ao exportar conversas:', error);
        process.exit(1);
    }
}

async function exibirEstatisticas() {
    try {
        const conversas = await exportarConversasParaTreinamento({ limite: 1000 });
        const totalClientes = Object.keys(conversas).length;
        let totalMensagens = 0;
        let totalVendas = 0;

        for (const [_, mensagens] of Object.entries(conversas)) {
            totalMensagens += mensagens.length;
            totalVendas += mensagens.filter(m => m.foi_venda).length;
        }

        console.log('\n📊 ESTATÍSTICAS DO BANCO DE DADOS:\n');
        console.log(`   👥 Total de clientes: ${totalClientes}`);
        console.log(`   💬 Total de mensagens: ${totalMensagens}`);
        console.log(`   💰 Total de vendas: ${totalVendas}`);
        console.log(`   📈 Taxa de conversão: ${totalClientes > 0 ? ((totalVendas / totalClientes) * 100).toFixed(1) : 0}%`);
        console.log('');

    } catch (error) {
        console.error('❌ Erro ao exibir estatísticas:', error);
    }
}

// Executar
async function main() {
    await exibirEstatisticas();
    await exportarConversas();
    process.exit(0);
}

main();
