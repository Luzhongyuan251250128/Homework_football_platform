const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  charset: 'utf8mb4'
});

async function ping(retries = 30, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log('[db] 数据库连接成功');
      return;
    } catch (err) {
      console.log(`[db] 等待数据库连接 (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('无法连接数据库，请检查 DB 配置');
}

module.exports = pool;
module.exports.ping = ping;
