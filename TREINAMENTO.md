# 🧠 Sistema de Treinamento e Aprendizado do Bot

## 📚 Como o Bot Aprende com as Conversas

Este documento explica como o bot salva conversas, mantém o contexto e aprende com interações anteriores.

---

## 🎯 Visão Geral

O bot possui um sistema completo de aprendizado que:

1. **Salva TODAS as conversas** em banco de dados SQLite
2. **Mantém contexto** de conversas anteriores
3. **Aprende padrões** de fala e atendimento
4. **Exporta conversas** para retreinamento
5. **Melhora continuamente** com base em conversas reais

---

## 💾 O Que é Salvo no Banco de Dados?

### Tabela: `conversas`
Cada mensagem trocada é salva com:

```
- número do cliente
- nome do cliente
- mensagem recebida
- resposta enviada
- data/hora
- se foi uma venda
- valor da venda
- se humano assumiu
```

### Tabela: `perguntas_frequentes`
Rastreia perguntas mais comuns:

```
- pergunta
- categoria (preço, entrega, produto, etc)
- quantas vezes foi perguntada
- última vez que foi perguntada
```

### Tabela: `metricas_diarias`
Estatísticas agregadas por dia:

```
- total de conversas
- total de vendas
- valor total vendido
- clientes únicos atendidos
```

---

## 🔄 Como o Bot Mantém o Contexto da Conversa?

### 1. Histórico Recente (Últimas 5-10 mensagens)
O bot sempre busca as últimas mensagens do cliente antes de responder:

```javascript
// Exemplo interno:
Cliente: "Oi, quanto custa o produto X?"
Bot: "Olá! O produto X custa R$ 50"
Cliente: "E tem desconto?"  // ← Bot lembra da conversa anterior
Bot: "Sim! No PIX dá 10% de desconto, fica R$ 45"
```

### 2. Contexto Expandido
O sistema também verifica:

- **Quantas vezes** o cliente já interagiu
- **Se já comprou** antes (e quantas vezes)
- **Categorias de interesse** (preço, entrega, produtos específicos)
- **Quando foi** a primeira e última interação

### 3. Cliente Recorrente?
Se o cliente já comprou antes, o bot:
- É mais atencioso
- Oferece novidades
- Lembra de preferências anteriores

---

## 📤 Exportando Conversas para Treinamento

### Por Que Exportar?

As conversas reais são o **melhor material de treinamento** para o bot aprender:
- Seu **estilo** de atendimento
- Seu **tom** de voz
- Como você **fecha vendas**
- Como você **lida com objeções**

### Como Exportar?

Execute o comando:

```bash
npm run exportar-conversas
```

Isso vai:

1. **Exportar as últimas 100 conversas** gerais
2. **Exportar as últimas 50 vendas** bem-sucedidas
3. **Exportar as 30 melhores** conversas (com mais interação)
4. **Salvar tudo** em `src/conversas_antigas/`

### Arquivos Gerados

```
src/conversas_antigas/
├── conversas_exportadas_1234567890.txt
├── vendas_exitosas_1234567890.txt
└── melhores_conversas_1234567890.txt
```

### Formato dos Arquivos

```
=== Conversa com João Silva ===

Cliente: Oi, bom dia!
Vendedor: Bom dia! Como posso ajudar? 😊

Cliente: Quanto custa o produto X?
Vendedor: O produto X está R$ 50! É um dos mais vendidos 💚

Cliente: Vou levar!
Vendedor: Ótimo! Vou separar agora mesmo 🎉
```

---

## 🎓 Como o Bot Usa as Conversas Antigas?

### 1. Carregamento Automático

Ao **iniciar**, o bot:
```
✅ Carrega TODOS os arquivos .txt da pasta conversas_antigas/
✅ Aprende o estilo de fala
✅ Aprende respostas típicas
✅ Aprende como fechar vendas
```

### 2. Durante Atendimento

O bot usa conversas antigas para:
- **Manter consistência** no tom de voz
- **Imitar respostas** bem-sucedidas
- **Seguir padrões** que funcionaram antes

### 3. Exemplo Prático

**Conversa Antiga (Treinamento):**
```
Cliente: Tem desconto?
Vendedor: No PIX dá 10%! Fica ainda mais em conta 😊
```

**Conversa Nova (Bot Aplicando):**
```
Cliente: Dá desconto?
Bot: Sim! No PIX dá 10% de desconto 😊
```

O bot **aprende** a ser similar, mas **não copia** exatamente.

---

## 🔧 Melhorando o Treinamento

### 1. Adicione Conversas Manualmente

**Passos:**
1. Crie arquivo `.txt` em `src/conversas_antigas/`
2. Copie conversas de WhatsApp/outros canais
3. Formate como mostrado acima
4. Reinicie o bot

### 2. Use Conversas Reais

**Melhores fontes:**
- ✅ Conversas que **resultaram em venda**
- ✅ Clientes **satisfeitos**
- ✅ Respostas **naturais e amigáveis**
- ❌ Evite conversas com **reclamações graves**
- ❌ Evite conversas **mal resolvidas**

### 3. Quantidade Ideal

**Mínimo:** 5-10 conversas diferentes  
**Recomendado:** 20-50 conversas  
**Ideal:** 50-100 conversas variadas  

Mais conversas = Bot aprende melhor!

### 4. Variedade é Importante

Inclua conversas sobre:
- ✅ Preços e descontos
- ✅ Formas de pagamento
- ✅ Entrega e frete
- ✅ Produtos e estoque
- ✅ Dúvidas comuns
- ✅ Fechamento de vendas

---

## 📊 Monitorando o Aprendizado

### Ver Estatísticas

```bash
npm run exportar-conversas
```

Mostra:
```
📊 ESTATÍSTICAS DO BANCO DE DADOS:

   👥 Total de clientes: 45
   💬 Total de mensagens: 234
   💰 Total de vendas: 12
   📈 Taxa de conversão: 26.7%
```

### Análise de Perguntas Frequentes

O bot rastreia automaticamente:
- Quais perguntas são mais comuns
- Quais categorias geram mais dúvidas
- Quando as perguntas são feitas (horários de pico)

Use isso para:
1. **Melhorar respostas** nas perguntas frequentes
2. **Adicionar informações** na personalidade
3. **Antecipar dúvidas** comuns

---

## 🚀 Fluxo Completo de Aprendizado

### Fase 1: Configuração Inicial (Dia 1)
```
1. Configure o bot com conversas de exemplo
2. Adicione 5-10 conversas antigas manualmente
3. Configure personalidade e produtos
4. Inicie o bot
```

### Fase 2: Coleta de Dados (Primeiras 2 semanas)
```
1. Bot atende clientes reais
2. TODAS conversas são salvas automaticamente
3. Monitore e ajuste quando necessário
4. Humano assume conversas complexas
```

### Fase 3: Primeiro Retreinamento (Após 2 semanas)
```
1. Execute: npm run exportar-conversas
2. Revise as melhores conversas exportadas
3. Adicione as melhores à pasta conversas_antigas/
4. Remova conversas ruins (se houver)
5. Reinicie o bot
```

### Fase 4: Retreinamento Contínuo (Mensal)
```
1. A cada mês, exporte novas conversas
2. Adicione as melhores ao treinamento
3. Mantenha 50-100 conversas de qualidade
4. Remove conversas muito antigas ou irrelevantes
```

---

## 💡 Dicas Profissionais

### ✅ FAÇA

1. **Exporte conversas regularmente** (semanal ou mensal)
2. **Revise exportações** antes de adicionar ao treinamento
3. **Mantenha variedade** de situações
4. **Priorize vendas bem-sucedidas**
5. **Monitore taxa de conversão**

### ❌ NÃO FAÇA

1. **Não adicione conversas mal resolvidas**
2. **Não use conversas com linguagem inadequada**
3. **Não exagere na quantidade** (qualidade > quantidade)
4. **Não ignore o contexto** - bot precisa de histórico
5. **Não esqueça de reiniciar** após adicionar conversas novas

---

## 🔒 Privacidade e LGPD

### Dados Salvos

- Conversas são salvas **localmente** no seu servidor
- Não são compartilhadas com terceiros
- Você tem controle total dos dados

### Boas Práticas

1. **Informe clientes** que conversas podem ser salvas
2. **Anonimize dados** se exportar para outros fins
3. **Delete dados antigos** periodicamente (LGPD)
4. **Backup regular** do database.sqlite

### Excluir Dados de Cliente

```sql
-- Executar no SQLite:
DELETE FROM conversas WHERE numero_cliente = '5511999999999';
```

---

## ❓ Perguntas Frequentes

**Q: Quantas conversas o banco aguenta?**  
R: SQLite aguenta milhões de registros. Para 10.000 mensagens/mês, ocupa ~50MB.

**Q: Como apagar conversas antigas?**  
R: Use SQL direto no banco ou implemente rotina de limpeza automática.

**Q: O bot aprende sozinho?**  
R: Não exatamente. Ele salva tudo, mas você precisa **exportar e adicionar** as melhores ao treinamento.

**Q: Preciso retreinar sempre?**  
R: Recomendado mensal ou quando notar queda na qualidade.

**Q: Posso usar conversas de outro negócio?**  
R: Não recomendado. Use apenas conversas do seu negócio para manter autenticidade.

---

## 🛠️ Comandos Úteis

### Exportar Conversas
```bash
npm run exportar-conversas
```

### Iniciar Bot
```bash
npm start
```

### Ver Relatórios
```bash
npm run relatorios
```

### Acessar Banco de Dados
```bash
sqlite3 database.sqlite
.tables
SELECT * FROM conversas LIMIT 10;
```

---

## 🎯 Próximos Passos

1. **Configure o bot** seguindo INSTALACAO.md
2. **Adicione conversas iniciais** em conversas_antigas/
3. **Deixe rodar** por 1-2 semanas
4. **Exporte conversas** e adicione as melhores
5. **Monitore melhoria** na taxa de conversão

---

**✨ Última atualização:** Fevereiro 2026  
**📚 Mais informações:** Veja README.md e COMPARACAO_MODELOS.md
