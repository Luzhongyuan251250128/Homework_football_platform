const express = require('express');
const db = require('../db');
const vtime = require('../vtime');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const STATUS_TEXT = { upcoming: '未开赛', live: '进行中', finished: '已完赛' };
const LEAGUE_TEXT = { world_cup: '世界杯', spl: '苏超' };

function decorate(match, vt, predCount) {
  const status = vtime.getMatchStatus(match, vt);
  const isUpcoming = status === 'upcoming';
  return {
    id: match.id,
    league: match.league,
    leagueText: LEAGUE_TEXT[match.league],
    season: match.season,
    round: match.round,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    matchTime: vtime.fmtDate(new Date(match.match_time)),
    duration: match.duration,
    status,
    statusText: STATUS_TEXT[status],
    homeScore: isUpcoming ? null : match.home_score,
    awayScore: isUpcoming ? null : match.away_score,
    predictionCount: predCount || 0,
    settled: !!match.settled
  };
}

router.get('/time', async (req, res) => {
  res.json({ code: 0, message: 'ok', data: { virtualTime: await vtime.getVTimeStr() } });
});

router.get('/matches', async (req, res) => {
  const { league, status } = req.query;
  const conditions = [];
  const params = [];
  if (league === 'world_cup' || league === 'spl') {
    conditions.push('league = ?');
    params.push(league);
  }
  let where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [matches] = await db.query(
    `SELECT * FROM matches ${where} ORDER BY match_time ASC, id ASC`,
    params
  );
  const [counts] = await db.query(
    'SELECT match_id, COUNT(*) AS n FROM predictions GROUP BY match_id'
  );
  const countMap = {};
  counts.forEach((c) => { countMap[c.match_id] = c.n; });

  const vt = await vtime.getVTime();
  let list = matches.map((m) => decorate(m, vt, countMap[m.id]));
  if (status === 'upcoming' || status === 'live' || status === 'finished') {
    list = list.filter((m) => m.status === status);
  }
  res.json({ code: 0, message: 'ok', data: { virtualTime: vtime.fmtDate(vt), matches: list } });
});

router.get('/matches/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ code: 400, message: '参数错误' });
  }
  const [rows] = await db.query('SELECT * FROM matches WHERE id = ?', [id]);
  if (!rows.length) {
    return res.status(404).json({ code: 404, message: '比赛不存在' });
  }
  const match = rows[0];
  const vt = await vtime.getVTime();

  const [counts] = await db.query(
    'SELECT match_id, COUNT(*) AS n FROM predictions WHERE match_id = ? GROUP BY match_id',
    [id]
  );
  const [distRows] = await db.query(
    `SELECT CONCAT(pred_home, '-', pred_away) AS score, COUNT(*) AS n
     FROM predictions WHERE match_id = ? GROUP BY score ORDER BY n DESC, score ASC LIMIT 8`,
    [id]
  );

  const data = decorate(match, vt, counts[0] ? counts[0].n : 0);
  data.scoreDistribution = distRows.map((d) => ({ score: d.score, count: d.n }));

  if (req.user) {
    const [mine] = await db.query(
      'SELECT * FROM predictions WHERE match_id = ? AND user_id = ?',
      [id, req.user.id]
    );
    data.myPrediction = mine.length
      ? { predHome: mine[0].pred_home, predAway: mine[0].pred_away, pointsAwarded: mine[0].points_awarded }
      : null;
  }
  res.json({ code: 0, message: 'ok', data });
});

module.exports = router;
module.exports.STATUS_TEXT = STATUS_TEXT;
module.exports.LEAGUE_TEXT = LEAGUE_TEXT;
module.exports.decorate = decorate;
