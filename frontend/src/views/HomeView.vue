<template>
  <div class="container">
    <div class="page-head">
      <h1>赛事中心</h1>
      <p class="sub">世界杯 / 苏超（江苏省城市足球联赛）赛程、比分与预测</p>
    </div>

    <div class="rules-box">
      <div class="rules-title">🎯 得分要求</div>
      <div class="rules-items">
        <span class="rule-item"><b>猜中准确比分</b> +3 分</span>
        <span class="rule-item"><b>猜中胜平负方向</b> +1 分</span>
        <span class="rule-item">猜错 +0 分</span>
        <span class="rule-item">比赛结束后自动结算，积分计入个人中心与排行榜</span>
      </div>
    </div>

    <div class="league-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="tab"
        :class="{ active: league === tab.value }"
        @click="selectLeague(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <section v-for="group in groups" :key="group.key" class="group">
      <h2 class="group-title">
        <span :class="['dot', group.key]"></span>
        {{ group.label }}
        <span class="count">{{ group.matches.length }} 场</span>
      </h2>
      <div v-if="group.matches.length" class="grid">
        <MatchCard v-for="m in group.matches" :key="m.id" :match="m" />
      </div>
      <p v-else class="empty">该分类暂无比赛</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useVtimeStore } from '../store/vtime';
import MatchCard from '../components/MatchCard.vue';

const route = useRoute();
const router = useRouter();
const vtimeStore = useVtimeStore();

const tabs = [
  { label: '全部', value: '' },
  { label: '世界杯', value: 'world_cup' },
  { label: '苏超', value: 'spl' }
];

const league = ref(route.query.league || '');
const matches = ref([]);
const loading = ref(true);
let timer = null;

const groups = computed(() => {
  const byStatus = {
    upcoming: [],
    live: [],
    finished: []
  };
  matches.value.forEach((m) => {
    if (byStatus[m.status]) byStatus[m.status].push(m);
  });
  return [
    { key: 'upcoming', label: '未开赛', matches: byStatus.upcoming },
    { key: 'live', label: '进行中', matches: byStatus.live },
    { key: 'finished', label: '已完赛', matches: byStatus.finished }
  ];
});

async function fetchData() {
  loading.value = true;
  try {
    const params = {};
    if (league.value) params.league = league.value;
    const data = await api.get('/matches', { params });
    matches.value = data.matches;
    if (data.virtualTime) vtimeStore.virtualTime = data.virtualTime;
  } catch (err) {
    console.error(err.message);
  } finally {
    loading.value = false;
  }
}

function selectLeague(value) {
  league.value = value;
  router.replace({ query: value ? { league: value } : {} });
}

watch(league, () => {
  fetchData();
});

watch(
  () => route.query.league,
  (v) => {
    const next = v || '';
    if (next !== league.value) league.value = next;
  }
);

onMounted(() => {
  fetchData();
  timer = setInterval(fetchData, 10000);
});

onUnmounted(() => {
  clearInterval(timer);
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

.league-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.rules-box {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.35);
  border-left: 4px solid var(--accent);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.rules-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--accent);
  white-space: nowrap;
}

.rules-items {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rule-item {
  font-size: 13px;
  color: var(--text-dim);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 12px;
  white-space: nowrap;
}

.rule-item b {
  color: var(--text);
  margin-right: 4px;
}

.tab {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: 999px;
  padding: 6px 22px;
  font-size: 14px;
  transition: all 0.15s;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #052e16;
  font-weight: 700;
}

.group {
  margin-bottom: 28px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  margin-bottom: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.upcoming {
  background: var(--blue);
}

.dot.live {
  background: var(--live);
  animation: pulse 1.2s infinite;
}

.dot.finished {
  background: var(--text-dim);
}

.count {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 400;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.empty {
  color: var(--text-dim);
  font-size: 13px;
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
}
</style>
