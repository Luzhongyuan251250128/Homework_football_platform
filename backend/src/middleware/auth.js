const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ code: 401, message: '请先登录' });
  }
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, jwtSecret);
    } catch (err) {
      /* 忽略无效 token */
    }
  }
  next();
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无管理员权限' });
    }
    next();
  });
}

module.exports = { authRequired, optionalAuth, adminRequired };
