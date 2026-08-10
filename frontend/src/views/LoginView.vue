<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>登录</h1>
      <p class="sub">欢迎回来，继续你的预测之旅</p>
      <form @submit.prevent="onSubmit">
        <label>用户名</label>
        <input v-model="username" class="input" placeholder="用户名（演示：小射手 / 123456）" />
        <label>密码</label>
        <input v-model="password" type="password" class="input" placeholder="密码" />
        <p v-if="error" class="msg-error">{{ error }}</p>
        <button class="btn btn-block" :disabled="busy" type="submit">登 录</button>
      </form>
      <p class="switch">还没有账号？<router-link to="/register">立即注册</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../store/user';

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function onSubmit() {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await userStore.login(username.value.trim(), password.value);
    router.push(route.query.redirect || '/');
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding: 60px 16px;
}

.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 32px;
  width: 100%;
  max-width: 380px;
}

.auth-card h1 {
  font-size: 24px;
}

.sub {
  color: var(--text-dim);
  font-size: 13px;
  margin: 6px 0 20px;
}

label {
  display: block;
  font-size: 13px;
  color: var(--text-dim);
  margin: 12px 0 6px;
}

.btn-block {
  width: 100%;
  margin-top: 18px;
  padding: 10px;
  font-size: 15px;
}

.switch {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-dim);
  text-align: center;
}
</style>
