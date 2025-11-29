# 🛡️ Projeto de Usuários — Relatório Completo de Segurança (Aula 19)

Este documento apresenta uma análise completa das vulnerabilidades de segurança identificadas e suas respectivas mitigações implementadas no projeto.

---

## 📋 Sumário Executivo

O projeto foi desenvolvido com foco em segurança, implementando proteções contra as principais vulnerabilidades web conhecidas. Todas as medidas seguem as melhores práticas recomendadas pelo OWASP e utilizam bibliotecas consolidadas do ecossistema Node.js.

---

## 🔒 Vulnerabilidades Mitigadas

### 1. SQL Injection (SQLi)

**Status:** ✅ Protegido

**Descrição da Vulnerabilidade:**
SQL Injection ocorre quando dados não validados são inseridos diretamente em queries SQL, permitindo que atacantes executem comandos maliciosos no banco de dados.

**Mitigação Implementada:**
O projeto utiliza o **Mongoose** (ODM - Object-Document Mapper) para interagir com o banco de dados **MongoDB**. A defesa contra ataques de **SQL Injection (SQLi)** é garantida, pois o Mongoose e o MongoDB utilizam **Queries Parametrizadas** (ou *Prepared Statements*) por padrão.

**Mecanismo de Proteção:**
- O Mongoose envia a estrutura da consulta separadamente dos dados de entrada do usuário (`req.body`, `req.params`, etc.)
- O MongoDB trata a entrada do usuário estritamente como **valores literais** e nunca como código executável
- Queries parametrizadas automáticas
- Ausência de concatenação manual de strings em queries

**Localização da Implementação:**
- **Arquivo:** `controllers/userController.js`
- **Métodos protegidos:**
  ```javascript
  User.find()
  User.findByIdAndUpdate(id, dadosAtualizados)
  User.findByIdAndDelete(id)
  User.findOne({ email })
  ```

**Comprovação:**
Todas as operações de banco de dados são feitas usando os métodos nativos do Mongoose, sem concatenação manual de *strings* de consulta, garantindo a defesa automática.

**Por que é seguro:**
O Mongoose converte automaticamente todas as operações em queries seguras, onde os dados do usuário nunca são interpretados como código executável.

---

### 2. Cross-Site Scripting (XSS)

**Status:** ✅ Protegido

**Descrição da Vulnerabilidade:**
XSS permite que atacantes injetem scripts maliciosos em páginas web visualizadas por outros usuários, podendo roubar cookies, sessões ou executar ações não autorizadas.

**Mitigação Implementada:**
A defesa contra XSS está implementada nas *views* (arquivos EJS). O EJS (Embedded JavaScript Templating) realiza o **Output Escaping** automático para a saída de dados através da sintaxe `<%= %>`.

**Localização da Implementação:**
Todas as views do projeto utilizam escape de HTML:

- `views/usersList.ejs`
- `views/editUser.ejs`
- `views/newUser.ejs`
- `views/register.ejs`
- `views/login.ejs`

**Exemplo de código seguro:**
```ejs
<td><%= usuario.nome %></td>
<td><%= usuario.email %></td>
```

**Mecanismo de proteção:**
O operador `<%= %>` (com o sinal de igual) converte automaticamente caracteres especiais em entidades HTML, codificando caracteres HTML especiais e neutralizando *scripts* maliciosos:
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#x27;`

**⚠️ Observação importante:**
O projeto **não utiliza** `<%- %>` (com hífen), que renderiza HTML sem escape e seria vulnerável a XSS. A sintaxe `<%- variavel %>` **NÃO** está sendo utilizada para dados de usuário.

---

### 3. Exposição de Credenciais Sensíveis

**Status:** ✅ Protegido

**Descrição da Vulnerabilidade:**
Armazenar credenciais e chaves secretas diretamente no código-fonte pode resultar em vazamento de informações críticas, especialmente em repositórios públicos.

**Mitigação Implementada:**
Utilização de variáveis de ambiente através do pacote `dotenv`. Credenciais sensíveis foram removidas do código e movidas para o arquivo `.env`.

**Localização da Implementação:**

**Arquivo `.env` (exemplo):**
```env
SESSION_SECRET="segredo-muito-seguro-e-aleatório"
MONGO_URI="mongodb+srv://usuario:senha@cluster.mongodb.net/database"
PORT=3000
NODE_ENV=production
```

**Arquivo `server.js`:**
```javascript
require('dotenv').config();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

mongoose.connect(process.env.MONGO_URI);
```

**Arquivo `.gitignore`:**
```
.env
node_modules/
```

**Benefícios:**
- Evita vazamento de senhas no GitHub
- Permite ambiente de produção seguro
- Credenciais não são expostas no código-fonte
- Diferentes ambientes (dev, staging, prod) podem ter configurações distintas
- Conformidade com padrões de segurança e auditoria

---

### 4. Headers HTTP Inseguros (Hardening HTTP)

**Status:** ✅ Protegido

**Descrição da Vulnerabilidade:**
Headers HTTP mal configurados podem expor a aplicação a diversos ataques, como clickjacking, MIME sniffing e vazamento de informações sensíveis.

**Mitigação Implementada:**
O middleware **Helmet** foi configurado no topo do `server.js` para proteger os headers HTTP e realizar hardening HTTP automático.

**Localização da Implementação:**

**Arquivo `server.js`:**
```javascript
const helmet = require('helmet');

// Deve ser uma das primeiras configurações
app.use(helmet());
```

**Headers configurados automaticamente (Proteções incluídas):**

| Header | Proteção | Descrição |
|--------|----------|-----------|
| `X-Frame-Options` | Clickjacking (anti-clickjacking) | Impede que a página seja incorporada em iframes |
| `X-Content-Type-Options` | MIME Sniffing (no MIME sniffing) | Força o navegador a respeitar o Content-Type declarado |
| `Strict-Transport-Security` | Man-in-the-Middle | Força conexões HTTPS |
| `X-XSS-Protection` | XSS Filter básico | Ativa filtro XSS do navegador |
| `Referrer-Policy` | Vazamento de informações | Controla informações enviadas no header Referer |

---

### 5. Cross-Site Request Forgery (CSRF)

**Status:** ✅ Protegido

**Descrição da Vulnerabilidade:**
CSRF permite que atacantes forcem usuários autenticados a executar ações indesejadas em aplicações web onde estão autenticados.

**Mitigação Implementada:**
A proteção contra CSRF foi implementada usando o middleware `csurf`. Cada formulário POST recebeu o token CSRF.

**Localização da Implementação:**

**Arquivo `server.js`:**
```javascript
const csurf = require('csurf');

app.use(csurf());

// Disponibiliza o token para todas as views
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});
```

**Views protegidas com token CSRF:**

**Exemplo em `views/usersList.ejs` (delete):**
```html
<form method="POST" action="/usuarios/<%= usuario._id %>/deletar">
    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
    <button type="submit" class="btn btn-danger">Deletar</button>
</form>
```

**Outros formulários protegidos:**
- `newUser.ejs` - Criação de usuários
- `editUser.ejs` - Edição de usuários
- `register.ejs` - Registro de contas
- `usersList.ejs` - Deleção de usuários

**⚠️ Exceção:**
A rota `/login` não utiliza proteção CSRF por estar protegida via Rate Limiting (caso especial da aula), conforme decisão de arquitetura.

---

### 6. Ataques de Força Bruta (Defesa Contra Brute Force)

**Status:** ✅ Protegido

**Descrição da Vulnerabilidade:**
Ataques de força bruta tentam adivinhar credenciais através de múltiplas tentativas automatizadas de login.

**Mitigação Implementada:**
O middleware **express-rate-limit** foi usado para limitar tentativas de login e implementar Rate Limiting na rota de autenticação.

**Localização da Implementação:**

**Arquivo `server.js`:**
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // Máximo de 5 tentativas
    message: { error: 'limite_brute_force' },
    standardHeaders: true,
    legacyHeaders: false
});

app.post('/login', loginLimiter, authController.login);
```

**Configuração implementada:**
- **Janela de tempo:** 60 segundos (60 * 1000 ms)
- **Tentativas permitidas:** 5 por IP
- **Mensagem de erro:** `{ error: 'limite_brute_force' }`

**Benefícios:**
- Bloqueia bots e scripts automatizados
- Impede tentativas infinitas de senha
- Proteção proporcional ao risco da rota

---

## 📊 Tabela Resumo de Mitigações

| Vulnerabilidade | Status | Localização | Mecanismo | Biblioteca |
|----------------|--------|-------------|-----------|------------|
| SQL Injection | ✅ | `controllers/userController.js` | Queries parametrizadas | Mongoose |
| XSS | ✅ | `views/*.ejs` | Escape automático `<%= %>` | EJS |
| CSRF | ✅ | `server.js` + formulários POST | Tokens CSRF (`<input type="hidden"...>`) | csurf |
| Força Bruta | ✅ | `POST /login` | Rate Limiting | express-rate-limit |
| Credenciais Expostas | ✅ | `.env` + `server.js` | Variáveis de ambiente | dotenv |
| Headers Inseguros | ✅ | `server.js` | Headers de segurança (Helmet) | helmet |

---

## 🎯 Boas Práticas Implementadas

### Defesa em Profundidade
O projeto implementa múltiplas camadas de segurança, garantindo que mesmo se uma proteção falhar, outras continuam ativas.

### Princípio do Menor Privilégio
Cada componente tem apenas as permissões necessárias para sua operação.

### Validação de Entrada
Todos os dados de entrada são tratados como potencialmente maliciosos.

### Segurança por Padrão
As configurações padrão são as mais seguras, requerendo ação explícita para reduzir proteções.

---

## 🔧 Dependências de Segurança

```json
{
  "dependencies": {
    "helmet": "^7.0.0",
    "csurf": "^1.11.0",
    "express-rate-limit": "^6.7.0",
    "dotenv": "^16.0.3",
    "mongoose": "^7.0.0",
    "ejs": "^3.1.9"
  }
}
```

---

## 📝 Recomendações Adicionais

### Para Produção

1. **HTTPS obrigatório:** Configure certificados SSL/TLS
2. **Logs de segurança:** Implemente logging de tentativas suspeitas
3. **Atualizações regulares:** Mantenha dependências atualizadas
4. **Monitoramento:** Configure alertas para comportamentos anormais
5. **Backup:** Implemente estratégia de backup do banco de dados

### Melhorias Futuras

- Implementar autenticação de dois fatores (2FA)
- Adicionar captcha em formulários públicos
- Implementar política de senhas fortes
- Configurar Content Security Policy (CSP) personalizado
- Adicionar auditoria de ações sensíveis

---

## ✅ Conclusão

O projeto implementa proteções robustas contra as principais vulnerabilidades web conhecidas, seguindo as recomendações do OWASP Top 10. Todas as camadas da aplicação foram consideradas na análise de segurança, desde o banco de dados até a apresentação final no navegador.

A combinação de bibliotecas consolidadas, boas práticas de desenvolvimento e arquitetura defensiva resulta em uma aplicação segura e pronta para ambientes de produção, com possibilidades de evolução contínua através das recomendações adicionais apresentadas.

**Este documento comprova que todas as vulnerabilidades discutidas na Aula 19 foram adequadamente mitigadas, com implementações claras e mecanismos de proteção em múltiplas camadas.**

---