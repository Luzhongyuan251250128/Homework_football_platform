const express = require('express');
const db = require('../db');
const vtime = require('../vtime');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/me/predictions', authRequired, async (req, res) => {
  const vt = await vtime.getVTime();
  const [rows] = await db.query(
    `SELECT p.id, p.match_id, p.pred_home, p.pred_away, p.points_awarded, p.created_at,
            m.league, m.round, m.home_team, m.away_team, m.match_time, m.duration,
            m.home_score, m.away_score
     FROM predictions p JOIN matches m ON m.id = p.match_id
     WHERE p.user_id = ? ORDER BY m.match_time ASC, p.id ASC`,
    [req.user.id]
  );
  res.json({
    code: 0,
    message: 'ok',
    data: rows.map((r) => {
      const status = vtime.getMatchStatus(r, vt);
      return {
        id: r.id,
        matchId: r.match_id,
        league: r.league,
        round: r.round,
        homeTeam: r.home_team,
        awayTeam: r.away_team,
        matchTime: vtime.fmtDate(new Date(r.match_time)),
        status,
        predHome: r.pred_home,
        predAway: r.pred_away,
        homeScore: status === 'upcoming' ? null : r.home_score,
        awayScore: status === 'upcoming' ? null : r.away_score,
        pointsAwarded: r.points_awarded,
        predictedAt: vtime.fmtDate(new Date(r.created_at))
      };
    })
  });
});

router.get('/me/points', authRequired, async (req, res) => {
  const [users] = await db.query('SELECT points FROM users WHERE id = ?', [req.user.id]);
  if (!users.length) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  const [stats] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN points_awarded = 3 THEN 1 ELSE 0 END) AS exact,
       SUM(CASE WHEN points_awarded = 1 THEN 1 ELSE 0 END) AS correct,
       SUM(CASE WHEN points_awarded = 0 THEN 1 ELSE 0 END) AS wrong
     FROM predictions WHERE user_id = ?`,
    [req.user.id]
  );
  const s = stats[0] || {};
  res.json({
    code: 0,
    message: 'ok',
    data: {
      total: users[0].points,
      stats: {
        totalPredictions: s.total || 0,
        exact: s.exact || 0,
        correct: s.correct || 0,
        wrong: s.wrong || 0
      }
    }
  });
});

module.exports = router;
