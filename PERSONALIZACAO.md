# 🎨 PERSONALIZAÇÃO AVANÇADA

## 🤖 Ajustar Personalidade do Bot

Edite: `src/config/personalidade.js`

### Tom de Voz

```javascript
instrucoes: `Você é a Maria, vendedora carismática e atenciosa.

ESTILO DE COMUNICAÇÃO:
- Use emojis moderadamente (1-2 por mensagem)
- Seja informal mas profissional
- Demonstre entusiasmo pelos produtos
- Seja paciente com dúvidas
- Nunca seja insistente ou forçar vendas

PROIBIDO:
- Usar gírias excessivas
- Ser seca ou grossa
- Dar informações incorretas
- Prometer o que não pode cumprir`
```

### Respostas Automáticas

Adicione no final de `src/config/personalidade.js`:

```javascript
export const respostasRapidas = {
    'oi': 'Oi! 😊 Como posso ajudar você hoje?',
    'olá': 'Olá! Bem-vindo(a)! Em que posso te ajudar? 💕',
    'preço': 'Vou verificar os preços para você! Qual produto te interessa?',
    'entrega': 'Fazemos entrega sim! Qual sua região? 📦',
    'horario': `Atendemos de ${process.env.HORARIO_INICIO} às ${process.env.HORARIO_FIM} ⏰`
};
```

## 🛡️ Filtros e Segurança

Criar arquivo: `src/filtros.js`

```javascript
// Palavras que exigem intervenção humana
export const palavrasChave = {
    precisaHumano: [
        'reclamação',
        'processo',
        'advogado',
        'procon',
        'problema grave',
        'reembolso'
    ],
    
    vendaConfirmada: [
        'vou querer',
        'quero comprar',
        'pode separar',
        'fechado',
        'confirmo'
    ],
    
    bloqueadas: [
        // Palavras ofensivas
        'spam',
        'golpe'
    ]
};

export function verificarFiltros(mensagem) {
    const msg = mensagem.toLowerCase();
    
    if (palavrasChave.bloqueadas.some(p => msg.includes(p))) {
        return { bloquear: true };
    }
    
    if (palavrasChave.precisaHumano.some(p => msg.includes(p))) {
        return { precisaHumano: true };
    }
    
    if (palavrasChave.vendaConfirmada.some(p => msg.includes(p))) {
        return { foiVenda: true };
    }
    
    return { ok: true };
}
```

## 📊 Relatórios Customizados

Criar: `src/relatorios-custom.js`

```javascript
import { db } from './database.js';
import { promisify } from 'util';

const dbAll = promisify(db.all.bind(db));

// Top 10 clientes
export async function topClientes(periodo = 30) {
    return await dbAll(`
        SELECT 
            nome_cliente,
            numero_cliente,
            COUNT(*) as total_mensagens,
            SUM(foi_venda) as compras,
            SUM(valor_venda) as valor_total
        FROM conversas
        WHERE timestamp >= datetime('now', '-${periodo} days')
        GROUP BY numero_cliente
        ORDER BY compras DESC, total_mensagens DESC
        LIMIT 10
    `);
}

// Produtos mais perguntados
export async function produtosMaisPerguntados() {
    return await dbAll(`
        SELECT 
            pergunta,
            contador
        FROM perguntas_frequentes
        WHERE categoria = 'produto'
        ORDER BY contador DESC
        LIMIT 20
    `);
}

// Taxa de resposta
export async function taxaResposta() {
    return await dbAll(`
        SELECT 
            DATE(timestamp) as data,
            COUNT(*) as total,
            SUM(CASE WHEN resposta IS NOT NULL THEN 1 ELSE 0 END) as respondidas,
            ROUND(SUM(CASE WHEN resposta IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as taxa
        FROM conversas
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp)
    `);
}
```

## 🔔 Notificações Customizadas

Edite: `src/notificacoes.js`

Adicione diferentes tipos de alerta:

```javascript
export async function alertaVendaAlto(client, venda) {
    if (venda.valor > 500) {
        const msg = `🚨 *VENDA ALTA!* 🚨
        
💰 Valor: R$ ${venda.valor}
👤 Cliente: ${venda.nome}

Recomendo confirmar pessoalmente!`;
        
        await enviarNotificacao(client, msg);
    }
}

export async function alertaClienteNovo(client, cliente) {
    const msg = `🎉 *CLIENTE NOVO!*
    
👤 ${cliente.nome}
📱 ${cliente.numero}

Primeira vez entrando em contato!`;
    
    await enviarNotificacao(client, msg);
}
```

## ⏰ Mensagens Automáticas por Horário

Adicione em `src/whatsapp.js`:

```javascript
function mensagemPorHorario() {
    const hora = new Date().getHours();
    
    if (hora >= 0 && hora < 6) {
        return 'Oi! No momento estou offline, mas volto às 9h! Deixe sua mensagem que respondo logo 😊';
    }
    
    if (hora >= 18 && hora < 24) {
        return 'Olá! Já encerramos o expediente, mas seu contato é importante! Amanhã às 9h te respondo 💕';
    }
    
    return null; // Bot responde normalmente
}
```

## 📈 Dashboard Web (Avançado)

Criar arquivo: `src/server.js`

```javascript
import express from 'express';
import { obterRelatorio } from './database.js';

const app = express();
const PORT = 3000;

app.get('/dashboard', async (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    const relatorio = await obterRelatorio(hoje, hoje);
    
    res.json(relatorio);
});

app.listen(PORT, () => {
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
```

Adicione no `package.json`:
```json
"dependencies": {
  "express": "^4.18.2"
}
```

## 🔄 Auto-Restart (PM2)

```bash
npm install -g pm2

# Iniciar bot
pm2 start src/index.js --name "bot-vendas"

# Auto-restart em caso de erro
pm2 startup
pm2 save

# Monitorar
pm2 monit

# Logs
pm2 logs bot-vendas
```

## 🎯 Integração com CRM

Exemplo básico de webhook:

```javascript
export async function enviarParaCRM(venda) {
    await fetch('https://seu-crm.com/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cliente: venda.nome,
            telefone: venda.numero,
            valor: venda.valor,
            data: new Date()
        })
    });
}
```

## 💾 Backup Automático

```javascript
import cron from 'node-cron';
import { exec } from 'child_process';

// Backup diário às 23h
cron.schedule('0 23 * * *', () => {
    const data = new Date().toISOString().split('T')[0];
    exec(`copy database.sqlite backup-${data}.sqlite`);
    console.log('✅ Backup realizado');
});
```
