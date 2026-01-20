# 🤖 Bot de WhatsApp com IA para Vendas

Bot inteligente que responde clientes via WhatsApp, aprende com conversas anteriores e gera relatórios automáticos.

## 📋 O que o bot faz?

✅ Responde clientes de forma humana e natural  
✅ Aprende com conversas anteriores da sua mãe  
✅ Notifica número pessoal quando recebe mensagem  
✅ Gera relatórios de vendas e atendimentos  
✅ Funciona 24/7 automaticamente  

## 🤖 Opções de IA

### 1. **OpenAI (GPT-4 / GPT-3.5)** - RECOMENDADO
- ✅ Melhor qualidade de resposta
- ✅ Mais natural e humano
- ❌ Pago (~$0.002 por mensagem)
- 📝 Criar conta: https://platform.openai.com/

### 2. **Google Gemini**
- ✅ GRATUITO (com limites)
- ✅ Boa qualidade
- ❌ Pode ter fila em horários de pico
- 📝 Criar conta: https://makersuite.google.com/

### 3. **Anthropic Claude**
- ✅ Excelente qualidade
- ❌ Pago
- 📝 Criar conta: https://console.anthropic.com/

## 🚀 Como começar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
# Copie o arquivo de exemplo
copy .env.example .env

# Edite o .env com suas informações
notepad .env
```

### 3. Treinar o bot com conversas antigas
Coloque os prints ou exports das conversas antigas no formato:

```
conversas_antigas/conversa1.txt
conversas_antigas/conversa2.txt
```

Formato do arquivo (simples):
```
Cliente: Olá, quanto custa o produto X?
Vendedora: Olá! O produto X custa R$ 50,00

Cliente: Aceita cartão?
Vendedora: Sim, aceitamos cartão e PIX
```

### 4. Iniciar o bot
```bash
npm start
```

Vai aparecer um QR Code - escaneie com o WhatsApp Business da sua mãe.

## 📊 Relatórios

O bot gera relatórios automáticos com:
- Total de clientes atendidos
- Vendas realizadas
- Perguntas mais frequentes
- Horários de maior movimento

Para gerar relatório manual:
```bash
npm run relatorios
```

## 📱 Notificações

Quando um cliente mandar mensagem:
1. Bot responde automaticamente
2. Bot envia notificação para o número pessoal da sua mãe
3. Sua mãe pode assumir a conversa a qualquer momento

## ⚙️ Personalização

Edite `src/config/personalidade.js` para ajustar:
- Tom de voz
- Estilo de resposta
- Informações sobre produtos
- Políticas de venda

## 🔒 Segurança

- Nunca compartilhe seu arquivo `.env`
- Use WhatsApp Business (não pessoal)
- Monitore as conversas nos primeiros dias
- Tenha sempre um humano disponível para casos complexos

## 💡 Dicas

1. **Primeiros dias**: Monitore TODAS as conversas
2. **Ajustes**: Adicione exemplos de conversas que funcionaram bem
3. **Palavras-chave**: Configure palavras que exigem intervenção humana
4. **Horários**: Configure horário comercial no .env
