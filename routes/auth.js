const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../database');

// REGISTRO
router.post('/register', async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name)
    return res.status(400).json({ error: 'Preencha todos os campos.' });

  if (password.length < 4)
    return res.status(400).json({ error: 'Senha muito curta.' });

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: [username]
  });

  if (existing.rows.length > 0)
    return res.status(400).json({ error: 'Usuário já existe.' });

  const hash = await bcrypt.hash(password, 10);

  const result = await db.execute({
    sql: 'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
    args: [username, hash, name]
  });

  const token = jwt.sign(
    { id: Number(result.lastInsertRowid), username, name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, name, username });
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Preencha todos os campos.' });

  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [username]
  });

  const user = result.rows[0];
  if (!user)
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

  const token = jwt.sign(
    { id: Number(user.id), username: user.username, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, name: user.name, username: user.username });
});

module.exports = router;