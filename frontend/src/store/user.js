import { defineStore } from 'pinia';
import api from '../api';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    isAdmin: (s) => s.user?.role === 'admin'
  },
  actions: {
    async login(username, password) {
      const data = await api.post('/auth/login', { username, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
    },
    async register(payload) {
      const data = await api.post('/auth/register', payload);
      return data;
    },
    async fetchMe() {
      if (!this.token) return;
      try {
        this.user = await api.get('/auth/me');
      } catch (err) {
        this.logout();
      }
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
    }
  }
});
