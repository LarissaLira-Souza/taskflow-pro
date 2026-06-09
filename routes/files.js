const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database');
const auth    = require('../middleware/auth');

router.use(auth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// UPLOAD
router.post('/:taskId', upload.single('file'), async (req, res) => {
  const task = await db.execute({
    sql: 'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    args: [req.params.taskId, req.user.id]
  });

  if (!task.rows[0]) return res.status(404).json({ error: 'Tarefa não encontrada.' });
  if (!req.file)     return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  const result = await db.execute({
    sql: 'INSERT INTO files (task_id, filename, originalname, mimetype, size) VALUES (?, ?, ?, ?, ?)',
    args: [req.params.taskId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
  });

  const file = await db.execute({
    sql: 'SELECT * FROM files WHERE id = ?',
    args: [result.lastInsertRowid]
  });

  res.json(file.rows[0]);
});

// LISTAR arquivos
router.get('/:taskId', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM files WHERE task_id = ? ORDER BY uploaded_at DESC',
    args: [req.params.taskId]
  });
  res.json(result.rows);
});

// DELETAR arquivo
router.delete('/:id', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM files WHERE id = ?',
    args: [req.params.id]
  });

  const file = result.rows[0];
  if (!file) return res.status(404).json({ error: 'Arquivo não encontrado.' });

  const filePath = path.join(__dirname, '..', 'uploads', file.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.execute({
    sql: 'DELETE FROM files WHERE id = ?',
    args: [req.params.id]
  });

  res.json({ success: true });
});

module.exports = router;