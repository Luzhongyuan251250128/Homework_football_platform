const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/leaderboard', optionalAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.nickname, u.points,
            COUNT(p.id) AS total_predictions,
            COALESCE(SUM(CASE WHEN m.settled = 1 THEN 1 ELSE 0 END), 0) AS settled_count,
            COALESCE(SUM(CASE WHEN p.points_awarded = 3 THEN 1 ELSE 0 END), 0) AS exact_count,
            COALESCE(SUM(CASE WHEN p.points_awarded = 1 THEN 1 ELSE 0 END), 0) AS correct_count
     FROM users u
     JOIN predictions p ON p.user_id = u.id
     JOIN matches m ON m.id = p.match_id
     WHERE u.role = 'user'
     GROUP BY u.id
     ORDER BY u.points DESC, exact_count DESC, u.id ASC`
  );

  let rank = 0;
  let prevPoints = null;
  const list = rows.map((r, i) => {
    if (prevPoints === null || r.points !== prevPoints) {
      rank = i + 1;
      prevPoints = r.points;
    }
    return {
      rank,
      userId: r.id,
      username: r.username,
      nickname: r.nickname || r.username,
      points: r.points,
      totalPredictions: r.total_predictions,
      settledCount: r.settled_count,
      exactCount: r.exact_count,
      correctCount: r.correct_count
    };
  });

  const data = { leaderboard: list };
  if (req.user) {
    data.myRank = list.find((x) => x.userId === req.user.id) || null;
  }
  res.json({ code: 0, message: 'ok', data });
});

module.exports = router;
