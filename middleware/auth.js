// =============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// Verifica se o token JWT é válido em toda
// rota que exigir login
// =============================================
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Pega o token do header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    // Verifica e decodifica o token
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user; // disponibiliza os dados do usuário na requisição
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido.' });
  }
};