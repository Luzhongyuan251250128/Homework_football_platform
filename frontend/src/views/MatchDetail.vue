<template>
  <div class="container">
    <router-link to="/" class="back">← 返回赛事列表</router-link>

    <div v-if="match" class="detail">
      <div class="info-bar">
        <span :class="['badge', match.league === 'world_cup' ? 'badge-wc' : 'badge-spl']">
          {{ match.leagueText }}
        </span>
        <span>{{ match.round }}</span>
        <span class="dim">{{ match.matchTime }}</span>
        <span v-if="match.status === 'live'" class="badge badge-live">LIVE 直播中</span>
        <span v-else-if="match.status === 'finished'" class="badge badge-finished">已完赛</span>
        <span v-else class="badge">未开赛</span>
      </div>

      <div class="scoreboard">
        <div class="team-block">
          <div class="team-name">{{ match.homeTeam }}</div>
        </div>
        <div class="score-block">
          <template v-if="match.status === 'upcoming'">
            <div class="vs">VS</div>
            <div class="dim small">比赛尚未开始</div>
          </template>
          <template v-else>
            <div class="score-nums">
              <span>{{ match.homeScore }}</span>
              <span class="colon">:</span>
              <span>{{ match.awayScore }}</span>
            </div>
            <div class="dim small">{{ match.status === 'live' ? '比赛进行中，比分实时刷新' : '最终比分' }}</div>
          </template>
        </div>
        <div class="team-block">
          <div class="team-name">{{ match.awayTeam }}</div>
        </div>
      </div>

      <div class="predict-stats">
        <span>🎯 {{ match.predictionCount }} 人参与预测</span>
        <span v-if="match.scoreDistribution?.length" class="dim">热门预测：
          <span v-for="d in match.scoreDistribution" :key="d.score" class="chip">{{ d.score }} ×{{ d.count }}</span>
        </span>
      </div>

      <div class="panel">
        <h3>我的预测</h3>
        <template v-if="!userStore.isLoggedIn">
          <p class="dim">登录后可参与比分预测（猜中比分 +3 分，猜中胜负平 +1 分）</p>
          <router-link to="/login" class="btn btn-sm">去登录</router-link>
        </template>
        <template v-else-if="myPrediction">
          <div class="my-pred">
            <span class="chip">我的预测：{{ myPrediction.predHome }} - {{ myPrediction.predAway }}</span>
            <span v-if="match.status === 'upcoming'" class="dim">等待开赛，锁定结果</span>
            <span v-else-if="match.status === 'live'" class="dim">比赛进行中</span>
            <span v-else class="pts-chip" :class="ptsClass">
              {{ ptsText }}
            </span>
          </div>
        </template>
        <template v-else-if="match.status === 'upcoming'">
          <p class="dim">预测 {{ match.homeTeam }} vs {{ match.awayTeam }} 的比分</p>
          <div class="pred-form">
            <input v-model.number="predHome" type="number" min="0" max="20" class="input score-input" placeholder="0" />
            <span class="colon">:</span>
            <input v-model.number="predAway" type="number" min="0" max="20" class="input score-input" placeholder="0" />
            <button class="btn" :disabled="submitting || !validScores" @click="submitPrediction">提交预测</button>
          </div>
          <p v-if="error" class="msg-error pred-err">{{ error }}</p>
        </template>
        <template v-else>
          <p class="dim">{{ match.status === 'live' ? '比赛进行中，无法预测' : '比赛已结束，预测窗口已关闭' }}</p>
        </template>
      </div>

      <div class="panel">
        <h3>其他用户预测
          <button v-if="showPredictions" class="btn btn-sm btn-outline" @click="showPredictions = false">收起</button>
          <button v-else class="btn btn-sm btn-outline" @click="togglePredictions">查看</button>
        </h3>
        <template v-if="showPredictions">
          <p v-if="!predLoading && !predictions.length" class="dim">还没有人预测这场比赛</p>
          <div v-if="!predLoading" class="pred-list">
            <div v-for="p in predictions" :key="p.userId + '-' + p.predHome" class="pred-item">
              <span class="nick">{{ p.nickname }}</span>
              <span class="chip">{{ p.predHome }} - {{ p.predAway }}</span>
              <span v-if="match.status === 'finished'" class="pts-chip" :class="ptsClass(p.pointsAwarded)">
                {{ ptsText(p.pointsAwarded) }}
              </span>
            </div>
          </div>
          <p v-else class="dim">加载中…</p>
        </template>
      </div>

      <div class="panel discussion">
        <h3>赛后讨论区</h3>
        <template v-if="match.status !== 'finished'">
          <p class="dim">{{ match.status === 'live' ? '比赛结束后开放讨论区' : '讨论区将在比赛结束后开放' }}</p>
        </template>
        <template v-else>
          <div v-if="userStore.isLoggedIn" class="post-form">
            <textarea v-model="newPost" class="input" rows="2" maxlength="500" placeholder="聊聊这场比赛…"></textarea>
            <button class="btn btn-sm" :disabled="posting || !newPost.trim()" @click="submitPost">发布帖子</button>
          </div>
          <p v-else class="dim">登录后参与讨论 <router-link to="/login">去登录</router-link></p>
          <p v-if="postError" class="msg-error pred-err">{{ postError }}</p>

          <div v-if="!postsLoading" class="post-list">
            <p v-if="!posts.length" class="dim">暂无讨论，来抢沙发！</p>
            <div v-for="post in posts" :key="post.id" class="post-item">
              <div class="post-head">
                <span class="nick">{{ post.author.nickname }}</span>
                <span class="dim small">{{ post.createdAt }}</span>
              </div>
              <p class="post-content">{{ post.content }}</p>
              <div class="comments">
                <div v-for="c in post.comments" :key="c.id" class="comment-item">
                  <span class="nick small">{{ c.author.nickname }}：</span>
                  <span>{{ c.content }}</span>
                </div>
              </div>
              <div class="comment-form">
                <input
                  v-model="commentTexts[post.id]"
                  class="input comment-input"
                  :placeholder="userStore.isLoggedIn ? '写评论…' : '登录后评论'"
                  :disabled="!userStore.isLoggedIn"
                  maxlength="300"
                  @keyup.enter="submitComment(post)"
                />
                <button
                  class="btn btn-sm"
                  :disabled="!userStore.isLoggedIn || commenting || !(commentTexts[post.id] || '').trim()"
                  @click="submitComment(post)"
                >
                  评论
                </button>
              </div>
            </div>
          </div>
          <p v-else class="dim">加载中…</p>
        </template>
      </div>
    </div>

    <div v-else-if="loading" class="dim">加载中…</div>
    <div v-else class="msg-error">比赛不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';
import { useUserStore } from '../store/user';
import { useVtimeStore } from '../store/vtime';

const route = useRoute();
const userStore = useUserStore();
const vtimeStore = useVtimeStore();

const match = ref(null);
const loading = ref(true);
const error = ref('');
const postError = ref('');
const predHome = ref(0);
const predAway = ref(0);
const submitting = ref(false);
const showPredictions = ref(false);
const predLoading = ref(false);
const predictions = ref([]);
const newPost = ref('');
const posting = ref(false);
const posts = ref([]);
const postsLoading = ref(true);
const commenting = ref(false);
const commentTexts = ref({});
let timer = null;

const myPrediction = computed(() => match.value?.myPrediction || null);
const validScores = computed(() =>
  Number.isInteger(predHome.value) && Number.isInteger(predAway.value) &&
  predHome.value >= 0 && predHome.value <= 20 &&
  predAway.value >= 0 && predAway.value <= 20
);

const ptsText = (v) => {
  const pts = v ?? myPrediction.value?.pointsAwarded;
  if (pts === undefined || pts === null) return '';
  if (pts === 3) return '+3 猜中比分';
  if (pts === 1) return '+1 猜中胜负';
  return '+0 未猜中';
};
const ptsClass = (v) => {
  const pts = v ?? myPrediction.value?.pointsAwarded;
  if (pts === 3) return 'pts-exact';
  if (pts === 1) return 'pts-correct';
  return 'pts-wrong';
};

async function fetchMatch() {
  loading.value = true;
  try {
    match.value = await api.get(`/matches/${route.params.id}`);
  } catch (err) {
    match.value = null;
  } finally {
    loading.value = false;
  }
}

async function fetchPosts() {
  postsLoading.value = true;
  try {
    posts.value = await api.get(`/matches/${route.params.id}/posts`);
  } catch (err) {
    console.error(err.message);
  } finally {
    postsLoading.value = false;
  }
}

async function fetchPredictions() {
  predLoading.value = true;
  try {
    const data = await api.get(`/matches/${route.params.id}/predictions`);
    predictions.value = data.predictions;
  } catch (err) {
    predictions.value = [];
    error.value = err.message;
  } finally {
    predLoading.value = false;
  }
}

function togglePredictions() {
  showPredictions.value = !showPredictions.value;
  if (showPredictions.value && !predictions.value.length) {
    fetchPredictions();
  }
}

async function submitPrediction() {
  submitting.value = true;
  error.value = '';
  try {
    await api.post(`/matches/${route.params.id}/predictions`, {
      pred_home: predHome.value,
      pred_away: predAway.value
    });
    await fetchMatch();
    predHome.value = 0;
    predAway.value = 0;
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function submitPost() {
  posting.value = true;
  postError.value = '';
  try {
    await api.post(`/matches/${route.params.id}/posts`, { content: newPost.value.trim() });
    newPost.value = '';
    await fetchPosts();
  } catch (err) {
    postError.value = err.message;
  } finally {
    posting.value = false;
  }
}

async function submitComment(post) {
  const text = (commentTexts.value[post.id] || '').trim();
  if (!text) return;
  commenting.value = true;
  try {
    await api.post(`/posts/${post.id}/comments`, { content: text });
    commentTexts.value[post.id] = '';
    await fetchPosts();
  } catch (err) {
    alert(err.message);
  } finally {
    commenting.value = false;
  }
}

watch(() => vtimeStore.virtualTime, () => {
  fetchMatch();
  fetchPosts();
});

onMounted(() => {
  fetchMatch();
  fetchPosts();
  timer = setInterval(() => {
    fetchMatch();
    if (match.value?.status === 'finished') fetchPosts();
  }, 10000);
});

onUnmounted(() => {
  clearInterval(timer);
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

.detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.dim {
  color: var(--text-dim);
}

.small {
  font-size: 12px;
}

.scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, var(--bg-card), #16233d);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 26px 20px;
}

.team-name {
  font-size: 20px;
  font-weight: 800;
  text-align: center;
}

.score-block {
  text-align: center;
}

.vs {
  font-size: 30px;
  font-weight: 800;
  color: var(--text-dim);
}

.score-nums {
  font-size: 42px;
  font-weight: 900;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.colon {
  color: var(--text-dim);
}

.predict-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
}

.chip {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #86efac;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  margin-right: 6px;
  display: inline-block;
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
  display: flex;
  align-items: center;
  gap: 10px;
}

.pred-form {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.score-input {
  width: 80px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
}

.pred-err {
  margin-top: 10px;
}

.my-pred {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pred-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.pred-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}

.nick {
  font-weight: 600;
}

.pts-chip {
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  margin-left: auto;
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

.post-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.post-form .btn {
  align-self: flex-end;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-item {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}

.post-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.post-content {
  font-size: 14px;
  line-height: 1.6;
}

.comments {
  margin: 10px 0;
  border-left: 2px solid var(--border);
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comment-item {
  font-size: 13px;
  color: var(--text-dim);
}

.comment-form {
  display: flex;
  gap: 8px;
}

.comment-input {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
}
</style>
