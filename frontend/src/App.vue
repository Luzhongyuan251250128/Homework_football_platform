<template>
  <div class="layout">
    <header class="header">
      <div class="container header-inner">
        <router-link to="/" class="brand">
          <span class="brand-ball">⚽</span> 赛事互动预测平台
        </router-link>
        <nav class="nav">
          <router-link to="/">赛事</router-link>
          <router-link to="/leaderboard">排行榜</router-link>
          <router-link v-if="userStore.isLoggedIn" to="/profile">个人中心</router-link>
        </nav>
        <div class="header-right">
          <span class="vtime">🕐 虚拟时间 {{ vtimeStore.virtualTime || '加载中…' }}</span>
          <TimeControl v-if="userStore.isAdmin" />
          <template v-if="userStore.isLoggedIn">
            <span class="points">⭐ {{ userStore.user.points }} 分</span>
            <button class="btn btn-sm" @click="logout">退出</button>
          </template>
          <template v-else>
            <router-link to="/login" class="btn btn-sm btn-outline">登录</router-link>
            <router-link to="/register" class="btn btn-sm">注册</router-link>
          </template>
        </div>
      </div>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from './store/user';
import { useVtimeStore } from './store/vtime';
import TimeControl from './components/TimeControl.vue';

const userStore = useUserStore();
const vtimeStore = useVtimeStore();
const router = useRouter();

let timer = null;

onMounted(() => {
  userStore.fetchMe();
  vtimeStore.fetch();
  timer = setInterval(() => {
    vtimeStore.fetch();
  }, 15000);
});

onUnmounted(() => {
  clearInterval(timer);
});

function logout() {
  userStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-top: 12px;
  padding-bottom: 12px;
}

.brand {
  color: var(--text);
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
}

.brand-ball {
  color: var(--accent);
}

.nav {
  display: flex;
  gap: 16px;
  flex: 1;
}

.nav a {
  color: var(--text-dim);
  font-size: 14px;
}

.nav a.router-link-active {
  color: var(--accent);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vtime {
  color: var(--accent);
  font-size: 13px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.points {
  color: var(--orange);
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .vtime {
    display: none;
  }
}
</style>
