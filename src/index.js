import { inicializarDB } from './database.js';
import { iniciarBot } from './whatsapp.js';
import { agendarRelatorios } from './relatorios.js';
import dotenv from 'dotenv';

dotenv.config();

// Banner
console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🤖 BOT DE VENDAS WHATSAPP COM IA           ║
║                                               ║
║   Atendimento automático inteligente          ║
║   com relatórios e notificações               ║
║                                               ║
╚═══════════════════════════════════════════════╝
`);

async function iniciar() {
    try {
        // Verificar variáveis de ambiente (OpenAI ou Gemini)
        const usandoGemini = (process.env.AI_PROVIDER || 'openai') === 'gemini';
        const chaveGeminiOk = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sua_chave_aqui';
        const chaveOpenAIOk = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sua_chave_aqui';

        if ((usandoGemini && !chaveGeminiOk) || (!usandoGemini && !chaveOpenAIOk)) {
            console.error('❌ ERRO: Configure a chave da API no arquivo .env');
            console.log('\n📝 Passos:');
            console.log('   1. Copie .env.example para .env');
            console.log('   2. Adicione sua chave da API (OpenAI ou Gemini)');
            console.log('   3. Configure o número de notificação');
            console.log('   4. Execute npm start novamente\n');
            process.exit(1);
        }

        console.log('🔧 Inicializando sistema...\n');

        // Inicializar banco de dados
        await inicializarDB();

        // Agendar relatórios automáticos
        agendarRelatorios();

        // Iniciar bot do WhatsApp
        await iniciarBot();

    } catch (error) {
        console.error('❌ Erro fatal ao iniciar:', error);
        process.exit(1);
    }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ Erro não tratado:', error);
});

process.on('SIGINT', () => {
    console.log('\n\n👋 Encerrando bot...');
    process.exit(0);
});

// Iniciar aplicação
iniciar();
