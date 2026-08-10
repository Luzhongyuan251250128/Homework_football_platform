const express = require('express');
const vtime = require('../vtime');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

router.put('/admin/time', adminRequired, async (req, res) => {
  const { hours, minutes, virtual_time: virtualTime } = req.body || {};
  const current = await vtime.getVTime();
  let next = null;

  if (Number.isFinite(Number(hours))) {
    next = new Date(current.getTime() + Number(hours) * 3600000);
  } else if (Number.isFinite(Number(minutes))) {
    next = new Date(current.getTime() + Number(minutes) * 60000);
  } else if (typeof virtualTime === 'string' && virtualTime.trim()) {
    const parsed = new Date(virtualTime.trim().replace('T', ' '));
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ code: 400, message: '时间格式错误，示例：2026-07-11 18:00:00' });
    }
    next = parsed;
  } else {
    return res.status(400).json({
      code: 400,
      message: '请提供 hours、minutes 或 virtual_time 之一'
    });
  }

  if (next.getTime() === current.getTime()) {
    return res.json({ code: 0, message: 'ok', data: { virtualTime: vtime.fmtDate(next), settled: 0, generatedPosts: 0 } });
  }
  await vtime.setVTime(vtime.fmtDate(next));
  const result = await vtime.settleDueMatches();

  res.json({
    code: 0,
    message: '时间推进成功',
    data: { virtualTime: vtime.fmtDate(next), ...result }
  });
});

module.exports = router;
