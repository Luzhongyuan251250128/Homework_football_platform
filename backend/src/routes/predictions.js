const express = require('express');
const db = require('../db');
const vtime = require('../vtime');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function validScore(v) {
  return Number.isInteger(v) && v >= 0 && v <= 20;
}

async function loadMatch(matchId) {
  const [rows] = await db.query('SELECT * FROM matches WHERE id = ?', [matchId]);
  return rows[0] || null;
}

router.post('/matches/:id/predictions', authRequired, async (req, res) => {
  const matchId = Number(req.params.id);
  const { pred_home: predHome, pred_away: predAway } = req.body || {};
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  if (!validScore(predHome) || !validScore(predAway)) {
    return res.status(400).json({ code: 400, message: '预测比分需为 0~20 的整数' });
  }
  const match = await loadMatch(matchId);
  if (!match) {
    return res.status(404).json({ code: 404, message: '比赛不存在' });
  }
  const vt = await vtime.getVTime();
  if (vtime.getMatchStatus(match, vt) !== 'upcoming') {
    return res.status(409).json({ code: 409, message: '比赛已开始，无法预测' });
  }
  const [exists] = await db.query(
    'SELECT id FROM predictions WHERE match_id = ? AND user_id = ?',
    [matchId, req.user.id]
  );
  if (exists.length) {
    return res.status(409).json({ code: 409, message: '你已预测过这场比赛' });
  }
  const [result] = await db.query(
    'INSERT INTO predictions (user_id, match_id, pred_home, pred_away) VALUES (?, ?, ?, ?)',
    [req.user.id, matchId, predHome, predAway]
  );
  res.json({
    code: 0,
    message: '预测成功',
    data: { id: result.insertId, predHome, predAway, pointsAwarded: 0 }
  });
});

router.get('/matches/:id/predictions', authRequired, async (req, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const match = await loadMatch(matchId);
  if (!match) {
    return res.status(404).json({ code: 404, message: '比赛不存在' });
  }
  const [rows] = await db.query(
    `SELECT p.pred_home, p.pred_away, p.points_awarded, p.created_at,
            u.username, u.nickname, u.id AS user_id
     FROM predictions p JOIN users u ON u.id = p.user_id
     WHERE p.match_id = ? ORDER BY p.created_at ASC`,
    [matchId]
  );
  const vt = await vtime.getVTime();
  const status = vtime.getMatchStatus(match, vt);
  res.json({
    code: 0,
    message: 'ok',
    data: {
      matchId,
      status,
      homeScore: status === 'upcoming' ? null : match.home_score,
      awayScore: status === 'upcoming' ? null : match.away_score,
      predictions: rows.map((r) => ({
        userId: r.user_id,
        username: r.username,
        nickname: r.nickname || r.username,
        predHome: r.pred_home,
        predAway: r.pred_away,
        pointsAwarded: r.points_awarded,
        createdAt: vtime.fmtDate(new Date(r.created_at))
      }))
    }
  });
});

module.exports = router;
