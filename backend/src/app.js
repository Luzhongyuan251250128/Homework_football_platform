const express = require('express');
const cors = require('cors');
const db = require('./db');
const vtime = require('./vtime');
const authRoutes = require('./routes/auth');
const matchesRoutes = require('./routes/matches');
const predictionsRoutes = require('./routes/predictions');
const postsRoutes = require('./routes/posts');
const meRoutes = require('./routes/me');
const leaderboardRoutes = require('./routes/leaderboard');
const teamsRoutes = require('./routes/teams');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { name: '世界杯/苏超赛事平台 API', docs: '/api' } });
});

app.use('/api/auth', authRoutes);
app.use('/api', matchesRoutes);
app.use('/api', predictionsRoutes);
app.use('/api', postsRoutes);
app.use('/api', meRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', teamsRoutes);
app.use('/api', usersRoutes);
app.use('/api', adminRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

async function start() {
  try {
    await db.ping();
    app.listen(require('./config').port, () => {
      console.log(`[server] 后端已启动: http://localhost:${require('./config').port}`);
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
