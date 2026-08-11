const express = require('express');
const db = require('../db');
const vtime = require('../vtime');

const router = express.Router();

router.get('/users/:id/predictions', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (!users.length) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  const user = users[0];
  const vt = await vtime.getVTime();

  const [rows] = await db.query(
    `SELECT p.id, p.match_id, p.pred_home, p.pred_away, p.points_awarded, p.created_at,
            m.league, m.round, m.home_team, m.away_team, m.match_time, m.duration, m.home_score, m.away_score, m.settled
     FROM predictions p JOIN matches m ON m.id = p.match_id
     WHERE p.user_id = ? ORDER BY m.match_time ASC, p.id ASC`,
    [userId]
  );

  let settled = 0;
  let exact = 0;
  let correct = 0;
  let wrong = 0;
  const predictions = rows.map((r) => {
    const status = vtime.getMatchStatus(r, vt);
    const hasResult = status === 'finished' && !!r.settled;
    if (hasResult) {
      settled++;
      if (r.points_awarded === 3) exact++;
      else if (r.points_awarded === 1) correct++;
      else wrong++;
    }
    return {
      id: r.id,
      matchId: r.match_id,
      league: r.league,
      round: r.round,
      matchTime: vtime.fmtDate(new Date(r.match_time)),
      status,
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      predHome: r.pred_home,
      predAway: r.pred_away,
      homeScore: status === 'upcoming' ? null : r.home_score,
      awayScore: status === 'upcoming' ? null : r.away_score,
      pointsAwarded: hasResult ? r.points_awarded : null,
      predictedAt: vtime.fmtDate(new Date(r.created_at))
    };
  });

  res.json({
    code: 0,
    message: 'ok',
    data: {
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        role: user.role,
        points: user.points
      },
      stats: {
        total: predictions.length,
        settled,
        exact,
        correct,
        wrong,
        pointsEarned: exact * 3 + correct
      },
      predictions
    }
  });
});

module.exports = router;
