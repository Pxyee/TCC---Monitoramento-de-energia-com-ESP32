
require('dotenv').config();

// Const - Guarda variavel que não pode ser reatribuída
// Require - Importa uma biblioteca ou módulo para o código, cada uma pega uma lib do node_modules

//****** Bibliotecas ******/
const express = require('express'); 
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express(); // Cria uma instância do Express
app.use(cors()); //cors = Cross-Origin Resource Sharing, permite que o frontend em outro dominio acesse a API
app.use(bodyParser.json()); // Middleware = camada intermediaria que processa requisições ANTES de chegar no código

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

// Endpoint de registro

app.post('/api/auth/register', async (req, res) => { //rota post (cria algo novo)
    try{
        const { email, senha } = req.body; // extrai email e senha do corpo da requisição
        if (!email || !senha) {
            return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' }); // Se algum dos dois estiver vazio: erro 400
        }
         const senhaHash = await bcrypt.hash(senha, 10); //criptografa a senha 
        const [result] = await pool.execute(
            'INSERT INTO usuarios (email, senha_hash) VALUES (?, ?)', // insere email e senha_hash no banco
            [email, senhaHash]
        );
        res.json({ // responde com sucesso e o id do novo usuario
            success: true,
            message: 'Usuário registrado com sucesso',
            usuarioId: result.insertId
        });
    }catch (error) {
        if (error.code === 'ER_DUP_ENTRY') { // se email já existir, retorna erro 409
            res.status(400).json({ success: false, error: 'Email já registrado' });
        } else {
            res.status(500).json({ success: false, error: error.message }); // captura ERROS, email duplicado: erro especial, se outro erro: erro 500 (servidor)
        }
    }
});

// Endpoint de login

app.post('/api/auth/login', async (req, res) => {
    try {
        const {email, senha } = req.body; // mesmo inicio do registro (extrair dados, validar)
        if (!email || !senha) {
            return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
            }
        const [rows] = await pool.execute( 
            'SELECT id, senha_hash FROM usuarios WHERE email = ?', // SELECT busca id e senha criptogradada //WHERE onde email seja o enviado
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
            success: true, // retorna token para o cliente guardar
            message: 'Login realizado com sucesso',
            token,
            usuarioId: usuario.id
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message});
    }
});

// Endpoint de Salvar leitura

app.post('/api/energia', verificarToken, async (req, res) => { //rota post, com middleware de verificação de token
    try {
        const {tensao, corrente, kwh } = req.body;
        if (typeof tensao !== 'number' || typeof corrente !== 'number' || typeof kwh !== 'number') {
            return res.status(400).json({ success: false, error: 'tensao,corrente e kwh devem ser números' }); //extrai dados, valida se são números
        } 
    const [result] = await pool.execute(
        "INSERT INTO leituras (usuario_id, tensao, corrente, kwh) VALUES (?, ?, ?, ?)", // insere leitura no banco 
        [req.usuarioId, tensao, corrente, kwh]
    );
    res.json({ success: true, insertedId: result.insertId }); // retorna sucesso com id inserido
} catch (error) { 
    console.error('Erro POST /api/energia:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
}
});

// endpoint para buscar leituras

app.get('/api/leituras', verificarToken, async (req, res) => { //rota GET, com middleware de verificação de token
    try {
        const [rows] = await pool.execute(
            'SELECT id, tensao, corrente, kwh, instante FROM leituras WHERE usuario_id = ? ORDER BY instante DESC LIMIT 200', // só leituras DELE, mais recente primeiro, maximo 200 registros
            [req.usuarioId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro GET /api/leituras', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
});


// iniciar servidor

const PORT = process.env.PORT || 3000;  // pega variavel de ambiente ou usa 3000
app.listen(PORT, () => { //inicia servidor na porta
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});