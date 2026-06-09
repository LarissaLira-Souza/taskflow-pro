// =============================================
// SERVIDOR PRINCIPAL — TaskFlow Pro
// =============================================
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// =============================================
// MIDDLEWARES GLOBAIS
// =============================================
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos da pasta public (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Serve arquivos enviados pelos usuários
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================================
// ROTAS DA API
// =============================================
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/files',    require('./routes/files'));

// Qualquer outra rota serve o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================
// INICIA O SERVIDOR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ TaskFlow Pro rodando em http://localhost:${PORT}`);
});