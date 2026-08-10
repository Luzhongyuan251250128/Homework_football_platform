const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret, jwtExpiresIn } = require('../config');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    role: u.role,
    points: u.points,
    createdAt: u.created_at
  };
}

router.post('/register', async (req, res) => {
  const { username, password, nickname } = req.body || {};
  const name = String(username || '').trim();
  const nick = String(nickname || '').trim() || name;

  if (!name || name.length < 2 || name.length > 20) {
    return res.status(400).json({ code: 400, message: '用户名长度需为 2~20 个字符' });
  }
  if (!password || String(password).length < 6 || String(password).length > 50) {
    return res.status(400).json({ code: 400, message: '密码长度需为 6~50 个字符' });
  }
  const [exists] = await db.query('SELECT id FROM users WHERE username = ?', [name]);
  if (exists.length) {
    return res.status(409).json({ code: 409, message: '用户名已被占用' });
  }
  const hash = await bcrypt.hash(String(password), 10);
  const [result] = await db.query(
    'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
    [name, hash, nick]
  );
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  res.json({ code: 0, message: '注册成功', data: publicUser(rows[0]) });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '请输入用户名和密码' });
  }
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [String(username).trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
  res.json({ code: 0, message: '登录成功', data: { token, user: publicUser(user) } });
});

router.get('/me', authRequired, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  res.json({ code: 0, message: 'ok', data: publicUser(rows[0]) });
});

module.exports = router;
