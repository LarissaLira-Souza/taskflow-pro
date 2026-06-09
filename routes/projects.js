// =============================================
// ROTAS DE PROJETOS
// =============================================
const express = require('express');
const router  = express.Router();
const db      = require('../database');
const auth    = require('../middleware/auth');

// Todas as rotas exigem login
router.use(auth);

// =============================================
// LISTAR projetos do usuário — GET /api/projects
// =============================================
router.get('/', (req, res) => {
  const projects = db.prepare(`
    SELECT p.*,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(req.user.id);

  res.json(projects);
});

// =============================================
// CRIAR projeto — POST /api/projects
// =============================================
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });

  const result = db.prepare(
    'INSERT INTO projects (name, user_id) VALUES (?, ?)'
  ).run(name, req.user.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?')
    .get(result.lastInsertRowid);

  res.json(project);
});

// =============================================
// EXCLUIR projeto — DELETE /api/projects/:id
// =============================================
router.delete('/:id', (req, res) => {
  const project = db.prepare(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

  // Deleta arquivos das tarefas do projeto
  db.prepare(`
    DELETE FROM files WHERE task_id IN (
      SELECT id FROM tasks WHERE project_id = ?
    )
  `).run(project.id);

  // Deleta as tarefas do projeto
  db.prepare('DELETE FROM tasks WHERE project_id = ?').run(project.id);

  // Deleta o projeto
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);

  res.json({ success: true });
});

module.exports = router;