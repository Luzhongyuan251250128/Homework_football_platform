-- ============================================================
-- 世界杯/苏超赛事信息与互动预测平台 — 数据库初始化脚本
-- 在 MySQL 容器首次启动时由 /docker-entrypoint-initdb.d/ 自动执行
-- ============================================================

CREATE DATABASE IF NOT EXISTS football_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE football_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS team_comments;
DROP TABLE IF EXISTS teams;
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
-- 6. comments：帖子评论（支持单层回复：parent_id 指向另一条评论）
-- ------------------------------------------------------------
CREATE TABLE comments (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  post_id    INT NOT NULL,
  user_id    INT NOT NULL,
  parent_id  INT NULL COMMENT '被回复的评论 id（NULL=顶层评论）',
  content    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_post (post_id),
  CONSTRAINT fk_cmt_post   FOREIGN KEY (post_id)   REFERENCES posts(id)        ON DELETE CASCADE,
  CONSTRAINT fk_cmt_user   FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE,
  CONSTRAINT fk_cmt_parent FOREIGN KEY (parent_id) REFERENCES comments(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. teams：球队档案（比赛按队名匹配，无外键依赖）
-- ------------------------------------------------------------
CREATE TABLE teams (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(50) NOT NULL UNIQUE COMMENT '队名，与 matches 中一致',
  league      ENUM('world_cup','spl') NOT NULL,
  type        VARCHAR(20) NOT NULL COMMENT '国家队 / 城市队',
  description VARCHAR(500) NOT NULL DEFAULT '' COMMENT '球队档案评价（预测相关话术）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 8. team_comments：球队评价区评论（支持单层回复）
-- ------------------------------------------------------------
CREATE TABLE team_comments (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  team_id    INT NOT NULL,
  user_id    INT NOT NULL,
  parent_id  INT NULL COMMENT '被回复的评论 id（NULL=顶层评论）',
  content    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_team (team_id),
  CONSTRAINT fk_tc_team   FOREIGN KEY (team_id)   REFERENCES teams(id)          ON DELETE CASCADE,
  CONSTRAINT fk_tc_user   FOREIGN KEY (user_id)   REFERENCES users(id)          ON DELETE CASCADE,
  CONSTRAINT fk_tc_parent FOREIGN KEY (parent_id) REFERENCES team_comments(id)  ON DELETE CASCADE
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

-- ---------- 预测：进行中比赛（完赛后自动结算演示） ----------
INSERT INTO predictions (user_id, match_id, pred_home, pred_away) VALUES
(10, 6, 3, 2), (11, 6, 2, 1), (2, 6, 2, 2), (3, 6, 3, 1),
(4, 22, 1, 1), (5, 22, 0, 0), (6, 22, 2, 1);

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

-- ---------- 帖子：进行中与未开赛比赛（推进虚拟时间完赛后即出现） ----------
INSERT INTO posts (id, match_id, user_id, content) VALUES
(12, 6,  10, '巴西葡萄牙火星撞地球，这场我看好大比分！'),
(13, 6,  11, '两大夺冠热门提前碰面，票价值回！'),
(14, 7,  3,  '墨西哥打波兰，看好波兰客场偷分。'),
(15, 8,  7,  '丹麦主场迎突尼斯，北欧防线稳如泰山。'),
(16, 9,  9,  '美伊对决看点十足，东道主气势正盛！'),
(17, 10, 6,  '日本队传控细腻，这场赢面大。'),
(18, 11, 8,  '荷兰全攻全守回来了，大胜可期！'),
(19, 12, 11, '葡萄牙遇强则强，塞尔维亚可不好惹。'),
(20, 13, 2,  '阿根廷小组收官战，稳字当头。'),
(21, 14, 6,  '法国替补深度恐怖，轮换出战也能赢。'),
(22, 15, 10, '英格兰火力全开，这场大比分可期！'),
(23, 16, 4,  '德国需要大胜，全力争小组第一。'),
(24, 17, 5,  '西班牙控球流对摩洛哥防反，经典对决。'),
(25, 18, 9,  '巴西锋线豪华，塞尔维亚要打硬仗。'),
(26, 22, 2,  '苏超扬州德比，火药味十足！'),
(27, 22, 10, '两队状态都火热，平局可能性很大。'),
(28, 23, 3,  '镇江淮安势均力敌，谁也难赢谁。'),
(29, 24, 6,  '盐城主场拿下问题不大。'),
(30, 25, 7,  '南京客场实力占优，但宿迁主场敢拼。'),
(31, 26, 8,  '无锡状态火热，客场取胜可期！'),
(32, 27, 10, '苏超德比再上演，对攻大战走起！'),
(33, 28, 4,  '徐州主场优势明显，稳扎稳打。'),
(34, 29, 5,  '镇江客场取胜概率更大。'),
(35, 30, 9,  '淮安盐城都求稳，闷平可能性大。');

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

-- ---------- 评论：进行中与未开赛比赛的帖子 ----------
INSERT INTO comments (post_id, user_id, content) VALUES
(12, 2,  '比分还真被我算中了，哈哈'),
(12, 4,  '开场就进球，太刺激了'),
(13, 8,  '两队对攻看得太过瘾'),
(13, 9,  '现场氛围隔着屏幕都能感觉到'),
(14, 5,  '波兰前锋状态正热，支持+1'),
(14, 6,  '小组出线关键战，全程盯紧'),
(15, 8,  '突尼斯反击速度很快，别轻敌'),
(15, 10, '我看好丹麦小胜'),
(16, 11, '伊朗防守硬，估计会打平'),
(16, 2,  '美国主场氛围无敌'),
(17, 7,  '哥斯达黎加铁桶阵不好破'),
(17, 3,  '日本 1-0 预测打卡'),
(18, 5,  '摩洛哥个人能力强，能进一个'),
(18, 10, '看好 3-1，比分都猜好了'),
(19, 4,  '两队都能进球，平局概率大'),
(19, 9,  '这场适合看大球'),
(20, 5,  '梅西状态在线，看好阿根廷'),
(20, 8,  '波兰要拼净胜球，会攻出来'),
(21, 3,  '突尼斯主场作战会拼'),
(21, 7,  '法国 2-1 打卡'),
(22, 9,  '伊朗摆大巴，就看英格兰破门能力'),
(22, 11, '预测 0-3，贝林厄姆进球'),
(23, 8,  '哥斯达黎加会死守'),
(23, 2,  '德国火力无解，0-4 走一个'),
(24, 10, '摩洛哥有爆冷基因，平局合理'),
(24, 3,  '预测 1-1'),
(25, 6,  '巴西 2-1 打卡'),
(25, 7,  '塞尔维亚高中锋可不好防'),
(26, 11, '扬州主场球迷给力'),
(26, 4,  '泰州反击很犀利'),
(27, 5,  '苏超比赛越来越好看'),
(27, 3,  '这场我也押平局'),
(28, 5,  '预测 1-1 平局'),
(28, 8,  '势均力敌最精彩'),
(29, 9,  '连云港会摆防守反击'),
(29, 10, '盐城 2-1'),
(30, 2,  '南京 2-0 稳'),
(30, 4,  '宿迁主场气势不能输'),
(31, 3,  '苏州主场会全力争胜'),
(31, 5,  '看好大比分'),
(32, 11, '预测 2-2'),
(32, 9,  '两队都想拿分'),
(33, 6,  '扬州会拼身体对抗'),
(33, 7,  '徐州 1-0 小胜'),
(34, 2,  '泰州防守为主'),
(34, 10, '镇江 1-0'),
(35, 8,  '预测 0-0'),
(35, 3,  '中场绞肉战，谁进一球谁赢'),
(5,  9,  '美国队这届真不一样，防守反击打得漂亮'),
(8,  10, '荷兰后卫线今晚就是叹息之墙');

-- ---------- 评论回复示例（parent_id 指向被回复的评论，单层） ----------
INSERT INTO comments (post_id, user_id, parent_id, content) VALUES
(1, 3,  1,  '同款！下一场继续押阿根廷'),
(3, 6,  3,  '同意，法国三球完胜毫无悬念'),
(3, 11, 5,  '贝林厄姆确实全队最亮眼'),
(6, 5,  6,  '那波攻势吓出我一身冷汗'),
(7, 9,  8,  '差一点就是 3 分，太可惜了'),
(9, 8,  10, '下半场明显跑不动了'),
(11, 6, 12, '南通差的就是临门一脚');

-- ---------- 球队档案（31 支，评价话术与预测相关） ----------
INSERT INTO teams (id, name, league, type, description) VALUES
(1,  '阿根廷', 'world_cup', '国家队', '平台最热门预测对象之一，球迷疯狂押注梅西带队的每一场，猜中率居高不下。'),
(2,  '墨西哥', 'world_cup', '国家队', '预测常客但常爆冷门，敢押它输球的都是老球迷。'),
(3,  '波兰', 'world_cup', '国家队', '预测热度中规中矩，莱万的存在让"波兰进球"成为高频预测盘。'),
(4,  '法国', 'world_cup', '国家队', '大比分专业户，押它大胜的用户积分稳稳入袋。'),
(5,  '丹麦', 'world_cup', '国家队', '北欧铁军，用户普遍押小胜或平局，是保守派的心头好。'),
(6,  '突尼斯', 'world_cup', '国家队', '冷门专业户，敢押它赢的屈指可数，一旦押中就是高分翻盘。'),
(7,  '英格兰', 'world_cup', '国家队', '预测重灾区：纸面实力强但平局魔咒，让无数用户积分归零。'),
(8,  '美国', 'world_cup', '国家队', '东道主人气队，预测热度随主场氛围水涨船高。'),
(9,  '伊朗', 'world_cup', '国家队', '铁血防守标签深入人心，用户普遍押小比分。'),
(10, '德国', 'world_cup', '国家队', '火力全开型，用户爱押大比分，但后防不稳也让不少预测翻车。'),
(11, '日本', 'world_cup', '国家队', '传控细腻的技术流预测宠儿，猜中率稳中有升。'),
(12, '哥斯达黎加', 'world_cup', '国家队', '铁桶阵代表，几乎没人敢押它进球。'),
(13, '西班牙', 'world_cup', '国家队', '控球率之王，用户常押 1-0 或平局，预测风格与比赛风格一样谨慎。'),
(14, '荷兰', 'world_cup', '国家队', '全攻全守回归，大比分预测的快乐源泉。'),
(15, '摩洛哥', 'world_cup', '国家队', '爆冷基因携带者，上届四强的余威让用户又爱又怕。'),
(16, '巴西', 'world_cup', '国家队', '与阿根廷并列的平台预测顶流，每场预测人次几乎拉满。'),
(17, '葡萄牙', 'world_cup', '国家队', '巨星效应明显，用户喜欢押"葡萄牙+进球"的经典组合。'),
(18, '塞尔维亚', 'world_cup', '国家队', '高大中锋型球队，用户多押 2-1 险胜剧本。'),
(19, '南京', 'spl', '城市队', '苏超人气王，主场战绩稳，预测命中率名列前茅。'),
(20, '苏州', 'spl', '城市队', '客场表现起伏，用户预测分化严重。'),
(21, '无锡', 'spl', '城市队', '状态火热的上赛季黑马，近期预测追涨明显。'),
(22, '常州', 'spl', '城市队', '主场顽强，用户爱押平局。'),
(23, '南通', 'spl', '城市队', '锋线效率是软肋，不少"押它进球"的预测落空。'),
(24, '徐州', 'spl', '城市队', '客场抢分能手，冷门预测的常客。'),
(25, '扬州', 'spl', '城市队', '主场氛围火爆，预测热度紧随南京。'),
(26, '泰州', 'spl', '城市队', '反击犀利，用户喜欢押它小比分取胜。'),
(27, '镇江', 'spl', '城市队', '攻防均衡的中庸之选，猜中率平平但稳定。'),
(28, '淮安', 'spl', '城市队', '防守硬朗，闷平专业户，押 0-0 的稳健派最爱。'),
(29, '盐城', 'spl', '城市队', '主场龙，预测命中率不错。'),
(30, '连云港', 'spl', '城市队', '客场虫标签，押它赢的人很少。'),
(31, '宿迁', 'spl', '城市队', '苏超新军，预测样本少，敢押的都是真爱粉。');

-- ---------- 球队评价区评论（全部 31 队预置，作者为演示账号，部分带回复） ----------
INSERT INTO team_comments (id, team_id, user_id, parent_id, content) VALUES
(1,  1,  2,  NULL, '阿根廷我闭眼押，梅西状态无敌，在这支队伍上的预测命中率全场第一！'),
(2,  1,  3,  1,   '同意，跟着小射手押阿根廷准没错'),
(3,  2,  5,  NULL, '墨西哥总在我要换台的时候进球，预测它真的要谨慎。'),
(4,  3,  8,  NULL, '莱万的头球永远可以信任，波兰进球盘很稳。'),
(5,  4,  7,  NULL, '法国大比分专业户，押它的人积分稳赚。'),
(6,  4,  6,  5,   '上轮 3-0 我就中了，法国永远的神'),
(7,  5,  4,  NULL, '丹麦防线稳，押平局的安全选择。'),
(8,  6,  10, NULL, '敢押突尼斯赢的绝对是勇士，我敬你是条汉子。'),
(9,  7,  11, NULL, '英格兰纸面强队实际平局大师，我在这上面栽过三次。'),
(10, 7,  2,  9,   '哈哈，贝林厄姆都救不了英格兰的锋无力'),
(11, 8,  9,  NULL, '美国主场 buff 太强，预测热度跟着主场走。'),
(12, 9,  3,  NULL, '伊朗铁桶阵，押小比分就对了。'),
(13, 10, 6,  NULL, '德国大比分可期但后防漏风，押完记得备好速效救心丸。'),
(14, 11, 8,  NULL, '日本传控细腻，在这支队伍上的预测命中率一直很稳。'),
(15, 12, 4,  NULL, '哥斯达黎加就没进过几个球，别押它进球。'),
(16, 13, 10, NULL, '西班牙控球七成进不了球，押平局的常胜将军。'),
(17, 14, 5,  NULL, '荷兰全攻全守，大比分预测的快乐源泉。'),
(18, 15, 7,  NULL, '摩洛哥专治各种不服，爆冷专业户。'),
(19, 15, 11, 18,  '上次押它爆冷赚了 3 分，记忆犹新'),
(20, 16, 2,  NULL, '巴西和阿根廷并列预测顶流，每场都有人押。'),
(21, 16, 9,  20,  '巴西锋线豪华，跟押不会错'),
(22, 17, 6,  NULL, '葡萄牙巨星多，"葡萄牙+进球"是平台经典组合盘。'),
(23, 18, 3,  NULL, '塞尔维亚高中锋战术，2-1 剧本常客。'),
(24, 19, 5,  NULL, '南京主场稳如老狗，苏超预测命中率第一。'),
(25, 20, 8,  NULL, '苏州客场起伏大，预测它要三思。'),
(26, 21, 10, NULL, '无锡黑马状态正热，预测追涨没毛病。'),
(27, 22, 4,  NULL, '常州主场顽强，押平局的稳健派最爱。'),
(28, 23, 11, NULL, '南通锋线软肋，押它进球要做好心理准备。'),
(29, 24, 7,  NULL, '徐州客场抢分能手，冷门预测常客。'),
(30, 25, 2,  NULL, '扬州主场氛围火爆，预测热度紧随南京。'),
(31, 26, 9,  NULL, '泰州反击犀利，小比分取胜剧本多。'),
(32, 27, 6,  NULL, '镇江攻防均衡，预测中庸但稳定。'),
(33, 28, 3,  NULL, '淮安闷平专业户，押 0-0 就对了。'),
(34, 28, 10, 33,  '上次押淮安 0-0 稳稳收下 3 分'),
(35, 29, 5,  NULL, '盐城主场龙，预测命中率不错。'),
(36, 30, 8,  NULL, '连云港客场表现拉胯，押它赢的人很少。'),
(37, 31, 9,  NULL, '宿迁新军预测样本少，敢押的都是真爱粉。');

SET FOREIGN_KEY_CHECKS = 1;
