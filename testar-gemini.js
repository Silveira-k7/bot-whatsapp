import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log('🔍 Testando modelos Gemini disponíveis...\n');

const modelos = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'models/gemini-pro',
    'models/gemini-1.5-flash'
];

for (const nomeModelo of modelos) {
    try {
        const model = genAI.getGenerativeModel({ model: nomeModelo });
        const result = await model.generateContent('Oi');
        const response = await result.response;
        const texto = response.text();
        
        console.log(`✅ ${nomeModelo} - FUNCIONA!`);
        console.log(`   Resposta: ${texto.substring(0, 50)}...\n`);
        break; // Parar no primeiro que funcionar
        
    } catch (error) {
        console.log(`❌ ${nomeModelo} - ${error.message.substring(0, 80)}...\n`);
    }
}
