-- ============================================================
-- 世界杯/苏超赛事信息与互动预测平台 — 数据库初始化脚本
-- 在 MySQL 容器首次启动时由 /docker-entrypoint-initdb.d/ 自动执行
-- ============================================================

CREATE DATABASE IF NOT EXISTS football_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE football_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;

-- ------------------------------------------------------------
-- 1. settings：虚拟时间（单行，id 恒为 1）
-- ------------------------------------------------------------
CREATE TABLE settings (
  id           INT PRIMARY KEY,
  virtual_time DATETIME NOT NULL COMMENT '虚拟当前时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. users：用户
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL UNIQUE COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希',
  nickname      VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '昵称',
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  points        INT NOT NULL DEFAULT 0 COMMENT '累计积分',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. matches：比赛（比分预置，未开赛时 API 隐藏）
-- ------------------------------------------------------------
CREATE TABLE matches (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  league     ENUM('world_cup','spl') NOT NULL COMMENT 'world_cup=世界杯 spl=苏超(江苏省城市足球联赛)',
  season     VARCHAR(20) NOT NULL COMMENT '赛季',
  round      VARCHAR(50) NOT NULL COMMENT '轮次/小组',
  home_team  VARCHAR(50) NOT NULL,
  away_team  VARCHAR(50) NOT NULL,
  match_time DATETIME NOT NULL COMMENT '虚拟开球时间',
  duration   INT NOT NULL DEFAULT 105 COMMENT '时长(分钟)，结束=开球+duration',
  home_score INT NULL COMMENT '预置最终比分(主)',
  away_score INT NULL COMMENT '预置最终比分(客)',
  settled    TINYINT NOT NULL DEFAULT 0 COMMENT '是否已结算积分',
  KEY idx_league (league),
  KEY idx_match_time (match_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. predictions：比分预测
-- ------------------------------------------------------------
CREATE TABLE predictions (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  user_id        INT NOT NULL,
  match_id       INT NOT NULL,
  pred_home      INT NOT NULL COMMENT '预测主队比分',
  pred_away      INT NOT NULL COMMENT '预测客队比分',
  points_awarded INT NOT NULL DEFAULT 0 COMMENT '结算得分 0/1/3',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_match (user_id, match_id),
  CONSTRAINT fk_pred_user  FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pred_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. posts：赛后讨论帖
-- ------------------------------------------------------------
CREATE TABLE posts (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  match_id   INT NOT NULL,
  user_id    INT NOT NULL,
  content    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_match (match_id),
  CONSTRAINT fk_post_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_user  FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. comments：帖子评论
-- ------------------------------------------------------------
CREATE TABLE comments (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  post_id    INT NOT NULL,
  user_id    INT NOT NULL,
  content    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_post (post_id),
  CONSTRAINT fk_cmt_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cmt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 种子数据
-- ============================================================

-- ---------- 初始虚拟时间 ----------
INSERT INTO settings (id, virtual_time) VALUES (1, '2026-07-10 12:00:00');

-- ---------- 用户（密码均为 123456；admin 密码为 admin123） ----------
-- id: 1=admin 2=小射手 3=小球王 4=小门神 5=小快马 6=小钢炮 7=小猎豹
--     8=小坦克 9=小马达 10=小旋风 11=小火箭
--     12=绿茵漫步者 13=看台第12人 14=战术大师 15=越位陷阱（运行时自动发帖账号）
INSERT INTO users (id, username, password_hash, nickname, role, points) VALUES
(1,  'admin',    '$2a$10$kAYuWnBY6KxIIVW7kJcyVeN9BsY6D46ttyFDN23kGngT4VJ2OH39y', '管理员',   'admin', 0),
(2,  '小射手',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小射手',   'user', 6),
(3,  '小球王',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小球王',   'user', 4),
(4,  '小门神',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小门神',   'user', 2),
(5,  '小快马',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小快马',   'user', 4),
(6,  '小钢炮',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小钢炮',   'user', 4),
(7,  '小猎豹',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小猎豹',   'user', 3),
(8,  '小坦克',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小坦克',   'user', 5),
(9,  '小马达',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小马达',   'user', 5),
(10, '小旋风',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小旋风',   'user', 0),
(11, '小火箭',   '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '小火箭',   'user', 4),
(12, '绿茵漫步者','$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '绿茵漫步者','user', 0),
(13, '看台第12人','$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '看台第12人','user', 0),
(14, '战术大师', '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '战术大师', 'user', 0),
(15, '越位陷阱', '$2a$10$qY1JK/zOimnmC1VhrYbWq.TcRLALqVANeFDzwYwRn8GD4XvIDCXY.', '越位陷阱', 'user', 0);

-- ---------- 比赛（30 场，比分均预置；已完赛 settled=1，其余 0） ----------
-- 世界杯小组赛 A~F 组 × 3 轮（id 1~18）；苏超第 1~2 轮（id 19~30）
INSERT INTO matches (id, league, season, round, home_team, away_team, match_time, duration, home_score, away_score, settled) VALUES
-- ===== 世界杯 小组赛第 1 轮（已完赛 5 场 + 进行中 1 场） =====
(1,  'world_cup', '2026', '小组赛 A组', '阿根廷',     '墨西哥',     '2026-07-06 18:00:00', 105, 2, 1, 1),
(2,  'world_cup', '2026', '小组赛 B组', '法国',       '丹麦',       '2026-07-06 21:00:00', 105, 3, 0, 1),
(3,  'world_cup', '2026', '小组赛 C组', '英格兰',     '美国',       '2026-07-07 18:00:00', 105, 1, 1, 1),
(4,  'world_cup', '2026', '小组赛 D组', '德国',       '日本',       '2026-07-07 21:00:00', 105, 2, 1, 1),
(5,  'world_cup', '2026', '小组赛 E组', '西班牙',     '荷兰',       '2026-07-08 18:00:00', 105, 0, 0, 1),
(6,  'world_cup', '2026', '小组赛 F组', '巴西',       '葡萄牙',     '2026-07-10 10:30:00', 105, 3, 2, 0),
-- ===== 世界杯 小组赛第 2 轮（未开赛） =====
(7,  'world_cup', '2026', '小组赛 A组', '墨西哥',     '波兰',       '2026-07-10 18:00:00', 105, 1, 2, 0),
(8,  'world_cup', '2026', '小组赛 B组', '丹麦',       '突尼斯',     '2026-07-10 21:00:00', 105, 0, 1, 0),
(9,  'world_cup', '2026', '小组赛 C组', '美国',       '伊朗',       '2026-07-11 18:00:00', 105, 2, 2, 0),
(10, 'world_cup', '2026', '小组赛 D组', '日本',       '哥斯达黎加', '2026-07-11 21:00:00', 105, 1, 0, 0),
(11, 'world_cup', '2026', '小组赛 E组', '荷兰',       '摩洛哥',     '2026-07-12 18:00:00', 105, 3, 1, 0),
(12, 'world_cup', '2026', '小组赛 F组', '葡萄牙',     '塞尔维亚',   '2026-07-12 21:00:00', 105, 2, 2, 0),
-- ===== 世界杯 小组赛第 3 轮（未开赛） =====
(13, 'world_cup', '2026', '小组赛 A组', '波兰',       '阿根廷',     '2026-07-13 18:00:00', 105, 0, 1, 0),
(14, 'world_cup', '2026', '小组赛 B组', '突尼斯',     '法国',       '2026-07-13 21:00:00', 105, 1, 2, 0),
(15, 'world_cup', '2026', '小组赛 C组', '伊朗',       '英格兰',     '2026-07-14 18:00:00', 105, 0, 3, 0),
(16, 'world_cup', '2026', '小组赛 D组', '哥斯达黎加', '德国',       '2026-07-14 21:00:00', 105, 0, 4, 0),
(17, 'world_cup', '2026', '小组赛 E组', '摩洛哥',     '西班牙',     '2026-07-15 18:00:00', 105, 1, 1, 0),
(18, 'world_cup', '2026', '小组赛 F组', '塞尔维亚',   '巴西',       '2026-07-15 21:00:00', 105, 1, 2, 0),
-- ===== 苏超（江苏省城市足球联赛）第 1 轮（已完赛 3 场 + 进行中 1 场 + 未开赛 2 场） =====
(19, 'spl', '2026', '第 1 轮', '南京', '苏州',     '2026-07-07 15:00:00', 105, 2, 0, 1),
(20, 'spl', '2026', '第 1 轮', '无锡', '常州',     '2026-07-07 19:00:00', 105, 1, 1, 1),
(21, 'spl', '2026', '第 1 轮', '南通', '徐州',     '2026-07-08 15:00:00', 105, 0, 2, 1),
(22, 'spl', '2026', '第 1 轮', '扬州', '泰州',     '2026-07-10 10:30:00', 105, 1, 1, 0),
(23, 'spl', '2026', '第 1 轮', '镇江', '淮安',     '2026-07-11 15:00:00', 105, 1, 1, 0),
(24, 'spl', '2026', '第 1 轮', '盐城', '连云港',   '2026-07-11 19:00:00', 105, 2, 1, 0),
-- ===== 苏超 第 2 轮（未开赛） =====
(25, 'spl', '2026', '第 2 轮', '宿迁', '南京',     '2026-07-12 15:00:00', 105, 0, 2, 0),
(26, 'spl', '2026', '第 2 轮', '苏州', '无锡',     '2026-07-12 19:00:00', 105, 1, 3, 0),
(27, 'spl', '2026', '第 2 轮', '常州', '南通',     '2026-07-13 15:00:00', 105, 2, 2, 0),
(28, 'spl', '2026', '第 2 轮', '徐州', '扬州',     '2026-07-13 19:00:00', 105, 1, 0, 0),
(29, 'spl', '2026', '第 2 轮', '泰州', '镇江',     '2026-07-14 15:00:00', 105, 0, 1, 0),
(30, 'spl', '2026', '第 2 轮', '淮安', '盐城',     '2026-07-14 19:00:00', 105, 0, 0, 0);

-- ---------- 预测：已完赛比赛（含结算得分，用于个人中心展示） ----------
INSERT INTO predictions (user_id, match_id, pred_home, pred_away, points_awarded) VALUES
(2, 1, 2, 1, 3), (3, 1, 3, 1, 1), (4, 1, 1, 1, 0), (5, 1, 2, 0, 1),
(7, 2, 3, 0, 3), (8, 2, 2, 0, 1), (9, 2, 1, 0, 1), (10, 2, 1, 1, 0),
(11, 3, 1, 1, 3), (2, 3, 2, 1, 0), (3, 3, 0, 0, 0), (4, 3, 2, 2, 1),
(5, 4, 2, 1, 3), (6, 4, 1, 0, 1), (7, 4, 0, 2, 0),
(8, 5, 0, 0, 3), (9, 5, 1, 1, 1), (10, 5, 2, 1, 0), (11, 5, 0, 1, 0), (2, 5, 0, 0, 3),
(3, 19, 2, 0, 3), (4, 19, 1, 0, 1), (5, 19, 0, 1, 0),
(6, 20, 1, 1, 3), (7, 20, 2, 1, 0), (8, 20, 0, 0, 1),
(9, 21, 0, 2, 3), (10, 21, 1, 1, 0), (11, 21, 0, 1, 1);

-- ---------- 预测：未开赛比赛（推进虚拟时间完赛后自动结算演示） ----------
INSERT INTO predictions (user_id, match_id, pred_home, pred_away) VALUES
(2, 7, 1, 2), (3, 7, 2, 2), (4, 7, 1, 1), (5, 7, 0, 1),
(6, 8, 2, 0), (7, 8, 1, 1), (8, 8, 2, 1),
(9, 9, 3, 1), (10, 9, 1, 0), (11, 9, 2, 2),
(2, 10, 2, 0), (3, 10, 1, 0), (4, 10, 0, 0),
(5, 11, 3, 0), (6, 11, 2, 1), (7, 11, 1, 1),
(8, 12, 2, 1), (9, 12, 1, 1), (10, 12, 3, 2),
(11, 13, 0, 2), (2, 13, 1, 2), (3, 13, 0, 1), (4, 13, 0, 0),
(5, 14, 0, 3), (6, 14, 1, 2), (7, 14, 0, 1),
(8, 15, 0, 4), (9, 15, 0, 2), (10, 15, 1, 3), (11, 15, 0, 1),
(2, 16, 0, 3), (3, 16, 1, 4), (4, 16, 0, 2),
(5, 17, 0, 2), (6, 17, 1, 1), (7, 17, 0, 0), (8, 17, 1, 2),
(9, 18, 1, 3), (10, 18, 0, 2), (11, 18, 1, 2),
(2, 23, 1, 1), (3, 23, 2, 0), (4, 23, 0, 1),
(5, 24, 2, 1), (6, 24, 1, 0), (7, 24, 3, 1),
(8, 25, 0, 2), (9, 25, 1, 3), (10, 25, 0, 1),
(11, 26, 1, 2), (2, 26, 0, 2), (3, 26, 2, 2),
(4, 27, 1, 1), (5, 27, 2, 2), (6, 27, 3, 1),
(7, 28, 2, 0), (8, 28, 1, 0), (9, 28, 2, 1),
(10, 29, 0, 1), (11, 29, 1, 0), (2, 29, 0, 0),
(3, 30, 0, 0), (4, 30, 1, 1), (5, 30, 1, 2);

-- ---------- 帖子：已完赛比赛 ----------
INSERT INTO posts (id, match_id, user_id, content) VALUES
(1,  1, 2,  '阿根廷状态火热，梅西的助攻还是那么赏心悦目！'),
(2,  1, 3,  '墨西哥踢得不差，可惜把握机会差了点。'),
(3,  2, 7,  '法国这锋线火力太猛了，姆巴佩帽子戏法直接看呆！'),
(4,  3, 11, '英格兰又双叒踢平了，锋无力的问题得赶紧解决。'),
(5,  3, 3,  '美国队韧性十足，世界杯新贵名不虚传！'),
(6,  4, 5,  '德国艰难拿下日本，后防线还是让人捏把汗。'),
(7,  5, 8,  '0-0 闷平，西班牙控球率七成却进不了球。'),
(8,  5, 9,  '荷兰这防守真是铜墙铁壁。'),
(9,  19, 3, '南京主场大胜，主场氛围太顶了！'),
(10, 20, 6, '苏超德比踢得真拼，1-1 也很精彩。'),
(11, 21, 9, '徐州客场两球完胜，锋线效率真高。');

-- ---------- 评论：已完赛比赛的帖子 ----------
INSERT INTO comments (post_id, user_id, content) VALUES
(1,  4,  '这场看完直接爱上阿根廷了，下轮预测跟上！'),
(2,  5,  '同意，门将扑出了好几个必进球。'),
(3,  8,  '丹麦全场被压着打，毫无还手之力。'),
(3,  10, '预测果然应验了，哈哈'),
(4,  2,  '贝林厄姆还是全队最有威胁的。'),
(6,  6,  '日本队最后一波攻势差点扳平，太刺激了。'),
(6,  7,  '主场球迷赚到了，全场没白看。'),
(7,  10, '我预测的 1-1，就差一点点。'),
(7,  11, '这场不适合喜欢进球的我哈哈'),
(9,  4,  '苏州队下半场体能有点跟不上。'),
(10, 8,  '两队门将都立功了，好球！'),
(11, 11, '南通机会不少，就是差临门一脚。');

SET FOREIGN_KEY_CHECKS = 1;
