<template>
  <div class="time-control" v-if="userStore.isAdmin">
    <div class="tc-panel">
      <span class="tc-title">⏰ 时间控制台（管理员）</span>
      <div class="tc-actions">
        <button class="btn btn-sm" :disabled="busy" @click="advance({ minutes: 15 })">+15 分钟</button>
        <button class="btn btn-sm" :disabled="busy" @click="advance({ hours: 1 })">+1 小时</button>
        <input
          v-model="targetTime"
          type="datetime-local"
          class="input tc-input"
          :disabled="busy"
        />
        <button class="btn btn-sm" :disabled="busy || !targetTime" @click="advance({ virtual_time: targetTime })">
          设定时间
        </button>
      </div>
      <div v-if="vtimeStore.lastResult" class="tc-result">
        已结算 {{ vtimeStore.lastResult.settled }} 场比赛，自动生成 {{ vtimeStore.lastResult.generatedPosts }} 条帖子
      </div>
      <div v-if="error" class="msg-error tc-error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../store/user';
import { useVtimeStore } from '../store/vtime';

const userStore = useUserStore();
const vtimeStore = useVtimeStore();

const busy = ref(false);
const error = ref('');
const targetTime = ref('');

async function advance(payload) {
  busy.value = true;
  error.value = '';
  try {
    let body = payload;
    if (payload.virtual_time) {
      body = { virtual_time: payload.virtual_time.replace('T', ' ') + ':00' };
    }
    await vtimeStore.advance(body);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.tc-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(168, 85, 247, 0.08);
  border: 1px dashed rgba(168, 85, 247, 0.5);
  border-radius: 10px;
  padding: 10px 12px;
  max-width: 420px;
}

.tc-title {
  color: #d8b4fe;
  font-size: 13px;
  font-weight: 600;
}

.tc-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.tc-input {
  width: 190px;
  padding: 5px 8px;
  font-size: 13px;
  border-color: rgba(168, 85, 247, 0.4);
}

.tc-result {
  color: #86efac;
  font-size: 12px;
}

.tc-error {
  margin-bottom: 0;
  font-size: 12px;
}
</style>
