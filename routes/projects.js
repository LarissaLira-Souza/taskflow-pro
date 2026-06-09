const express = require('express');
const router  = express.Router();
const db      = require('../database');
const auth    = require('../middleware/auth');

router.use(auth);

// LISTAR projetos
router.get('/', async (req, res) => {
  const result = await db.execute({
    sql: `SELECT p.*,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
    args: [req.user.id]
  });
  res.json(result.rows);
});

// CRIAR projeto
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });

  const result = await db.execute({
    sql: 'INSERT INTO projects (name, user_id) VALUES (?, ?)',
    args: [name, req.user.id]
  });

  const project = await db.execute({
    sql: 'SELECT * FROM projects WHERE id = ?',
    args: [result.lastInsertRowid]
  });

  res.json(project.rows[0]);
});

// EXCLUIR projeto
router.delete('/:id', async (req, res) => {
  const project = await db.execute({
    sql: 'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.user.id]
  });

  if (!project.rows[0])
    return res.status(404).json({ error: 'Projeto não encontrado.' });

  await db.execute({
    sql: `DELETE FROM files WHERE task_id IN (
      SELECT id FROM tasks WHERE project_id = ?)`,
    args: [req.params.id]
  });

  await db.execute({
    sql: 'DELETE FROM tasks WHERE project_id = ?',
    args: [req.params.id]
  });

  await db.execute({
    sql: 'DELETE FROM projects WHERE id = ?',
    args: [req.params.id]
  });

  res.json({ success: true });
});

module.exports = router;