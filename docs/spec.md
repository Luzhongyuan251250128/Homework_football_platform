# 世界杯/苏超赛事信息与互动预测平台 — 技术规格说明书 (SPEC)

> 暑期课 Web 开发作业。本文档是唯一权威实现依据，实现过程中如有冲突以此为准。

## 1. 项目概述

面向足球赛事的信息服务全栈应用：赛事信息展示（赛程/实时比分/历史数据）+ 用户注册登录 + 比分预测 + 赛后讨论区（帖子+评论）+ 个人中心（预测记录、积分）。

- 前端：Vue 3 + Vite
- 后端：Node.js + Express（RESTful API）
- 数据库：MySQL
- 部署：Docker Compose（mysql + backend + frontend(nginx)）

## 2. 核心设计：虚拟时间系统

### 2.1 原理

系统中"当前时间"一律取自定义虚拟时间（存于数据库），**不使用真实时间**。比赛状态、预测开关、讨论区开关、积分结算全部由虚拟时间驱动。目的：演示者可手动推进时间，演示"未开始 → 进行中 → 已结束"的完整比赛生命周期与比分刷新。

### 2.2 状态判定（动态计算，不存死状态）

```
t = 虚拟时间；开球 = match_time；结束 = match_time + duration(分钟)

t < 开球        → upcoming（未开始）：可预测；API 隐藏比分
开球 ≤ t < 结束 → live（进行中）：显示比分；不可预测
t ≥ 结束        → finished（已结束）：显示比分；结算积分；开放讨论区
```

每次响应时动态计算状态，数据库中不持久化 status 字段。

### 2.3 比分隐藏规则

种子数据为每场比赛预置最终比分，但 API 仅在 live/finished 时返回 `home_score`/`away_score`，upcoming 时返回 null（防止用户提前看到结果）。

### 2.4 时间推进与结算

- `PUT /api/admin/time`（仅 admin）推进虚拟时间，支持：`+15分钟`、`+1小时`、直接设定具体时间。
- 推进后**同步执行幂等结算**：找出所有 `虚拟时间 ≥ 结束时间 && settled = 0` 的比赛，逐场结算。
- 结算逻辑：对每场已结束比赛的所有预测，正确比分 +3 分，仅正确胜平负 +1 分，错误 0 分；将得分写入 `predictions.points_awarded` 并累加至 `users.points`，比赛标记 `settled = 1`。全程事务保证。

### 2.5 界面展示

前端顶部导航常驻显示"虚拟时间：YYYY-MM-DD HH:mm"；admin 登录后可见时间控制台（+15分钟 / +1小时 / 设定时间 按钮），任何推进操作后前端立即刷新数据。

## 3. 数据模型（8 张表）

### users
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| username | VARCHAR(50) UNIQUE NOT NULL | |
| password_hash | VARCHAR(255) NOT NULL | bcrypt |
| nickname | VARCHAR(50) NOT NULL DEFAULT '' | |
| role | ENUM('user','admin') DEFAULT 'user' | 种子数据预置 admin 账号 |
| points | INT NOT NULL DEFAULT 0 | 累计积分 |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

### matches
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| league | ENUM('world_cup','spl') NOT NULL | 世界杯 / 苏超 |
| season | VARCHAR(20) NOT NULL | 如 2026 |
| round | VARCHAR(50) NOT NULL | 如 "小组赛 A 组" / "第 5 轮" |
| home_team | VARCHAR(50) NOT NULL | |
| away_team | VARCHAR(50) NOT NULL | |
| match_time | DATETIME NOT NULL | 虚拟开球时间 |
| duration | INT NOT NULL DEFAULT 105 | 结束 = match_time + duration |
| home_score | INT NULL | 预置最终比分；API 按状态决定是否返回 |
| away_score | INT NULL | 同上 |
| settled | TINYINT NOT NULL DEFAULT 0 | 是否已结算 |

### predictions
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| user_id | INT NOT NULL FK→users.id | |
| match_id | INT NOT NULL FK→matches.id | |
| pred_home | INT NOT NULL | 预测主队比分 |
| pred_away | INT NOT NULL | 预测客队比分 |
| points_awarded | INT NOT NULL DEFAULT 0 | 结算后写入 0/1/3 |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

**UNIQUE KEY (user_id, match_id)**：一人一场仅一次预测。

### posts
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| match_id | INT NOT NULL FK→matches.id | |
| user_id | INT NOT NULL FK→users.id | |
| content | TEXT NOT NULL | |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

### comments
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| post_id | INT NOT NULL FK→posts.id | |
| user_id | INT NOT NULL FK→users.id | |
| parent_id | INT NULL FK→comments.id | 被回复的评论 id；NULL=顶层评论，**仅支持单层回复**（回复的回复被 API 拒绝） |
| content | TEXT NOT NULL | |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

### teams（球队档案，按队名与 matches 匹配，无外键）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| name | VARCHAR(50) UNIQUE NOT NULL | 队名，与 matches 中一致 |
| league | ENUM('world_cup','spl') NOT NULL | |
| type | VARCHAR(20) NOT NULL | 国家队 / 城市队 |
| description | VARCHAR(500) NOT NULL DEFAULT '' | 球队档案评价（预测相关话术） |

### team_comments（球队评价区评论，支持单层回复）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| team_id | INT NOT NULL FK→teams.id | |
| user_id | INT NOT NULL FK→users.id | |
| parent_id | INT NULL FK→team_comments.id | 被回复的评论 id；单层 |
| content | TEXT NOT NULL | |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | |

### settings
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 恒为 1，单行 |
| virtual_time | DATETIME NOT NULL | 虚拟当前时间 |

## 4. 种子数据（db/init.sql）

### 4.1 时间与账号

1. `settings` 初始虚拟时间：`2026-07-10 12:00:00`。
2. 账号清单（密码均为 bcrypt 哈希存储）：
   - **admin**：`admin / admin123`，role=admin，时间控制台专用。
   - **真实演示用户 ×10**（足球元素网名，暗号：全部"小X"格式，密码均为 123456）：小射手、小球王、小门神、小快马、小钢炮、小猎豹、小坦克、小马达、小旋风、小火箭。帖子、评论、预测全部归到这些可登录账号名下。
   - **球迷账号 ×4**（运行时自动生成内容用，密码均为 123456，真实行存在但不在 README 宣传）：绿茵漫步者、看台第12人、战术大师、越位陷阱。

### 4.2 比赛数据（共 30 场，覆盖三种状态）

| 状态 | 世界杯 | 苏超 | 合计 |
|---|---|---|---|
| 已完赛（虚拟时间前开球并结束） | 5 | 3 | 8 |
| 进行中（7-10 上午开球、下午结束，推进时间即变完赛） | 1 | 1 | 2 |
| 未开赛（7-10 晚 ~ 7-14，可预测） | 12 | 8 | 20 |
| **合计** | **18** | **12** | **30** |

- **世界杯**：小组赛 A~F 组 × 3 轮（每轮 6 场），虚拟赛程 2026-07-06 ~ 07-15，真实强队对阵（阿根廷、法国、英格兰、德国、西班牙、巴西…）。
- **苏超（江苏省城市足球联赛）**：13 个设区市队伍——南京、苏州、无锡、常州、南通、徐州、扬州、泰州、镇江、淮安、盐城、连云港、宿迁；第 1~2 轮各 6 场（每轮一支轮空），虚拟赛程 2026-07-07 ~ 07-13。
- 每场比赛预置最终比分；API 对未开赛比赛隐藏比分（见 §2.3）。
- **全部 30 场比赛均预置**：预测记录（共 100 条，每场 3~5 条）、帖子（共 35 条，每场 1~2 条）、评论（共 69 条，每条帖子均有评论，含 7 条回复示例）。已完赛 8 场的预测已结算（+0/+1/+3 混合），其余在推进虚拟时间完赛后自动结算，用于个人中心展示。
- **球队档案**：`teams` 表 31 支球队（世界杯 18 国家队 + 苏超 13 城市队），`description` 为预测相关话术评价。
- **球队评价区**：`team_comments` 表 37 条（31 条顶层 + 6 条回复），**全部 31 支球队均预置**，作者为演示账号。

### 4.3 运行时内容生成（兜底机制）

种子数据已覆盖全部比赛的内容，正常运行不会触发；仅当某场完赛比赛意外缺失帖子时，后端在推进虚拟时间时**兜底自动生成 1 条帖子 + 2 条评论**（作者由 4 个球迷账号轮换，内容取自模板池），保证任何情况下讨论区都有内容。

## 5. API 设计

统一前缀 `/api`。响应格式统一为 `{ code: 0, message: "ok", data: ... }`（code≠0 为错误）。认证用 JWT：`Authorization: Bearer <token>`，`GET /api/auth/me` 返回当前用户。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | /api/time | 公开 | 当前虚拟时间 |
| POST | /api/auth/register | 公开 | 注册 {username, password, nickname?} |
| POST | /api/auth/login | 公开 | 登录 {username, password} → {token, user} |
| GET | /api/auth/me | 登录 | 当前用户信息（含 points） |
| GET | /api/matches | 公开 | 列表；`?league=world_cup|spl` `?status=upcoming|live|finished`；按 match_time 排序；附每场预测人数；upcoming 隐藏比分 |
| GET | /api/matches/:id | 公开 | 详情 + 该场预测统计（各比分分布可选） |
| POST | /api/matches/:id/predictions | 登录 | 预测 {pred_home, pred_away}；校验：比赛存在、状态为 upcoming、未预测过 |
| GET | /api/matches/:id/predictions | 登录 | 该场比赛的预测列表（含预测者昵称、结算得分） |
| GET | /api/matches/:id/posts | 公开 | 帖子列表（含作者昵称、评论数、评论内容） |
| POST | /api/matches/:id/posts | 登录 | 发帖 {content}；校验比赛已 finished |
| GET | /api/posts/:id/comments | 公开 | 帖子评论列表（含 parentId，前端分组渲染） |
| POST | /api/posts/:id/comments | 登录 | 评论 {content, parent_id?}；parent_id 可选：回复某条评论（校验：目标评论存在、属于同一帖子、且为顶层评论，仅单层） |
| GET | /api/teams/:name | 公开（登录附我的数据） | 球队主页：档案（含评价）、战绩（场/胜/平/负/进/失/胜率）、过往比赛（含胜负平结果）、我的预测明细与准确统计（猜中比分/猜中胜负/合计/累计得分）、该队比赛预测热度 |
| GET | /api/teams/:name/comments | 公开 | 球队评价区评论列表（含 parentId） |
| POST | /api/teams/:name/comments | 登录 | 发布/回复评价 {content, parent_id?}（单层回复校验同上） |
| GET | /api/me/predictions | 登录 | 我的预测记录（比赛信息、我的预测、points_awarded、比赛状态） |
| GET | /api/me/points | 登录 | 我的积分（总量 + 明细可选） |
| GET | /api/leaderboard | 公开（登录时附我的排名） | 积分排行榜：仅统计有预测记录的用户；按积分↓、猜中比分次数↓、id↑ 排序，同分同名次；含排名/昵称/积分/预测总数/猜中比分/猜中胜负 |
| PUT | /api/admin/time | admin | 推进虚拟时间 `{hours: 1}` 或 `{virtual_time: "2026-07-11 18:00:00"}`；推进后同步执行结算（§2.4）与运行时内容生成（§4.3） |

错误码约定：400 参数错误、401 未登录、403 无权限、404 不存在、409 冲突（已预测过/不可预测）。

## 6. 前端页面（Vue 3 + Vue Router + Pinia）

| 路由 | 页面 | 要点 |
|---|---|---|
| / | 赛事列表 | 页面上比赛按 **未开赛 / 进行中 / 已完赛 三组**展示；联赛 Tab（全部/世界杯/苏超）+ 状态筛选；卡片展示时间、对阵、状态徽标、比分或"VS"；进行中高亮"LIVE" |
| /matches/:id | 比赛详情 | 比分/状态；upcoming 时预测表单（主/客比分下拉或数字输入），已预测则显示我的预测；finished 后展示结果与结算；下方讨论区（帖子 + 评论，可展开） |
| /login /register | 登录/注册 | |
| /profile | 个人中心 | 昵称、累计积分；预测记录列表（比赛、预测、结果、+0/+1/+3） |
| 全局组件 | 时间控制台 | 顶部栏显示虚拟时间；admin 可见 +15min/+1h/设定时间；操作后刷新全部数据 |

状态管理：Pinia 存 token + user（localStorage 持久化）。API 请求封装 axios 实例，401 时跳登录。

## 7. 部署（Docker Compose）

```
docker-compose.yml:
  mysql:     image mysql:8, 挂载 db/init.sql → /docker-entrypoint-initdb.d/,
             数据卷 volume 持久化, 环境变量 MYSQL_ROOT_PASSWORD/MYSQL_DATABASE
  backend:   多阶段构建 node:20-alpine; 环境变量 DB_HOST=mysql 等; depends_on mysql
  frontend:  多阶段构建: node 构建 dist → nginx:alpine 托管; nginx.conf 将 /api 反向代理至 backend:3000
```

- backend 端口映射宿主 3000（或仅内部），nginx 暴露 80。
- 数据库初始化脚本自动执行；如需重置演示数据：`docker compose down -v && docker compose up -d`。

## 8. 交付物

1. X64 架构 Docker 镜像产物包（Dockerfile + docker-compose.yml，含启动命令）
2. README.txt：GitHub 仓库地址、Compose 启动命令、数据库/资源挂载说明、公网访问地址（如无填"本地演示"）、演示流程（虚拟时间推进闭环）
3. 完整源代码
4. 数据库初始化脚本（db/init.sql）
5. API 接口文档（docs/api.md）

## 9. 目录结构

```
球赛网页端/
├── backend/
│   ├── src/
│   │   ├── app.js           # Express 入口
│   │   ├── db.js            # mysql2 连接池
│   │   ├── config.js        # 环境变量
│   │   ├── vtime.js         # 虚拟时间工具（get/set/状态判定/结算）
│   │   ├── middleware/auth.js
│   │   └── routes/
│   │       ├── auth.js / matches.js / predictions.js / posts.js / me.js / admin.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/ (views/ router/ store/ api/ components/TimeControl.vue)
│   ├── nginx.conf
│   └── Dockerfile
├── db/init.sql
├── docs/api.md
├── docker-compose.yml
├── README.txt
└── AGENTS.md
```

## 10. 演示验收流程

1. `docker compose up -d` → MySQL 自动初始化。
2. 访问前端首页：看到虚拟时间 2026-07-10 12:00 与各状态比赛。
3. 注册新用户 → 对 upcoming 比赛预测 → 详情页显示"我的预测"。
4. 退出登录 → admin/admin123 登录 → 时间控制台推进 +15min/+1h。
5. 首页刷新：upcoming 比赛变 live（显示比分）→ 再推进 → finished。
6. 普通用户登录 → 详情页见结果与结算得分；讨论区开放，发帖 + 评论。
7. 个人中心：预测记录显示 +0/+1/+3 与积分增长。
