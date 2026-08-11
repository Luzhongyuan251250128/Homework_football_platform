<template>
  <div class="container">
    <router-link :to="backLink" class="back">← 返回赛事列表</router-link>

    <div v-if="data" class="team-page">
      <div class="team-head">
        <div class="team-title">
          <h1>{{ data.team.name }}</h1>
          <span :class="['badge', data.team.league === 'world_cup' ? 'badge-wc' : 'badge-spl']">
            {{ data.team.leagueText }}
          </span>
          <span class="badge">{{ data.team.type }}</span>
        </div>
        <p class="desc">{{ data.team.description }}</p>
      </div>

      <div class="record-cards">
        <div class="r-card"><div class="r-num">{{ record.played }}</div><div class="r-label">场次</div></div>
        <div class="r-card green"><div class="r-num">{{ record.wins }}</div><div class="r-label">胜</div></div>
        <div class="r-card yellow"><div class="r-num">{{ record.draws }}</div><div class="r-label">平</div></div>
        <div class="r-card red"><div class="r-num">{{ record.losses }}</div><div class="r-label">负</div></div>
        <div class="r-card"><div class="r-num">{{ record.goalsFor }}:{{ record.goalsAgainst }}</div><div class="r-label">进:失球</div></div>
        <div class="r-card"><div class="r-num">{{ record.winRate }}%</div><div class="r-label">胜率</div></div>
      </div>

      <div class="panel">
        <h3>过往比赛 <span class="count">{{ data.matches.length }} 场</span></h3>
        <div v-if="!data.matches.length" class="dim">暂无比赛记录</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>时间</th><th>轮次</th><th>对阵</th><th>比分</th><th>结果</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in data.matches" :key="m.matchId">
                <td class="dim small">{{ shortTime(m.matchTime) }}</td>
                <td>{{ m.round }}</td>
                <td>
                  <router-link :to="`/teams/${m.homeTeam}`" class="team-link" @click.stop>{{ m.homeTeam }}</router-link>
                  vs
                  <router-link :to="`/teams/${m.awayTeam}`" class="team-link" @click.stop>{{ m.awayTeam }}</router-link>
                </td>
                <td>
                  <span v-if="m.status === 'upcoming'" class="dim">VS</span>
                  <span v-else>{{ m.homeScore }} - {{ m.awayScore }}</span>
                </td>
                <td>
                  <span v-if="m.status === 'live'" class="badge badge-live">进行中</span>
                  <span v-else-if="m.result === 'win'" class="badge badge-win">胜</span>
                  <span v-else-if="m.result === 'draw'" class="badge badge-draw">平</span>
                  <span v-else-if="m.result === 'loss'" class="badge badge-loss">负</span>
                  <span v-else class="dim">待赛</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>
          我在 {{ data.team.name }} 身上的预测
          <span class="count">{{ data.heat.totalPredictions }} 人次预测过该队比赛</span>
        </h3>
        <template v-if="userStore.isLoggedIn">
          <div v-if="myStats.total" class="my-stats">
            <span class="stat-chip">共预测 {{ myStats.total }} 条</span>
            <span class="stat-chip green">猜中比分 {{ myStats.exact }} 次</span>
            <span class="stat-chip blue">猜中胜负 {{ myStats.correct }} 次</span>
            <span class="stat-chip dim">未中 {{ myStats.wrong }} 次</span>
            <span class="stat-chip orange">累计得分 {{ myStats.pointsEarned }} 分</span>
          </div>
          <div v-if="myPredictions.length" class="table-wrap">
            <table>
              <thead>
                <tr><th>比赛</th><th>我的预测</th><th>实际比分</th><th>状态</th><th>得分</th></tr>
              </thead>
              <tbody>
                <tr v-for="p in myPredictions" :key="p.id">
                  <td>
                    <router-link :to="`/matches/${p.matchId}`" class="match-link">{{ p.homeTeam }} vs {{ p.awayTeam }}</router-link>
                  </td>
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
                    <span v-if="p.pointsAwarded === null" class="dim">—</span>
                    <span v-else class="pts-chip" :class="ptsClass(p.pointsAwarded)">+{{ p.pointsAwarded }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="dim">你还没有预测过 {{ data.team.name }} 的比赛，去试试手气！</p>
        </template>
        <p v-else class="dim">
          登录后查看你对该队比赛的历史预测与准确次数 <router-link to="/login">去登录</router-link>
        </p>
      </div>

      <div class="panel discussion">
        <h3>球队评价区 <span class="count">{{ teamComments.length }} 条</span></h3>
        <div class="post-form">
          <textarea
            v-model="newComment"
            class="input"
            rows="2"
            maxlength="300"
            :placeholder="userStore.isLoggedIn ? '说说你对这支球队的看法…' : '登录后可评价'"
            :disabled="!userStore.isLoggedIn"
          ></textarea>
          <button class="btn btn-sm" :disabled="!userStore.isLoggedIn || submitting || !newComment.trim()" @click="submitComment(null, newComment.trim())">
            发布评价
          </button>
        </div>
        <p v-if="commentError" class="msg-error pred-err">{{ commentError }}</p>

        <div class="comment-list">
          <div v-for="c in topComments" :key="c.id" class="comment-item">
            <div class="comment-main">
              <router-link :to="`/users/${c.author.userId}`" class="nick-link">{{ c.author.nickname }}</router-link>
              <span class="dim small">{{ c.createdAt }}</span>
            </div>
            <p class="comment-text">{{ c.content }}</p>
            <div class="comment-actions">
              <button v-if="userStore.isLoggedIn" class="reply-btn" @click="toggleReply(c)">回复</button>
            </div>
            <div v-if="replyTarget === c.id" class="reply-form">
              <input
                v-model="replyText"
                class="input comment-input"
                :placeholder="`回复 @${c.author.nickname}…`"
                maxlength="300"
                @keyup.enter="submitReply(c)"
              />
              <button class="btn btn-sm" :disabled="submitting || !replyText.trim()" @click="submitReply(c)">发送</button>
            </div>

            <div class="replies">
              <div v-for="r in repliesOf(c.id)" :key="r.id" class="reply-item">
                <div>
                  <router-link :to="`/users/${r.author.userId}`" class="nick-link small">{{ r.author.nickname }}</router-link>
                  <span class="dim small">回复 @{{ parentNick(r.parentId) }}：</span>
                  <span class="small">{{ r.content }}</span>
                </div>
                <div class="dim small">{{ r.createdAt }}</div>
              </div>
            </div>
          </div>
          <p v-if="!topComments.length" class="dim">还没有评价，来抢沙发！</p>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="dim">加载中…</div>
    <div v-else class="msg-error">球队不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';
import { useUserStore } from '../store/user';
import { useVtimeStore } from '../store/vtime';

const route = useRoute();
const userStore = useUserStore();
const vtimeStore = useVtimeStore();

const backLink = computed(() =>
  data.value ? { path: '/', query: { league: data.value.team.league } } : '/'
);

const data = ref(null);
const loading = ref(true);
const teamComments = ref([]);
const newComment = ref('');
const replyTarget = ref(null);
const replyText = ref('');
const submitting = ref(false);
const commentError = ref('');

const record = computed(() => data.value?.record || { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, winRate: 0 });
const myPredictions = computed(() => data.value?.myPredictions?.list || []);
const myStats = computed(() => data.value?.myPredictions?.stats || { total: 0, exact: 0, correct: 0, wrong: 0, pointsEarned: 0 });
const topComments = computed(() => teamComments.value.filter((c) => !c.parentId));
const repliesOf = (id) => teamComments.value.filter((c) => c.parentId === id);

const parentNick = (parentId) => {
  const p = teamComments.value.find((c) => c.id === parentId);
  return p ? p.author.nickname : '';
};

const ptsClass = (v) => (v === 3 ? 'pts-exact' : v === 1 ? 'pts-correct' : 'pts-wrong');

function shortTime(t) {
  return t ? t.slice(5, 16) : '';
}

async function fetchTeam() {
  loading.value = true;
  try {
    data.value = await api.get(`/teams/${encodeURIComponent(route.params.name)}`);
  } catch (err) {
    data.value = null;
  } finally {
    loading.value = false;
  }
}

async function fetchComments() {
  try {
    teamComments.value = await api.get(`/teams/${encodeURIComponent(route.params.name)}/comments`);
  } catch (err) {
    console.error(err.message);
  }
}

function toggleReply(c) {
  replyTarget.value = replyTarget.value === c.id ? null : c.id;
  replyText.value = '';
}

async function submitComment(parentId, text) {
  if (!text || !text.trim()) return;
  submitting.value = true;
  commentError.value = '';
  try {
    const body = { content: text };
    if (parentId) body.parent_id = parentId;
    await api.post(`/teams/${encodeURIComponent(route.params.name)}/comments`, body);
    newComment.value = '';
    replyText.value = '';
    replyTarget.value = null;
    await fetchComments();
  } catch (err) {
    commentError.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function submitReply(c) {
  if (!replyText.value.trim()) return;
  await submitComment(c.id, replyText.value.trim());
}

watch(() => vtimeStore.virtualTime, () => {
  fetchTeam();
});

onMounted(() => {
  fetchTeam();
  fetchComments();
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

.team-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.team-head {
  background: linear-gradient(135deg, var(--bg-card), #16233d);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
}

.team-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.team-title h1 {
  font-size: 26px;
}

.desc {
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1.7;
}

.record-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.r-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.r-num {
  font-size: 22px;
  font-weight: 800;
}

.r-label {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 4px;
}

.r-card.green .r-num { color: var(--accent); }
.r-card.yellow .r-num { color: var(--orange); }
.r-card.red .r-num { color: var(--live); }

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.panel h3 {
  font-size: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

.team-link {
  color: var(--text);
  font-weight: 600;
}

.team-link:hover {
  color: var(--accent);
}

.match-link {
  color: var(--text);
  font-weight: 600;
}

.match-link:hover {
  color: var(--accent);
}

.badge-win {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.4);
}

.badge-draw {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.4);
}

.badge-loss {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.4);
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

.my-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.stat-chip {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
}

.stat-chip.green { color: #86efac; border-color: rgba(34, 197, 94, 0.4); }
.stat-chip.blue { color: #93c5fd; border-color: rgba(59, 130, 246, 0.4); }
.stat-chip.orange { color: #fcd34d; border-color: rgba(245, 158, 11, 0.4); }

.post-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.post-form .btn {
  align-self: flex-end;
}

.pred-err {
  margin-bottom: 10px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}

.comment-main {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.nick {
  font-weight: 600;
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
}

.comment-actions {
  margin-top: 6px;
}

.reply-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 12px;
  padding: 0;
}

.reply-btn:hover {
  color: var(--accent);
}

.reply-form {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.comment-input {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
}

.replies {
  border-left: 2px solid var(--border);
  padding-left: 12px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reply-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--text-dim);
}
</style>
