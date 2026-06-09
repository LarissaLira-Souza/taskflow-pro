// =============================================
// ROTAS DE AUTENTICAÇÃO — login e registro
// =============================================
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../database');

// =============================================
// REGISTRO — POST /api/auth/register
// =============================================
router.post('/register', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Senha muito curta.' });
  }

  // Verifica se usuário já existe
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: 'Usuário já existe.' });
  }

  // Criptografa a senha antes de salvar
  const hash = await bcrypt.hash(password, 10);

  const result = db.prepare(
    'INSERT INTO users (username, password, name) VALUES (?, ?, ?)'
  ).run(username, hash, name);

  // Gera token JWT para o usuário já ficar logado
  const token = jwt.sign(
    { id: result.lastInsertRowid, username, name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, name, username });
});

// =============================================
// LOGIN — POST /api/auth/login
// =============================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  // Compara a senha com o hash salvo no banco
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, name: user.name, username: user.username });
});

module.exports = router;