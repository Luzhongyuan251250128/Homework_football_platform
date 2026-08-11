<template>
  <div class="container">
    <router-link to="/leaderboard" class="back">← 返回排行榜</router-link>

    <div v-if="data" class="user-page">
      <div class="user-card">
        <div class="avatar">{{ data.user.nickname.slice(0, 1) }}</div>
        <div>
          <h1>{{ data.user.nickname }}</h1>
          <p class="dim small">@{{ data.user.username }} · {{ data.user.role === 'admin' ? '管理员' : '球迷' }}</p>
        </div>
        <div class="points-card">
          <div class="points-num">{{ data.user.points }}</div>
          <div class="dim small">累计积分</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-num">{{ data.stats.total }}</div>
          <div class="dim small">总预测</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ data.stats.settled }}</div>
          <div class="dim small">已出结果</div>
        </div>
        <div class="stat">
          <div class="stat-num green">{{ data.stats.exact }}</div>
          <div class="dim small">猜中比分 +3</div>
        </div>
        <div class="stat">
          <div class="stat-num blue">{{ data.stats.correct }}</div>
          <div class="dim small">猜中胜负 +1</div>
        </div>
        <div class="stat">
          <div class="stat-num dim">{{ data.stats.wrong }}</div>
          <div class="dim small">未猜中 +0</div>
        </div>
      </div>

      <div class="panel">
        <h3>过往预测（已出结果） <span class="count">{{ pastPredictions.length }} 场</span></h3>
        <p v-if="!pastPredictions.length" class="dim">还没有已出结果的预测</p>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>时间</th><th>轮次</th><th>对阵</th><th>预测</th><th>实际比分</th><th>得分</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in pastPredictions" :key="p.id">
                <td class="dim small">{{ shortTime(p.matchTime) }}</td>
                <td>{{ p.round }}</td>
                <td>
                  <router-link :to="`/matches/${p.matchId}`" class="match-link">{{ p.homeTeam }} vs {{ p.awayTeam }}</router-link>
                </td>
                <td><span class="chip">{{ p.predHome }} - {{ p.predAway }}</span></td>
                <td><span class="chip">{{ p.homeScore }} - {{ p.awayScore }}</span></td>
                <td>
                  <span class="pts-chip" :class="ptsClass(p.pointsAwarded)">+{{ p.pointsAwarded }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>未来预测（未开赛 / 进行中） <span class="count">{{ futurePredictions.length }} 场</span></h3>
        <p v-if="!futurePredictions.length" class="dim">暂无未结算的预测</p>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>时间</th><th>轮次</th><th>对阵</th><th>预测</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in futurePredictions" :key="p.id">
                <td class="dim small">{{ shortTime(p.matchTime) }}</td>
                <td>{{ p.round }}</td>
                <td>
                  <router-link :to="`/matches/${p.matchId}`" class="match-link">{{ p.homeTeam }} vs {{ p.awayTeam }}</router-link>
                </td>
                <td><span class="chip">{{ p.predHome }} - {{ p.predAway }}</span></td>
                <td>
                  <span v-if="p.status === 'live'" class="badge badge-live">进行中</span>
                  <span v-else class="badge">未开赛</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="dim">加载中…</div>
    <div v-else class="msg-error">用户不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';
import { useVtimeStore } from '../store/vtime';

const route = useRoute();
const vtimeStore = useVtimeStore();

const data = ref(null);
const loading = ref(true);

const pastPredictions = computed(() =>
  (data.value?.predictions || []).filter((p) => p.status === 'finished')
);
const futurePredictions = computed(() =>
  (data.value?.predictions || []).filter((p) => p.status !== 'finished')
);

const ptsClass = (v) => (v === 3 ? 'pts-exact' : v === 1 ? 'pts-correct' : 'pts-wrong');

function shortTime(t) {
  return t ? t.slice(5, 16) : '';
}

async function fetchUser() {
  loading.value = true;
  try {
    data.value = await api.get(`/users/${route.params.id}/predictions`);
  } catch (err) {
    data.value = null;
  } finally {
    loading.value = false;
  }
}

watch(() => vtimeStore.virtualTime, () => {
  fetchUser();
});

onMounted(() => {
  fetchUser();
});
</script>

<style scoped>
.back {
  font-size: 13px;
  color: var(--text-dim);
  display: inline-block;
  margin-bottom: 12px;
}

.back:hover {
  color: var(--accent);
}

.user-page {
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

.dim {
  color: var(--text-dim);
}

.small {
  font-size: 12px;
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

.pts-exact { background: rgba(34, 197, 94, 0.2); color: #86efac; }
.pts-correct { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.pts-wrong { background: rgba(148, 163, 184, 0.15); color: var(--text-dim); }
</style>
