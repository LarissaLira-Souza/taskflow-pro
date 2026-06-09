// =============================================
// BANCO DE DADOS — SQLite
// Cria as tabelas automaticamente se não existirem
// =============================================
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria (ou abre) o arquivo do banco de dados
const db = new Database(path.join(__dirname, 'taskflow.db'));

// Ativa WAL mode — deixa o banco mais rápido
db.pragma('journal_mode = WAL');

// =============================================
// CRIAÇÃO DAS TABELAS
// =============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    name      TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    user_id    INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    project_id INTEGER,
    priority   TEXT DEFAULT 'med',
    status     TEXT DEFAULT 'todo',
    user_id    INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id)    REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    INTEGER NOT NULL,
    filename   TEXT NOT NULL,
    originalname TEXT NOT NULL,
    mimetype   TEXT NOT NULL,
    size       INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );
`);

module.exports = db;