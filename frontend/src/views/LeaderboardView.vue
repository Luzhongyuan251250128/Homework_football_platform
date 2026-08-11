<template>
  <div class="container">
    <div class="page-head">
      <h1>🏆 积分排行榜</h1>
      <p class="sub">猜中比分 +3 / 猜中胜负平 +1，结算后榜单实时更新</p>
    </div>

    <div v-if="myRank" class="my-rank">
      我的排名：<b>第 {{ myRank.rank }} 名</b> · {{ myRank.nickname }} · {{ myRank.points }} 分
    </div>

    <div v-if="loading" class="dim">加载中…</div>

    <template v-else-if="top3.length">
      <div class="podium">
        <div v-for="(u, idx) in top3" :key="u.userId" class="podium-card" :class="`medal-${idx + 1}`">
          <div class="medal">{{ ['🥇', '🥈', '🥉'][idx] }}</div>
          <div class="p-name">{{ u.nickname }}</div>
          <div class="p-points">{{ u.points }}</div>
          <div class="p-detail">猜中比分 {{ u.exactCount }} 次 · 猜中胜负 {{ u.correctCount }} 次</div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>用户</th>
              <th>总预测</th>
              <th>猜中比分</th>
              <th>猜中胜负</th>
              <th>积分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in rest"
              :key="u.userId"
              :class="{ 'my-row': isMe(u) }"
            >
              <td>
                <span class="rank-num">{{ u.rank }}</span>
              </td>
              <td>
                <span class="nick">{{ u.nickname }}</span>
                <span v-if="isMe(u)" class="me-tag">我</span>
              </td>
              <td>{{ u.totalPredictions }}</td>
              <td class="green">{{ u.exactCount }}</td>
              <td class="blue">{{ u.correctCount }}</td>
              <td class="points">{{ u.points }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p v-else class="empty">暂无数据</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { useVtimeStore } from '../store/vtime';

const userStore = useUserStore();
const vtimeStore = useVtimeStore();

const leaderboard = ref([]);
const myRank = ref(null);
const loading = ref(true);

const top3 = computed(() => leaderboard.value.slice(0, 3));
const rest = computed(() => leaderboard.value.slice(3));

function isMe(u) {
  return userStore.user && u.userId === userStore.user.id;
}

async function fetchData() {
  loading.value = true;
  try {
    const data = await api.get('/leaderboard');
    leaderboard.value = data.leaderboard;
    myRank.value = data.myRank || null;
  } catch (err) {
    console.error(err.message);
  } finally {
    loading.value = false;
  }
}

watch(() => vtimeStore.virtualTime, () => {
  fetchData();
});

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.page-head {
  margin-bottom: 16px;
}

.page-head h1 {
  font-size: 26px;
}

.sub {
  color: var(--text-dim);
  font-size: 13px;
  margin-top: 6px;
}

.my-rank {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  margin-bottom: 16px;
}

.my-rank b {
  color: var(--accent);
}

.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.podium-card {
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.podium-card.medal-1 {
  border-color: #f59e0b;
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.25);
}

.podium-card.medal-2 {
  border-color: #94a3b8;
  box-shadow: 0 0 14px rgba(148, 163, 184, 0.2);
}

.podium-card.medal-3 {
  border-color: #b45309;
  box-shadow: 0 0 14px rgba(180, 83, 9, 0.2);
}

.medal {
  font-size: 34px;
  margin-bottom: 6px;
}

.p-name {
  font-size: 18px;
  font-weight: 800;
}

.p-points {
  font-size: 30px;
  font-weight: 900;
  color: var(--orange);
  margin: 6px 0;
}

.p-detail {
  font-size: 12px;
  color: var(--text-dim);
}

.table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 14px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  text-align: left;
  color: var(--text-dim);
  font-weight: 500;
  padding: 10px;
  border-bottom: 1px solid var(--border);
}

td {
  padding: 10px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
}

tr:last-child td {
  border-bottom: none;
}

tr.my-row {
  background: rgba(34, 197, 94, 0.08);
}

tr.my-row td {
  border-top: 1px solid rgba(34, 197, 94, 0.3);
  border-bottom: 1px solid rgba(34, 197, 94, 0.3);
}

.rank-num {
  display: inline-block;
  min-width: 28px;
  font-weight: 700;
  color: var(--text-dim);
}

.nick {
  font-weight: 700;
}

.me-tag {
  background: var(--accent);
  color: #052e16;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  margin-left: 6px;
}

.green {
  color: var(--accent);
  font-weight: 600;
}

.blue {
  color: var(--blue);
  font-weight: 600;
}

.points {
  color: var(--orange);
  font-weight: 800;
  font-size: 15px;
}

.empty {
  color: var(--text-dim);
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 30px;
  text-align: center;
}
</style>
