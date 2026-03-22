# TCC---Monitoramento-de-energia-com-ESP32

## 1) Configurar servidor Node.js

Na pasta do projeto, execute:

```powershell
npm install
npm start
```

O servidor vai rodar em `http://localhost:3000`.

## 2) Banco de dados MySQL (primeiro teste)

- Crie o database e tabela:

```sql
CREATE DATABASE energia;
USE energia;

CREATE TABLE leituras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  irms DOUBLE NOT NULL,
  potencia DOUBLE NOT NULL,
  instante DATETIME NOT NULL
);
```

- Ajuste em `index.js`:
  - `user`, `password`, `database` do `createPool` para seus valores.

## 3) Endpoints disponíveis

- `POST /api/energia` (body JSON: `irms`, `potencia`)
- `GET /api/leituras` (retorna últimas leituras)

## 4) Fluxo de integração com ESP32

1. ESP32 lê sensor SCT013
2. envia POST para `http://IP_SERVIDOR:3000/api/energia`
3. Node salva no MySQL
4. Dashboard busca `/api/leituras`

## 5) Comandos git (quando quiser subir para o GitHub)

```powershell
git add .
git commit -m "Implementa servidor Node.js e API de energia"
# caso já tenha remote configurado:
git push origin main
```
