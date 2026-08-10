<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>注册</h1>
      <p class="sub">创建账号，参与比分预测赢积分</p>
      <form @submit.prevent="onSubmit">
        <label>用户名（2~20 个字符）</label>
        <input v-model="username" class="input" placeholder="用户名" />
        <label>昵称（可选）</label>
        <input v-model="nickname" class="input" placeholder="昵称，默认同用户名" />
        <label>密码（6~50 位）</label>
        <input v-model="password" type="password" class="input" placeholder="密码" />
        <label>确认密码</label>
        <input v-model="confirm" type="password" class="input" placeholder="再次输入密码" />
        <p v-if="error" class="msg-error">{{ error }}</p>
        <button class="btn btn-block" :disabled="busy" type="submit">注 册</button>
      </form>
      <p class="switch">已有账号？<router-link to="/login">去登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/user';

const userStore = useUserStore();
const router = useRouter();

const username = ref('');
const nickname = ref('');
const password = ref('');
const confirm = ref('');
const error = ref('');
const busy = ref(false);

async function onSubmit() {
  error.value = '';
  if (!username.value.trim()) {
    error.value = '请输入用户名';
    return;
  }
  if (password.value !== confirm.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  busy.value = true;
  try {
    await userStore.register({
      username: username.value.trim(),
      nickname: nickname.value.trim() || undefined,
      password: password.value
    });
    await userStore.login(username.value.trim(), password.value);
    router.push('/');
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
