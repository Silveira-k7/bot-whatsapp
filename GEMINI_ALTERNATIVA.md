# 🎯 ALTERNATIVA COM GOOGLE GEMINI (GRATUITO)

Se você quer usar o Gemini (Google) ao invés do OpenAI, siga estes passos:

## 📝 Arquivo Alternativo para IA (Gemini)

Crie o arquivo: `src/ia-gemini.js`

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { carregarPersonalidade, carregarConversasAntigas } from './config/personalidade.js';
import { registrarPergunta } from './database.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const personalidade = carregarPersonalidade();
const conversasAntigas = carregarConversasAntigas();

export async function processarMensagem(mensagem, historico = [], nomeCliente = 'Cliente') {
    try {
        const contextoHistorico = historico.length > 0 
            ? `\n\nHistórico com este cliente:\n${historico.map(h => 
                `Cliente: ${h.mensagem}\nVocê: ${h.resposta}`
            ).join('\n')}`
            : '';

        const contextoTreinamento = conversasAntigas.length > 0
            ? `\n\nExemplos de conversas:\n${conversasAntigas.join('\n\n')}`
            : '';

        const prompt = `${personalidade.instrucoes}

${personalidade.informacoes}

${contextoTreinamento}

${contextoHistorico}

${nomeCliente} disse: ${mensagem}

Responda de forma natural e humana:`;

        const result = await model.generateContent(prompt);
        const resposta = result.response.text();

        // Análise simplificada
        const foiVenda = mensagem.toLowerCase().includes('vou querer') || 
                        mensagem.toLowerCase().includes('quero comprar');
        
        const categoria = mensagem.toLowerCase().includes('preço') || mensagem.toLowerCase().includes('quanto') 
            ? 'preco' 
            : 'geral';

        await registrarPergunta(mensagem, categoria);

        return {
            texto: resposta,
            foiVenda,
            valorVenda: 0,
            precisaHumano: false,
            categoria
        };

    } catch (error) {
        console.error('❌ Erro com Gemini:', error);
        return {
            texto: 'Oi! Tive um probleminha técnico. Já avisei a responsável! 😊',
            foiVenda: false,
            precisaHumano: true
        };
    }
}
```

## 📦 Instalar Dependência do Gemini

```bash
npm install @google/generative-ai
```

## ⚙️ Configurar .env

```env
# Use Gemini ao invés de OpenAI
GEMINI_API_KEY=sua_chave_do_gemini_aqui
AI_PROVIDER=gemini

# Comente ou remova a linha do OpenAI
# OPENAI_API_KEY=...
```

## 🔧 Modificar src/ia.js

No início do arquivo `src/ia.js`, adicione:

```javascript
// Trocar entre OpenAI e Gemini
import dotenv from 'dotenv';
dotenv.config();

if (process.env.AI_PROVIDER === 'gemini') {
    // Importar versão Gemini
    export * from './ia-gemini.js';
} else {
    // Continua usando OpenAI (código atual)
    // ...resto do código
}
```

## 🆓 Como Obter Chave do Gemini

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com Google
3. Clique "Create API Key"
4. Copie e cole no .env

**Limites Gratuitos:**
- 60 requisições por minuto
- Mais que suficiente para começar!
