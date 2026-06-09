// =============================================
// ROTAS DE TAREFAS
// =============================================
const express = require('express');
const router  = express.Router();
const db      = require('../database');
const auth    = require('../middleware/auth');

// Todas as rotas exigem login
router.use(auth);

// =============================================
// LISTAR tarefas — GET /api/tasks
// =============================================
router.get('/', (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id);

  res.json(tasks);
});

// =============================================
// CRIAR tarefa — POST /api/tasks
// =============================================
router.post('/', (req, res) => {
  const { name, project_id, priority } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });

  const result = db.prepare(`
    INSERT INTO tasks (name, project_id, priority, user_id)
    VALUES (?, ?, ?, ?)
  `).run(name, project_id || null, priority || 'med', req.user.id);

  const task = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.json(task);
});

// =============================================
// ATUALIZAR tarefa — PUT /api/tasks/:id
// =============================================
router.put('/:id', (req, res) => {
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

  const { name, status, priority, project_id } = req.body;

  db.prepare(`
    UPDATE tasks SET
      name       = COALESCE(?, name),
      status     = COALESCE(?, status),
      priority   = COALESCE(?, priority),
      project_id = COALESCE(?, project_id)
    WHERE id = ?
  `).run(name, status, priority, project_id, task.id);

  const updated = db.prepare(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(task.id);

  res.json(updated);
});

// =============================================
// EXCLUIR tarefa — DELETE /api/tasks/:id
// =============================================
router.delete('/:id', (req, res) => {
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

  // Deleta arquivos da tarefa primeiro
  db.prepare('DELETE FROM files WHERE task_id = ?').run(task.id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);

  res.json({ success: true });
});

module.exports = router;