import dotenv from 'dotenv';
dotenv.config();

// Detectar qual IA usar baseado no .env
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

// Carregar o módulo correto dinamicamente
let iaModule;

if (AI_PROVIDER === 'gemini') {
    console.log('🤖 Usando Google Gemini (gratuito)');
    iaModule = await import('./ia-gemini.js');
} else {
    console.log('🤖 Usando OpenAI GPT');
    iaModule = await import('./ia-openai.js');
}

// Re-exportar funções do módulo escolhido
export const processarMensagem = iaModule.processarMensagem;
export const analisarConversa = iaModule.analisarConversa;
