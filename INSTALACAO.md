# 🚀 GUIA DE INSTALAÇÃO E USO

## 📋 Pré-requisitos

1. **Node.js** instalado (versão 18 ou superior)
   - Download: https://nodejs.org/
   - Verificar: `node --version`

2. **WhatsApp Business** no celular
   - Baixe o WhatsApp Business na loja de apps
   - Configure com o número do negócio

3. **Conta em uma plataforma de IA** (escolha uma):

### Opção 1: OpenAI (RECOMENDADO) 💰
- Melhor qualidade de respostas
- Custo: ~$0.002 por mensagem (muito barato)
- Como criar conta:
  1. Acesse: https://platform.openai.com/signup
  2. Crie conta com email
  3. Adicione créditos (mínimo $5)
  4. Pegue sua API Key em: https://platform.openai.com/api-keys

### Opção 2: Google Gemini (GRÁTIS) 🆓
- Gratuito com limites generosos
- Boa qualidade
- Como criar conta:
  1. Acesse: https://makersuite.google.com/app/apikey
  2. Faça login com conta Google
  3. Clique em "Get API Key"
  4. Copie a chave

### Opção 3: Anthropic Claude 💰
- Excelente qualidade
- Custo similar ao OpenAI
- Criar conta: https://console.anthropic.com/

---

## 📥 PASSO 1: Instalar Dependências

Abra o terminal nesta pasta e execute:

```bash
npm install
```

Aguarde instalar todos os pacotes necessários.

---

## ⚙️ PASSO 2: Configurar Variáveis de Ambiente

1. **Copie o arquivo de exemplo:**
```bash
copy .env.example .env
```

2. **Edite o arquivo .env:**
```bash
notepad .env
```

3. **Preencha as informações:**

```env
# Cole sua chave da API aqui (escolha OpenAI, Gemini ou Claude)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxx

# OU use Gemini (gratuito)
# GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxx
# AI_PROVIDER=gemini

# Número pessoal da sua mãe (com código do país e DDD)
# Exemplo: 5511999887766 (55=Brasil, 11=SP)
NUMERO_NOTIFICACAO=5511999999999

# Nome do negócio e da dona
NOME_NEGOCIO=Loja da Maria
DONA_NEGOCIO=Maria

# Horário de atendimento
HORARIO_INICIO=09:00
HORARIO_FIM=18:00

# Relatórios automáticos
ENVIAR_RELATORIO_DIARIO=true
HORARIO_RELATORIO=20:00
```

4. **Salve e feche o arquivo**

---

## 📚 PASSO 3: Adicionar Conversas de Treinamento

O bot aprende com conversas anteriores da sua mãe!

1. **Crie arquivos na pasta `conversas_antigas/`**
   - Já existe um arquivo de exemplo
   - Adicione mais arquivos .txt com conversas reais

2. **Formato dos arquivos:**

```txt
Cliente: Oi, boa tarde!
Vendedora: Oi! Boa tarde! 😊 Como posso te ajudar?

Cliente: Quanto custa o produto X?
Vendedora: O produto X está por R$ 50,00! É um dos nossos mais vendidos 💕

Cliente: Tem no azul?
Vendedora: Tenho sim! Também temos em vermelho e preto. Qual prefere?

Cliente: Vou querer o azul
Vendedora: Perfeito! Vou separar para você 🎉
```

**Dicas:**
- Adicione 5-10 conversas reais
- Inclua diferentes situações (dúvidas, vendas, reclamações)
- Quanto mais exemplos, melhor o bot aprende o tom da sua mãe

---

## 🛍️ PASSO 4: Configurar Produtos e Preços

Edite o arquivo: `src/config/personalidade.js`

Procure a seção "PRODUTOS E PREÇOS" e adicione seus produtos reais:

```javascript
PRODUTOS E PREÇOS:

- Vestido Floral: R$ 89,90
- Blusa de Malha: R$ 45,00
- Calça Jeans: R$ 120,00
- Conjunto 2 peças: R$ 150,00

Promoção: Leve 3, pague 2!
```

---

## 🚀 PASSO 5: Iniciar o Bot

```bash
npm start
```

**O que vai acontecer:**

1. ✅ Sistema inicializa banco de dados
2. 📱 Aparece um QR Code no terminal
3. 🔍 Escaneie o QR Code com WhatsApp Business
4. ✅ Bot conectado e funcionando!

**Importante:**
- Deixe o terminal aberto enquanto o bot estiver funcionando
- Se fechar o terminal, o bot para de funcionar

---

## 📱 PASSO 6: Testar o Bot

1. Peça para alguém mandar mensagem para o WhatsApp Business
2. O bot vai responder automaticamente
3. Você receberá notificação no número pessoal
4. Acompanhe as mensagens no terminal

---

## 📊 Ver Relatórios

### Relatório do Dia:
```bash
npm run relatorios
```

### Controles Manuais:

**Assumir uma conversa (desativar bot):**
No WhatsApp, envie:
```
!assumir 5511999887766
```

**Liberar bot novamente:**
```
!liberar 5511999887766
```

---

## ❓ Problemas Comuns

### Erro: "Cannot find module"
**Solução:** Execute `npm install` novamente

### QR Code não aparece
**Solução:** 
- Verifique conexão com internet
- Tente: `npm start` novamente
- Limpe cache: delete pasta `.wwebjs_auth`

### Bot não responde
**Verificar:**
1. Terminal está aberto?
2. QR Code foi escaneado?
3. Chave da API está correta no .env?
4. Tem créditos na conta da API?

### Respostas estranhas
**Melhorar:**
1. Adicione mais conversas de exemplo
2. Edite personalidade em `src/config/personalidade.js`
3. Teste e ajuste

---

## 💰 Custos Estimados

### OpenAI (GPT-4o-mini):
- Por mensagem: ~$0.002 (R$ 0,01)
- 1000 mensagens/mês: ~$2 (R$ 10)
- **MUITO BARATO!**

### Google Gemini:
- **GRATUITO** até 60 requisições por minuto
- Ideal para começar

---

## 🔄 Manter Bot Funcionando 24/7

### Opção 1: Deixar computador ligado
- Mantenha terminal aberto
- Configure para não hibernar

### Opção 2: Servidor na nuvem (Avançado)
- Railway.app (grátis)
- Heroku
- VPS (Digital Ocean, AWS, etc)

---

## 📞 Suporte

Se tiver dúvidas:
1. Leia o README.md principal
2. Verifique os logs no terminal
3. Teste com `npm start` novamente

---

## ✅ Checklist Final

- [ ] Node.js instalado
- [ ] npm install executado
- [ ] .env configurado com API key
- [ ] Número de notificação configurado
- [ ] Conversas antigas adicionadas
- [ ] Produtos e preços configurados
- [ ] Bot iniciado com npm start
- [ ] QR Code escaneado
- [ ] Teste realizado
- [ ] Funcionando! 🎉
