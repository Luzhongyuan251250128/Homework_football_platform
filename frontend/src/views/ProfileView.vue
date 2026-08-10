<template>
  <div class="container">
    <div v-if="userStore.user" class="profile">
      <div class="user-card">
        <div class="avatar">{{ userStore.user.nickname.slice(0, 1) }}</div>
        <div>
          <h1>{{ userStore.user.nickname }}</h1>
          <p class="dim small">@{{ userStore.user.username }} · {{ userStore.user.role === 'admin' ? '管理员' : '球迷' }}</p>
        </div>
        <div class="points-card">
          <div class="points-num">{{ points?.total ?? userStore.user.points }}</div>
          <div class="dim small">累计积分</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-num">{{ points?.stats.totalPredictions ?? 0 }}</div>
          <div class="dim small">总预测</div>
        </div>
        <div class="stat">
          <div class="stat-num green">{{ points?.stats.exact ?? 0 }}</div>
          <div class="dim small">猜中比分 +3</div>
        </div>
        <div class="stat">
          <div class="stat-num blue">{{ points?.stats.correct ?? 0 }}</div>
          <div class="dim small">猜中胜负 +1</div>
        </div>
        <div class="stat">
          <div class="stat-num dim">{{ points?.stats.wrong ?? 0 }}</div>
          <div class="dim small">未猜中 +0</div>
        </div>
      </div>

      <div class="panel">
        <h3>我的预测记录 <span class="count">{{ predictions.length }} 条</span></h3>
        <p v-if="!predictions.length" class="dim">还没有预测记录，去首页挑一场比赛试试吧！</p>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>比赛</th>
                <th>轮次</th>
                <th>我的预测</th>
                <th>实际比分</th>
                <th>状态</th>
                <th>得分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in predictions" :key="p.id">
                <td class="match-cell">
                  <router-link :to="`/matches/${p.matchId}`" class="match-link">
                    {{ p.homeTeam }} vs {{ p.awayTeam }}
                  </router-link>
                </td>
                <td>{{ p.round }}</td>
                <td><span class="chip">{{ p.predHome }} - {{ p.predAway }}</span></td>
                <td>
                  <span v-if="p.status === 'upcoming'" class="dim">待定</span>
                  <span v-else class="chip">{{ p.homeScore }} - {{ p.awayScore }}</span>
                </td>
                <td>
                  <span v-if="p.status === 'live'" class="badge badge-live">进行中</span>
                  <span v-else-if="p.status === 'finished'" class="badge badge-finished">已完赛</span>
                  <span v-else class="badge">未开赛</span>
                </td>
                <td>
                  <span v-if="p.status === 'finished'" class="pts-chip" :class="ptsClass(p.pointsAwarded)">
                    +{{ p.pointsAwarded }}
                  </span>
                  <span v-else class="dim">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <p v-else class="dim">加载中…</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import { useUserStore } from '../store/user';

const userStore = useUserStore();
const predictions = ref([]);
const points = ref(null);

const ptsClass = (v) => {
  if (v === 3) return 'pts-exact';
  if (v === 1) return 'pts-correct';
  return 'pts-wrong';
};

onMounted(async () => {
  try {
    const [predData, ptsData] = await Promise.all([
      api.get('/me/predictions'),
      api.get('/me/points')
    ]);
    predictions.value = predData;
    points.value = ptsData;
  } catch (err) {
    console.error(err.message);
  }
});
</script>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, var(--bg-card), #16233d);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: #052e16;
  font-size: 26px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.points-card {
  margin-left: auto;
  text-align: center;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 12px;
  padding: 10px 22px;
}

.points-num {
  font-size: 30px;
  font-weight: 900;
  color: var(--orange);
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.stat {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-num {
  font-size: 24px;
  font-weight: 800;
}

.stat-num.green {
  color: var(--accent);
}

.stat-num.blue {
  color: var(--blue);
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.panel h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.count {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 400;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  text-align: left;
  color: var(--text-dim);
  font-weight: 500;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

td {
  padding: 10px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  white-space: nowrap;
}

.match-link {
  color: var(--text);
  font-weight: 600;
}

.match-link:hover {
  color: var(--accent);
}

.chip {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #86efac;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  display: inline-block;
}

.pts-chip {
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
}

.pts-exact {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.pts-correct {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.pts-wrong {
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-dim);
}
</style>
