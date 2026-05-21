# TCC — Monitoramento de Energia (Servidor)

Este diretório contém o servidor Node.js responsável por receber leituras de energia (do ESP32), autenticar usuários e servir o frontend estático em `../public`.

**Visão geral**
- **Pasta:** Server
- **Função:** API REST para registro/login, gravação de leituras e endpoints para dashboard em tempo real.

**Estrutura do repositório (resumida)**
- [Arduino](../Arduino): sketch do ESP32 e arquivos .ino
- [arduinoHTML](../arduinoHTML): interface embarcada (HTML para Arduino)
- [public](../public): frontend (login, cadastro, dashboard)
- [Server](./): servidor Node.js (este diretório)

Requisitos
- Node.js (v14+ recomendável)
- MySQL (ou MariaDB)

Variáveis de ambiente
Crie um arquivo `.env` em `Server/` com pelo menos as seguintes variáveis:

- `DB_HOST` — host do MySQL (ex: localhost)
- `DB_USER` — usuário do banco
- `DB_PASSWORD` — senha do usuário
- `DB_DATABASE` — nome do banco de dados (ex: Monitor_Energia)
- `SECRET_KEY` — chave secreta para JWT
- `PORT` — porta do servidor (opcional, padrão 3000)

Instalação
1. Abra um terminal em [Server](Server)
2. Instale dependências:

```bash
npm install
```

Iniciar

```bash
npm start
# ou
node index.js
```

O servidor estará disponível em `http://localhost:3000` (ou na porta definida em `PORT`). O frontend é servido a partir de `../public`.

Banco de dados
- Há um arquivo de esquema em [Server/schema.sql](schema.sql). Use-o para criar o banco e tabelas:

```sql
-- exemplo rápido
CREATE DATABASE IF NOT EXISTS Monitor_Energia;
USE Monitor_Energia;
-- então execute o conteúdo de schema.sql
```

Endpoints principais
- `POST /api/auth/register` — Registro de usuário
  - body: `{ nome, email, senha }`
- `POST /api/auth/login` — Login
  - body: `{ email, senha }` → retorna `token` (JWT)
- `POST /api/energia` — Salvar leitura (autenticado)
  - headers: `Authorization: Bearer <token>`
  - body: `{ tensao: number, corrente: number, kwh: number }`
- `POST /api/iot/energia` — Rota alternativa para IoT (sem auth)
- `GET /api/leituras` — Retorna leituras recentes (autenticado)
- `GET /api/resumo-semana?semana=YYYY-Www` — Resumo diário da semana
- `GET /api/tempo-real` — Última leitura + dados do dia/mês

Rotas frontend (servidas estaticamente)
- `GET /` → `../public/login.html`
- `GET /dashboard` → `../public/dashboard.html`
- `GET /cadastro` → `../public/cadastro.html`

Testes rápidos (curl)
- Registrar:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"t@t.com","senha":"123456"}'
```

- Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"t@t.com","senha":"123456"}'
```

- Enviar leitura (substitua `<TOKEN>`):

```bash
curl -X POST http://localhost:3000/api/energia \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"tensao":230.0,"corrente":1.2,"kwh":0.28}'
```

Observações
- O servidor usa JWT para autenticação (`SECRET_KEY`).
- Ajuste `OFFLINE_THRESHOLD_MS` em `index.js` caso queira outro comportamento de offline.

Contribuições
- Abra issues ou PRs com melhorias. Para rodar localmente, configure o `.env` e o banco conforme explicado.

Licença
- Uso livre para fins educacionais.


