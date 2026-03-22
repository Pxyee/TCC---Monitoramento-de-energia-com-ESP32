const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = 'sua_chave_secreta_super_segura_aqui'; // ALTERE EM PRODUÇÃO!

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'sua_senha',
  database: 'energia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware para verificar JWT
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.usuarioId = decoded.id;
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: 'Token inválido' });
  }
};

// AUTENTICAÇÃO: Registrar novo usuário
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [result] = await pool.execute(
      'INSERT INTO usuarios (email, senha_hash) VALUES (?, ?)',
      [email, senhaHash]
    );

    res.json({
      success: true,
      message: 'Usuário registrado com sucesso',
      usuarioId: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, error: 'Email já registrado' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// AUTENTICAÇÃO: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
    }

    const [rows] = await pool.execute(
      'SELECT id, senha_hash FROM usuarios WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: usuario.id }, SECRET_KEY, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      usuarioId: usuario.id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// LEITURAS: Salvar leitura (requer autenticação)
app.post('/api/energia', verificarToken, async (req, res) => {
  try {
    const { tensao, corrente, kwh } = req.body;
    if (typeof tensao !== 'number' || typeof corrente !== 'number' || typeof kwh !== 'number') {
      return res.status(400).json({ success: false, error: 'tensao, corrente e kwh devem ser números' });
    }

    const [result] = await pool.execute(
      'INSERT INTO leituras (usuario_id, tensao, corrente, kwh) VALUES (?, ?, ?, ?)',
      [req.usuarioId, tensao, corrente, kwh]
    );

    res.json({ success: true, insertedId: result.insertId });
  } catch (error) {
    console.error('Erro POST /api/energia', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// LEITURAS: Buscar leituras do usuário (requer autenticação)
app.get('/api/leituras', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, tensao, corrente, kwh, instante FROM leituras WHERE usuario_id = ? ORDER BY instante DESC LIMIT 200',
      [req.usuarioId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro GET /api/leituras', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
