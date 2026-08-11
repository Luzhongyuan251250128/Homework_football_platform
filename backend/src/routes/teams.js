const express = require('express');
const db = require('../db');
const vtime = require('../vtime');
const { authRequired, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const LEAGUE_TEXT = { world_cup: '世界杯', spl: '苏超' };

async function loadTeamByName(name) {
  const [rows] = await db.query('SELECT * FROM teams WHERE name = ?', [name]);
  return rows[0] || null;
}

function matchResult(match, teamName, vt) {
  const status = vtime.getMatchStatus(match, vt);
  if (status !== 'finished') return null;
  const isHome = match.home_team === teamName;
  const diff = match.home_score - match.away_score;
  if (diff === 0) return 'draw';
  return (isHome && diff > 0) || (!isHome && diff < 0) ? 'win' : 'loss';
}

router.get('/teams/:name', optionalAuth, async (req, res) => {
  const team = await loadTeamByName(req.params.name);
  if (!team) {
    return res.status(404).json({ code: 404, message: '球队不存在' });
  }
  const vt = await vtime.getVTime();

  const [rows] = await db.query(
    `SELECT * FROM matches WHERE home_team = ? OR away_team = ? ORDER BY match_time ASC, id ASC`,
    [team.name, team.name]
  );

  let played = 0, wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  const matches = rows.map((m) => {
    const status = vtime.getMatchStatus(m, vt);
    const isHome = m.home_team === team.name;
    const result = matchResult(m, team.name, vt);
    if (status === 'finished') {
      played++;
      if (result === 'win') wins++;
      else if (result === 'draw') draws++;
      else losses++;
      goalsFor += isHome ? m.home_score : m.away_score;
      goalsAgainst += isHome ? m.away_score : m.home_score;
    }
    return {
      matchId: m.id,
      round: m.round,
      matchTime: vtime.fmtDate(new Date(m.match_time)),
      status,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: status === 'upcoming' ? null : m.home_score,
      awayScore: status === 'upcoming' ? null : m.away_score,
      result
    };
  });

  const data = {
    team: {
      id: team.id,
      name: team.name,
      league: team.league,
      leagueText: LEAGUE_TEXT[team.league],
      type: team.type,
      description: team.description
    },
    record: {
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      winRate: played ? Number(((wins / played) * 100).toFixed(1)) : 0
    },
    matches
  };

  const [heatRows] = await db.query(
    `SELECT COUNT(*) AS n FROM predictions p
     JOIN matches m ON m.id = p.match_id
     WHERE m.home_team = ? OR m.away_team = ?`,
    [team.name, team.name]
  );
  data.heat = { totalPredictions: heatRows[0].n };

  if (req.user) {
    const [mine] = await db.query(
      `SELECT p.id, p.match_id, p.pred_home, p.pred_away, p.points_awarded,
              m.round, m.match_time, m.home_team, m.away_team, m.home_score, m.away_score
       FROM predictions p JOIN matches m ON m.id = p.match_id
       WHERE p.user_id = ? AND (m.home_team = ? OR m.away_team = ?)
       ORDER BY m.match_time ASC, p.id ASC`,
      [req.user.id, team.name, team.name]
    );
    let exact = 0, correct = 0, wrong = 0, pointsEarned = 0;
    const predictions = mine.map((r) => {
      const status = vtime.getMatchStatus(r, vt);
      const settled = status === 'finished';
      if (settled) {
        pointsEarned += r.points_awarded;
        if (r.points_awarded === 3) exact++;
        else if (r.points_awarded === 1) correct++;
        else wrong++;
      }
      return {
        id: r.id,
        matchId: r.match_id,
        round: r.round,
        matchTime: vtime.fmtDate(new Date(r.match_time)),
        status,
        homeTeam: r.home_team,
        awayTeam: r.away_team,
        predHome: r.pred_home,
        predAway: r.pred_away,
        homeScore: status === 'upcoming' ? null : r.home_score,
        awayScore: status === 'upcoming' ? null : r.away_score,
        pointsAwarded: settled ? r.points_awarded : null
      };
    });
    data.myPredictions = {
      list: predictions,
      stats: {
        total: predictions.length,
        settled: exact + correct + wrong,
        exact,
        correct,
        wrong,
        pointsEarned
      }
    };
  }
  res.json({ code: 0, message: 'ok', data });
});

router.get('/teams/:name/comments', async (req, res) => {
  const team = await loadTeamByName(req.params.name);
  if (!team) {
    return res.status(404).json({ code: 404, message: '球队不存在' });
  }
  const [rows] = await db.query(
    `SELECT tc.id, tc.team_id, tc.parent_id, tc.content, tc.created_at,
            u.username, u.nickname, u.id AS user_id
     FROM team_comments tc JOIN users u ON u.id = tc.user_id
     WHERE tc.team_id = ? ORDER BY tc.created_at ASC, tc.id ASC`,
    [team.id]
  );
  res.json({
    code: 0,
    message: 'ok',
    data: rows.map((c) => ({
      id: c.id,
      teamId: c.team_id,
      parentId: c.parent_id,
      author: { username: c.username, nickname: c.nickname || c.username },
      content: c.content,
      createdAt: vtime.fmtDate(new Date(c.created_at))
    }))
  });
});

router.post('/teams/:name/comments', authRequired, async (req, res) => {
  const team = await loadTeamByName(req.params.name);
  if (!team) {
    return res.status(404).json({ code: 404, message: '球队不存在' });
  }
  const { content, parent_id: parentId } = req.body || {};
  const text = String(content || '').trim();
  if (!text || text.length > 300) {
    return res.status(400).json({ code: 400, message: '评论内容需为 1~300 个字符' });
  }
  let parent = null;
  if (parentId !== undefined && parentId !== null) {
    const pid = Number(parentId);
    if (!Number.isInteger(pid) || pid <= 0) {
      return res.status(400).json({ code: 400, message: '参数错误' });
    }
    const [rows] = await db.query(
      'SELECT * FROM team_comments WHERE id = ? AND team_id = ?',
      [pid, team.id]
    );
    if (!rows.length) {
      return res.status(400).json({ code: 400, message: '被回复的评论不存在或不属于该球队' });
    }
    if (rows[0].parent_id !== null) {
      return res.status(400).json({ code: 400, message: '只支持回复顶层评论' });
    }
    parent = rows[0];
  }
  const [result] = await db.query(
    'INSERT INTO team_comments (team_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
    [team.id, req.user.id, parent ? parent.id : null, text]
  );
  res.json({
    code: 0,
    message: '评价成功',
    data: {
      id: result.insertId,
      teamId: team.id,
      parentId: parent ? parent.id : null,
      author: { username: req.user.username, nickname: req.user.username },
      content: text,
      createdAt: vtime.fmtDate(new Date())
    }
  });
});

module.exports = router;
