module.exports = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'football_db',
    waitForConnections: true,
    connectionLimit: 10
  },
  jwtSecret: process.env.JWT_SECRET || 'football-platform-secret-2026',
  jwtExpiresIn: '7d'
};
