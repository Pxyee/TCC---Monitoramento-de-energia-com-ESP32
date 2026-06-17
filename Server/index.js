console.log("ARQUIVO EXECUTADO:", __filename);
require('dotenv').config();
console.log("CLAUDIA TESTE SWAGGER");
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_DATABASE:", process.env.DB_DATABASE);

// Const - Guarda variavel que não pode ser reatribuída
// Require - Importa uma biblioteca ou módulo para o código, cada uma pega uma lib do node_modules

//****** Bibliotecas ******/
const express = require('express'); 
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express(); // Cria uma instância do Express
app.use(cors()); //cors = Cross-Origin Resource Sharing, permite que o frontend em outro dominio acesse a API
app.use(express.json({ limit: '1mb' })); // Middleware = camada intermediaria que processa requisições ANTES de chegar no código
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);
app.get('/teste-swagger', (req, res) => {
    res.send('Swagger carregado');
});

// Configura o caminho para os arquivos estáticos (HTML, CSS, JS)
const path = require('path');

app.use(express.static(path.join(__dirname, '../public'))); // Serve arquivos da pasta public (frontend)


/// Configuração chave secreta 
const SECRET_KEY = process.env.SECRET_KEY; // Chave para assinar os tokens JWT, vem do .env

/// Banco de dados
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true, // Esperar conexão ficar livre
    connectionLimit: 10, // Max 10 usuarios simultaneos
    queueLimit: 0 // Fila ilimitada
});

const OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 segundos

const verificarToken = (req, res, next) => { //cria uma função que recebe req(requisição),res(resposta) e next (passa para o proximo middleware)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // pega o header authorization
    if (!token) { //se existir, faça:
        return res.status(401).json({ success: false, error: 'Token não fornecido'}) // se não houver token, retorna 401
    }
    try { // verifica se toke foi assinado com secret_key
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuarioId = decoded.id;
        next();
    } catch (error) { // se toke invalido, retorna erro 403
        res.status(403).json({ success: false, error: 'Token inválido'});
    }
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Maria Claudia
 *               email:
 *                 type: string
 *                 example: maria@email.com
 *               senha:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Dados obrigatórios não informados
 *       500:
 *         description: Erro interno
 */

// Endpoint de registro

app.post('/api/auth/register', async (req, res) => {

    console.log("BODY RECEBIDO:", req.body);
    console.log("NOME:", req.body.nome);

    const { nome, email, senha } = req.body;

    console.log("NOME:", nome);
    console.log("EMAIL:", email);
    console.log("SENHA:", senha);
     //rota post (cria algo novo)
    try{
        const { nome, email, senha } = req.body; // extrai nome, email e senha do corpo da requisição
        if (!nome || !email || !senha) {
            return res.status(400).json({ success: false, error: 'Nome, Email e senha são obrigatórios' }); // Se algum dos três estiver vazio: erro 400
        }
         const senhaHash = await bcrypt.hash(senha, 10); //criptografa a senha 
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', // insere nome, email e senha_hash no banco
            [nome, email, senhaHash]
        );
        res.json({ // responde com sucesso e o id do novo usuario
            success: true,
            message: 'Usuário registrado com sucesso',
            usuarioId: result.insertId
        });
    }catch (error) {
    console.error("REGISTER ERROR FULL:", error);

    return res.status(500).json({
        success: false,
        error: error.message,
        full: error
    });
}
});
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Realiza o login do usuário
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 example: usuario@email.com
 *               senha:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */


// Endpoint de login

app.post('/api/auth/login', async (req, res) => {
    try {
        const {email, senha } = req.body; // mesmo inicio do registro (extrair dados, validar)
        if (!email || !senha) {
            return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
            }
        const [rows] = await pool.execute( 
            'SELECT id, nome, senha_hash FROM usuarios WHERE email = ?', // SELECT busca id e senha criptogradada //WHERE onde email seja o enviado
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Usuário não encontrado' }); // se nenhum resultado: banco não tem esse email
        }
        const usuario = rows[0]; //pega o primeiro (único) resultado
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash); // compara senha enviada com a senha criptografada do banco
        if (!senhaValida) {
            return res.status(401).json({ success: false, error: 'Senha incorreta' }); // se senhas não combinarem: erro
        }
        const token = jwt.sign({ id: usuario.id }, SECRET_KEY, { expiresIn: '24h' }); // cria token
        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            token,
            usuarioId: usuario.id,
            nome: usuario.nome 
});
    } catch (error) {
        res.status(500).json({ success: false, error: error.message});
    }
});

/**
 * @swagger
 * /api/energia:
 *   post:
 *     summary: Salva uma leitura de energia
 *     tags:
 *       - Energia
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tensao
 *               - corrente
 *               - kwh
 *             properties:
 *               tensao:
 *                 type: number
 *                 example: 220
 *               corrente:
 *                 type: number
 *                 example: 5.3
 *               kwh:
 *                 type: number
 *                 example: 1.52
 *     responses:
 *       200:
 *         description: Leitura salva com sucesso
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 */

// Endpoint de Salvar leitura

app.post('/api/energia', verificarToken, async (req, res) => { //rota post, com middleware de verificação de token
    try {
        const {tensao, corrente, kwh } = req.body;
        if (typeof tensao !== 'number' || typeof corrente !== 'number' || typeof kwh !== 'number') {
            return res.status(400).json({ success: false, error: 'tensao,corrente e kwh devem ser números' }); //extrai dados, valida se são números
        } 
    const [result] = await pool.execute(
        "INSERT INTO leituras (tensao, corrente, kwh) VALUES (?, ?, ?)", // insere leitura no banco 
        [tensao, corrente, kwh]
    );
    res.json({ success: true, insertedId: result.insertId }); // retorna sucesso com id inserido
} catch (error) { 
    console.error('Erro POST /api/energia:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
}
});

/**
 * @swagger
 * /api/iot/energia:
 *   post:
 *     summary: Recebe dados enviados pelo ESP32
 *     tags:
 *       - IoT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tensao:
 *                 type: number
 *               corrente:
 *                 type: number
 *               kwh:
 *                 type: number
 *     responses:
 *       200:
 *         description: Dados recebidos com sucesso
 */


app.post('/api/iot/energia', async (req, res) => {

    try {

        const {
            tensao,
            corrente,
            kwh,
            mensal,
            labels,
            dados
        } = req.body;

        console.log("LABELS:", labels);
        console.log("DADOS:", dados);
        console.log("MENSAL:", mensal);

        console.log(req.body);

        const [result] = await pool.execute(
            `
            INSERT INTO leituras
            (tensao, corrente, kwh)
            VALUES (?, ?, ?)
            `,
            [tensao, corrente, kwh]
        );

        res.json({
            success: true,
            insertedId: result.insertId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: 'Erro interno'
        });
    }
});

/**
 * @swagger
 * /api/leituras:
 *   get:
 *     summary: Retorna as últimas leituras registradas
 *     tags:
 *       - Consultas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de leituras
 *       401:
 *         description: Token não fornecido
 */

// endpoint para buscar leituras

app.get('/api/leituras', verificarToken, async (req, res) => { // rota GET, apenas retorna leituras sem filtro por usuário
    try {
        const [rows] = await pool.execute(
            'SELECT id, tensao, corrente, kwh, instante FROM leituras ORDER BY instante DESC LIMIT 200'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro GET /api/leituras', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
});

// ======================================================
// 📊 RESUMO SEMANAL
// ======================================================

/**
 * @swagger
 * /api/resumo-semana:
 *   get:
 *     summary: Retorna o consumo semanal
 *     tags:
 *       - Consultas
 *     parameters:
 *       - in: query
 *         name: semana
 *         required: true
 *         schema:
 *           type: string
 *         example: 2026-W24
 *     responses:
 *       200:
 *         description: Resumo semanal
 */

app.get('/api/resumo-semana', async (req, res) => {

    try {

        const semana = req.query.semana;

        if (!semana) {
            return res.json([]);
        }

        const [ano, numeroSemana] =
            semana.split('-W');

        const [rows] = await pool.execute(`

            SELECT
                DATE(instante) AS dia,
                MAX(kwh) AS total

            FROM leituras

            WHERE YEAR(instante) = ?
            AND WEEK(instante, 1) = ?

            GROUP BY DATE(instante)

            ORDER BY dia ASC

        `, [ano, numeroSemana]);

        res.json(rows);

    } catch (error) {

        console.error(
            'Erro GET /api/resumo-semana:',
            error
        );

        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });

    }

});


// ======================================================
// ⚡ ÚLTIMA LEITURA
// ======================================================


/**
 * @swagger
 * /api/tempo-real:
 *   get:
 *     summary: Retorna a última leitura e status do dispositivo
 *     tags:
 *       - Consultas
 *     responses:
 *       200:
 *         description: Dados em tempo real
 */

app.get('/api/tempo-real', async (req, res) => {

    try {

        const [latestRows] = await pool.execute(
            'SELECT tensao, corrente, kwh, instante FROM leituras ORDER BY instante DESC LIMIT 1'
        );

        const respostaTempoReal = {
            tensao: 0,
            corrente: 0,
            kwh: 0,
            instante: null,
            labels: [],
            dados: [],
            mensal: Array.from({ length: 31 }, () => 0)
        };

        if (latestRows.length > 0) {
            respostaTempoReal.tensao = latestRows[0].tensao;
            respostaTempoReal.corrente = latestRows[0].corrente;
            respostaTempoReal.kwh = latestRows[0].kwh;
            respostaTempoReal.instante = latestRows[0].instante;
        }

        const [todayRows] = await pool.execute(
            'SELECT kwh, instante FROM leituras WHERE DATE(instante) = CURDATE() ORDER BY instante ASC'
        );

        respostaTempoReal.labels = todayRows.map(row => {
            const instante = new Date(row.instante);
            return `${String(instante.getHours()).padStart(2, '0')}:${String(instante.getMinutes()).padStart(2, '0')}`;
        });

        respostaTempoReal.dados = todayRows.map(row => Number(row.kwh));

        const [monthlyRows] = await pool.execute(
            `SELECT DAY(instante) AS dia, MAX(kwh) AS total
             FROM leituras
             WHERE YEAR(instante) = YEAR(CURDATE())
               AND MONTH(instante) = MONTH(CURDATE())
             GROUP BY dia
             ORDER BY dia ASC`
        );

        for (const row of monthlyRows) {
            const dia = Number(row.dia);
            if (dia >= 1 && dia <= 31) {
                respostaTempoReal.mensal[dia - 1] = Number(row.total);
            }
        }

        const agora = Date.now();
        const instante = respostaTempoReal.instante
            ? new Date(respostaTempoReal.instante).getTime()
            : 0;

        const offline = !instante || agora - instante > OFFLINE_THRESHOLD_MS;

        res.json({
            ...respostaTempoReal,
            offline
        });

    } catch (error) {

        console.error('Erro GET /api/tempo-real:', error);

        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });

    }

});

    // ======================================================
// 🌐 ROTAS FRONTEND
// ======================================================

// LOGIN
app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, '../public/login.html')
    );

});


// DASHBOARD
app.get('/dashboard', (req, res) => {

    res.sendFile(
        path.join(__dirname, '../public/dashboard.html')
    );

});


// CADASTRO
app.get('/cadastro', (req, res) => {

    res.sendFile(
        path.join(__dirname, '../public/cadastro.html')
    );

});


// iniciar servidor

const PORT = process.env.PORT || 3000;  // pega variavel de ambiente ou usa 3000
app.listen(PORT, () => { //inicia servidor na porta
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

