<template>
  <router-link :to="cardLink" class="card">
    <div class="card-top">
      <span :class="['badge', match.league === 'world_cup' ? 'badge-wc' : 'badge-spl']">
        {{ match.leagueText }}
      </span>
      <span>{{ match.round }}</span>
      <span class="card-time">{{ shortTime(match.matchTime) }}</span>
      <span v-if="match.status === 'live'" class="badge badge-live">LIVE</span>
      <span v-else-if="match.status === 'finished'" class="badge badge-finished">已完赛</span>
      <span v-else class="badge">未开赛</span>
    </div>
    <div class="card-body">
      <div class="team">{{ match.homeTeam }}</div>
      <div class="score">
        <template v-if="match.status === 'upcoming'">
          <span class="vs">VS</span>
        </template>
        <template v-else>
          <span :class="['num', scoreBig(match.homeScore, match.awayScore) === 'home' ? 'big' : '']">{{ match.homeScore }}</span>
          <span class="colon">:</span>
          <span :class="['num', scoreBig(match.homeScore, match.awayScore) === 'away' ? 'big' : '']">{{ match.awayScore }}</span>
        </template>
      </div>
      <div class="team">{{ match.awayTeam }}</div>
    </div>
    <div class="card-bottom">
      <span class="predict-count">🎯 {{ match.predictionCount }} 人预测</span>
      <span v-if="match.status === 'upcoming'" class="go-predict">去预测 →</span>
      <span v-else-if="match.status === 'live'" class="go-live">比分直播中…</span>
      <span v-else class="go-discuss">赛后讨论 →</span>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  match: { type: Object, required: true }
});

const route = useRoute();

const cardLink = computed(() => ({
  path: `/matches/${props.match.id}`,
  query: route.query.league ? { league: route.query.league } : {}
}));

function shortTime(t) {
  return t ? t.slice(5, 16) : '';
}

function scoreBig(h, a) {
  if (h === a) return '';
  return h > a ? 'home' : 'away';
}
</script>

<style scoped>
.card {
  display: block;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  color: var(--text);
  transition: border-color 0.15s, transform 0.15s;
}

.card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-dim);
}

.card-time {
  margin-left: auto;
}

.card-body {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 16px 0 10px;
}

.team {
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 20px;
  font-weight: 800;
}

.vs {
  color: var(--text-dim);
  font-size: 16px;
}

.num {
  min-width: 20px;
  text-align: center;
}

.big {
  color: var(--accent);
}

.colon {
  color: var(--text-dim);
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-dim);
  border-top: 1px dashed var(--border);
  padding-top: 10px;
}

.go-predict {
  color: var(--accent);
  font-weight: 600;
}

.go-live {
  color: var(--live);
  font-weight: 600;
}

.go-discuss {
  color: #c4b5fd;
  font-weight: 600;
}
</style>
