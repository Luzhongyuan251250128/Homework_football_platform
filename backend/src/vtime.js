const db = require('./db');

const FAN_USERS = ['绿茵漫步者', '看台第12人', '战术大师', '越位陷阱'];

const POST_TEMPLATES = [
  '{home} 这场踢得真精彩，最后的结果没想到！',
  '{away} 客场作战还能拿下，韧劲十足！',
  '恭喜{home}！这场赢得漂亮，实力确实更强。',
  '{home} 和 {away} 的较量太刺激了，下轮继续看！'
];

const COMMENT_TEMPLATES = [
  '预测应验了，哈哈',
  '可惜{away}最后差一点点',
  '{home} 今天把握机会能力太强了',
  '这场裁判吹得还行',
  '两队都很拼，比分算是公平的结果',
  '看完直接后悔没来现场',
  '下轮预测已经写好了'
];

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function getVTime() {
  const [rows] = await db.query('SELECT virtual_time FROM settings WHERE id = 1');
  if (!rows.length) throw new Error('settings 表缺少虚拟时间配置');
  return new Date(rows[0].virtual_time);
}

async function getVTimeStr() {
  const [rows] = await db.query('SELECT virtual_time FROM settings WHERE id = 1');
  if (!rows.length) throw new Error('settings 表缺少虚拟时间配置');
  return fmtDate(new Date(rows[0].virtual_time));
}

async function setVTime(date) {
  await db.query('UPDATE settings SET virtual_time = ? WHERE id = 1', [date]);
}

function getMatchStatus(match, vtime) {
  const start = new Date(match.match_time);
  const end = new Date(start.getTime() + match.duration * 60000);
  if (vtime < start) return 'upcoming';
  if (vtime < end) return 'live';
  return 'finished';
}

function getMatchEnd(match) {
  return new Date(new Date(match.match_time).getTime() + match.duration * 60000);
}

function calcPoints(match, pred) {
  if (match.home_score === null || match.away_score === null) return 0;
  if (pred.pred_home === match.home_score && pred.pred_away === match.away_score) return 3;
  const actual = Math.sign(match.home_score - match.away_score);
  const guessed = Math.sign(pred.pred_home - pred.pred_away);
  return actual === guessed ? 1 : 0;
}

async function generateMatchContent(match) {
  const [existing] = await db.query('SELECT COUNT(*) AS n FROM posts WHERE match_id = ?', [match.id]);
  if (existing[0].n > 0) return 0;

  const [fans] = await db.query(
    'SELECT id, username FROM users WHERE username IN (?, ?, ?, ?) ORDER BY id',
    FAN_USERS
  );
  if (!fans.length) return 0;

  const author = fans[match.id % fans.length];
  const postText = POST_TEMPLATES[match.id % POST_TEMPLATES.length]
    .replace(/\{home\}/g, match.home_team)
    .replace(/\{away\}/g, match.away_team);

  const [postRes] = await db.query(
    'INSERT INTO posts (match_id, user_id, content) VALUES (?, ?, ?)',
    [match.id, author.id, postText]
  );
  const postId = postRes.insertId;

  for (let i = 0; i < 2; i++) {
    const fan = fans[(match.id + i + 1) % fans.length];
    const text = COMMENT_TEMPLATES[(match.id * 2 + i) % COMMENT_TEMPLATES.length]
      .replace(/\{home\}/g, match.home_team)
      .replace(/\{away\}/g, match.away_team);
    await db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, fan.id, text]
    );
  }
  return 1;
}

async function settleDueMatches() {
  const vtime = await getVTime();
  const [rows] = await db.query(
    `SELECT * FROM matches
     WHERE settled = 0 AND DATE_ADD(match_time, INTERVAL duration MINUTE) <= ?`,
    [fmtDate(vtime)]
  );

  let settledCount = 0;
  let postCount = 0;
  for (const match of rows) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [preds] = await conn.query(
        'SELECT * FROM predictions WHERE match_id = ?',
        [match.id]
      );
      for (const p of preds) {
        const pts = calcPoints(match, p);
        await conn.query('UPDATE predictions SET points_awarded = ? WHERE id = ?', [pts, p.id]);
        if (pts > 0) {
          await conn.query('UPDATE users SET points = points + ? WHERE id = ?', [pts, p.user_id]);
        }
      }
      await conn.query('UPDATE matches SET settled = 1 WHERE id = ?', [match.id]);
      await conn.commit();
      settledCount++;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    postCount += await generateMatchContent(match);
  }
  return { settled: settledCount, generatedPosts: postCount };
}

module.exports = {
  FAN_USERS,
  getVTime,
  getVTimeStr,
  setVTime,
  getMatchStatus,
  getMatchEnd,
  calcPoints,
  settleDueMatches,
  fmtDate
};
