import { defineStore } from 'pinia';
import api from '../api';

export const useVtimeStore = defineStore('vtime', {
  state: () => ({
    virtualTime: '',
    lastResult: null
  }),
  actions: {
    async fetch() {
      const data = await api.get('/time');
      this.virtualTime = data.virtualTime;
    },
    async advance(payload) {
      const data = await api.put('/admin/time', payload);
      this.virtualTime = data.virtualTime;
      this.lastResult = { settled: data.settled, generatedPosts: data.generatedPosts };
      return data;
    }
  }
});
