const express = require('express');
const db = require('../db');
const vtime = require('../vtime');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

async function loadMatch(matchId) {
  const [rows] = await db.query('SELECT * FROM matches WHERE id = ?', [matchId]);
  return rows[0] || null;
}

async function loadPost(postId) {
  const [rows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
  return rows[0] || null;
}

router.get('/matches/:id/posts', async (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const match = await loadMatch(matchId);
  if (!match) {
    return res.status(404).json({ code: 404, message: '比赛不存在' });
  }
  const [posts] = await db.query(
    `SELECT p.id, p.content, p.created_at, u.username, u.nickname, u.id AS user_id
     FROM posts p JOIN users u ON u.id = p.user_id
     WHERE p.match_id = ? ORDER BY p.created_at DESC, p.id DESC`,
    [matchId]
  );
  const data = [];
  for (const post of posts) {
    const [comments] = await db.query(
      `SELECT c.id, c.content, c.parent_id, c.created_at, u.username, u.nickname, u.id AS user_id
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`,
      [post.id]
    );
    data.push({
      id: post.id,
      author: { username: post.username, nickname: post.nickname || post.username },
      content: post.content,
      createdAt: vtime.fmtDate(new Date(post.created_at)),
      comments: comments.map((c) => ({
        id: c.id,
        parentId: c.parent_id,
        author: { username: c.username, nickname: c.nickname || c.username },
        content: c.content,
        createdAt: vtime.fmtDate(new Date(c.created_at))
      }))
    });
  }
  res.json({ code: 0, message: 'ok', data });
});

router.post('/matches/:id/posts', authRequired, async (req, res) => {
  const matchId = Number(req.params.id);
  const { content } = req.body || {};
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const text = String(content || '').trim();
  if (!text || text.length < 2 || text.length > 500) {
    return res.status(400).json({ code: 400, message: '帖子内容需为 2~500 个字符' });
  }
  const match = await loadMatch(matchId);
  if (!match) {
    return res.status(404).json({ code: 404, message: '比赛不存在' });
  }
  const vt = await vtime.getVTime();
  if (vtime.getMatchStatus(match, vt) !== 'finished') {
    return res.status(409).json({ code: 409, message: '比赛结束后才可参与讨论' });
  }
  const [result] = await db.query(
    'INSERT INTO posts (match_id, user_id, content) VALUES (?, ?, ?)',
    [matchId, req.user.id, text]
  );
  res.json({
    code: 0,
    message: '发帖成功',
    data: {
      id: result.insertId,
      author: { username: req.user.username, nickname: req.user.username },
      content: text,
      createdAt: vtime.fmtDate(new Date()),
      comments: []
    }
  });
});

router.get('/posts/:id/comments', async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const post = await loadPost(postId);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  const [rows] = await db.query(
    `SELECT c.id, c.content, c.parent_id, c.created_at, u.username, u.nickname, u.id AS user_id
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`,
    [postId]
  );
  res.json({
    code: 0,
    message: 'ok',
    data: rows.map((c) => ({
      id: c.id,
      parentId: c.parent_id,
      author: { username: c.username, nickname: c.nickname || c.username },
      content: c.content,
      createdAt: vtime.fmtDate(new Date(c.created_at))
    }))
  });
});

router.post('/posts/:id/comments', authRequired, async (req, res) => {
  const postId = Number(req.params.id);
  const { content, parent_id: parentId } = req.body || {};
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const text = String(content || '').trim();
  if (!text || text.length > 300) {
    return res.status(400).json({ code: 400, message: '评论内容需为 1~300 个字符' });
  }
  const post = await loadPost(postId);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  let parent = null;
  if (parentId !== undefined && parentId !== null) {
    const pid = Number(parentId);
    if (!Number.isInteger(pid) || pid <= 0) {
      return res.status(400).json({ code: 400, message: '参数错误' });
    }
    const [rows] = await db.query(
      'SELECT * FROM comments WHERE id = ? AND post_id = ?',
      [pid, postId]
    );
    if (!rows.length) {
      return res.status(400).json({ code: 400, message: '被回复的评论不存在或不属于该帖子' });
    }
    if (rows[0].parent_id !== null) {
      return res.status(400).json({ code: 400, message: '只支持回复顶层评论' });
    }
    parent = rows[0];
  }
  const [result] = await db.query(
    'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
    [postId, req.user.id, parent ? parent.id : null, text]
  );
  res.json({
    code: 0,
    message: '评论成功',
    data: {
      id: result.insertId,
      parentId: parent ? parent.id : null,
      author: { username: req.user.username, nickname: req.user.username },
      content: text,
      createdAt: vtime.fmtDate(new Date())
    }
  });
});

module.exports = router;
