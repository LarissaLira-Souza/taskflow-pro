const express = require('express');
const router  = express.Router();
const db      = require('../database');
const auth    = require('../middleware/auth');

router.use(auth);

// LISTAR tarefas
router.get('/', async (req, res) => {
  const result = await db.execute({
    sql: `SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC`,
    args: [req.user.id]
  });
  res.json(result.rows);
});

// CRIAR tarefa
router.post('/', async (req, res) => {
  const { name, project_id, priority } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });

  const result = await db.execute({
    sql: 'INSERT INTO tasks (name, project_id, priority, user_id) VALUES (?, ?, ?, ?)',
    args: [name, project_id || null, priority || 'med', req.user.id]
  });

  const task = await db.execute({
    sql: `SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?`,
    args: [result.lastInsertRowid]
  });

  res.json(task.rows[0]);
});

// ATUALIZAR tarefa
router.put('/:id', async (req, res) => {
  const task = await db.execute({
    sql: 'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.user.id]
  });

  if (!task.rows[0])
    return res.status(404).json({ error: 'Tarefa não encontrada.' });

  const { name, status, priority, project_id } = req.body;

  await db.execute({
    sql: `UPDATE tasks SET
      name       = COALESCE(?, name),
      status     = COALESCE(?, status),
      priority   = COALESCE(?, priority),
      project_id = COALESCE(?, project_id)
      WHERE id = ?`,
    args: [name||null, status||null, priority||null, project_id||null, req.params.id]
  });

  const updated = await db.execute({
    sql: `SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?`,
    args: [req.params.id]
  });

  res.json(updated.rows[0]);
});

// EXCLUIR tarefa
router.delete('/:id', async (req, res) => {
  const task = await db.execute({
    sql: 'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.user.id]
  });

  if (!task.rows[0])
    return res.status(404).json({ error: 'Tarefa não encontrada.' });

  await db.execute({
    sql: 'DELETE FROM files WHERE task_id = ?',
    args: [req.params.id]
  });

  await db.execute({
    sql: 'DELETE FROM tasks WHERE id = ?',
    args: [req.params.id]
  });

  res.json({ success: true });
});

module.exports = router;