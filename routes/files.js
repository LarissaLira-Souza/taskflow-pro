// =============================================
// ROTAS DE UPLOAD DE ARQUIVOS
// =============================================
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database');
const auth    = require('../middleware/auth');

router.use(auth);

// =============================================
// CONFIGURAÇÃO DO MULTER (onde salvar arquivos)
// =============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Nome único: timestamp + nome original
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// Permite apenas imagens e PDFs
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
  limits: { fileSize: 10 * 1024 * 1024 } // máximo 10MB
});

// =============================================
// UPLOAD — POST /api/files/:taskId
// =============================================
router.post('/:taskId', upload.single('file'), (req, res) => {
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(req.params.taskId, req.user.id);

  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  const result = db.prepare(`
    INSERT INTO files (task_id, filename, originalname, mimetype, size)
    VALUES (?, ?, ?, ?, ?)
  `).run(task.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(result.lastInsertRowid);
  res.json(file);
});

// =============================================
// LISTAR arquivos de uma tarefa — GET /api/files/:taskId
// =============================================
router.get('/:taskId', (req, res) => {
  const files = db.prepare(
    'SELECT * FROM files WHERE task_id = ? ORDER BY uploaded_at DESC'
  ).all(req.params.taskId);
  res.json(files);
});

// =============================================
// DELETAR arquivo — DELETE /api/files/:id
// =============================================
router.delete('/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'Arquivo não encontrado.' });

  // Remove o arquivo físico do disco
  const filePath = path.join(__dirname, '..', 'uploads', file.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  res.json({ success: true });
});

module.exports = router;