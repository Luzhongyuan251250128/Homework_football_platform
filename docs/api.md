# 世界杯/苏超赛事信息与互动预测平台 — API 接口文档

- 基础地址：`http://<host>/api`（开发环境：`http://localhost:3000/api`）
- 响应格式统一：`{ "code": 0, "message": "ok", "data": ... }`，`code = 0` 表示成功
- 认证方式：请求头 `Authorization: Bearer <token>`（登录接口返回的 token）
- 错误码：400 参数错误 / 401 未登录 / 403 无权限 / 404 不存在 / 409 冲突 / 500 服务器错误

## 1. 系统与时间

### GET /api/time
当前虚拟时间。
```json
{ "code": 0, "message": "ok", "data": { "virtualTime": "2026-07-10 12:00:00" } }
```

## 2. 用户认证

### POST /api/auth/register
注册。参数：`username`（2~20 字符）、`password`（6~50 位）、`nickname`（可选）。
成功返回新用户信息。

### POST /api/auth/login
登录。参数：`username`、`password`。
```json
{ "code": 0, "message": "登录成功",
  "data": { "token": "eyJ...", "user": { "id": 2, "username": "小射手", "nickname": "小射手", "role": "user", "points": 6 } } }
```

### GET /api/auth/me
当前登录用户信息（含积分）。需登录。

## 3. 赛事信息

### GET /api/matches?league=&status=
比赛列表。`league`：`world_cup` | `spl`（省略为全部）；`status`：`upcoming` | `live` | `finished`（省略为全部）。
未开赛比赛**隐藏比分**（homeScore/awayScore 为 null），并附每场预测人数。
```json
{ "code": 0, "message": "ok",
  "data": { "virtualTime": "2026-07-10 12:00:00",
    "matches": [ { "id": 1, "league": "world_cup", "leagueText": "世界杯", "season": "2026",
      "round": "小组赛 A组", "homeTeam": "阿根廷", "awayTeam": "墨西哥",
      "matchTime": "2026-07-06 18:00:00", "duration": 105,
      "status": "finished", "statusText": "已完赛", "homeScore": 2, "awayScore": 1,
      "predictionCount": 4, "settled": true } ] } }
```

### GET /api/matches/:id
比赛详情。附预测人数、热门比分分布（scoreDistribution）；已登录时附 `myPrediction`（我的预测及结算得分）。

## 4. 比分预测

### POST /api/matches/:id/predictions
提交预测（需登录）。参数：`pred_home`、`pred_away`（0~20 整数）。
校验：比赛存在、状态为未开赛（upcoming）、未预测过（一人一场一次）。违规返回 409。

### GET /api/matches/:id/predictions
某场比赛的全部预测列表（需登录）。含预测者昵称、结算得分（已完赛时）与比赛结果。

## 5. 赛后讨论区（帖子 + 评论）

### GET /api/matches/:id/posts
帖子列表（公开），每条帖子内嵌其评论。

### POST /api/matches/:id/posts
发帖（需登录）。参数：`content`（2~500 字符）。仅比赛已完赛（finished）后可发，否则 409。

### GET /api/posts/:id/comments
帖子评论列表（公开）。

### POST /api/posts/:id/comments
评论（需登录）。参数：`content`（1~300 字符）。

## 6. 个人中心

### GET /api/me/predictions
我的预测记录（需登录）。每条含比赛信息、我的预测、实际比分（未开赛为 null）、状态、结算得分。

### GET /api/me/points
我的积分汇总（需登录）。
```json
{ "code": 0, "message": "ok",
  "data": { "total": 6,
    "stats": { "totalPredictions": 8, "exact": 2, "correct": 2, "wrong": 4 } } }
```

### GET /api/leaderboard
积分排行榜（公开，登录时附 `myRank`）。仅统计**有预测记录**的用户；排序：积分 ↓ → 猜中比分次数 ↓ → id ↑；同分同名次（1、2、2、4）。
```json
{ "code": 0, "message": "ok",
  "data": { "leaderboard": [
      { "rank": 1, "userId": 2, "username": "小射手", "nickname": "小射手",
        "points": 6, "totalPredictions": 8, "exactCount": 2, "correctCount": 2 } ],
    "myRank": null } }
```

## 7. 管理接口（管理员）

### PUT /api/admin/time
推进虚拟时间（需 admin 角色）。三选一传参：
- `{ "hours": 1 }` 前进 1 小时
- `{ "minutes": 15 }` 前进 15 分钟
- `{ "virtual_time": "2026-07-11 18:00:00" }` 直接设定时间

推进后**同步完成**：① 对虚拟时间已结束且未结算的比赛进行积分结算（猜中比分 +3 / 猜中胜负平 +1，事务保证幂等）；② 若某场完赛比赛缺少帖子，自动补生成 1 条帖子 + 2 条评论（种子数据已覆盖全部比赛，此为兜底）。
```json
{ "code": 0, "message": "时间推进成功",
  "data": { "virtualTime": "2026-07-11 18:00:00", "settled": 2, "generatedPosts": 2 } }
```

## 8. 积分规则

- 比赛结束后自动结算：预测比分与实际**完全一致** → +3 分；仅**胜负平方向**正确 → +1 分；否则 +0 分。
- 积分立即累加至用户 `points`，并在个人中心展示。

## 9. 种子账号

| 账号 | 密码 | 说明 |
|---|---|---|
| admin | admin123 | 管理员（时间控制台） |
| 小射手 / 小球王 / 小门神 / 小快马 / 小钢炮 / 小猎豹 / 小坦克 / 小马达 / 小旋风 / 小火箭 | 123456 | 演示用户（均以"小"字开头） |
