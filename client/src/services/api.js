import axios from 'axios';

const API_URL = 'https://paydaily-hunt.onrender.com/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Token management functions
const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

const removeAuthToken = () => {
  delete apiClient.defaults.headers.common['Authorization'];
};

export const api = {
  // Token management functions
  setAuthToken,
  removeAuthToken,
  
  // HTTP methods
  get: (url) => apiClient.get(url).then(r => r.data),
  post: (url, data) => apiClient.post(url, data).then(r => r.data),
  put: (url, data) => apiClient.put(url, data).then(r => r.data),
  delete: (url) => apiClient.delete(url).then(r => r.data),
  
  auth: {
    telegram: (initData) => apiClient.post('/auth/telegram', { initData }).then(r => r.data),
    checkin: () => apiClient.post('/auth/checkin').then(r => r.data),
    profile: () => apiClient.get('/users/profile').then(r => r.data),
  },
  tasks: {
    list: () => apiClient.get('/tasks').then(r => r.data),
    detail: (id) => apiClient.get(`/tasks/${id}`).then(r => r.data),
    start: (id) => apiClient.post(`/tasks/${id}/start`).then(r => r.data),
    complete: (id, data) => apiClient.post(`/tasks/${id}/complete`, data).then(r => r.data),
    history: () => apiClient.get('/tasks/user/history').then(r => r.data),
  },
  users: {
    leaderboard: () => apiClient.get('/users/leaderboard').then(r => r.data),
    referrals: () => apiClient.get('/users/referrals').then(r => r.data),
    stats: () => apiClient.get('/users/stats').then(r => r.data),
    achievements: () => apiClient.get('/users/achievements').then(r => r.data),
    profile: () => apiClient.get('/users/profile').then(r => r.data),
  },
  payments: {
    withdraw: (data) => apiClient.post('/payments/withdraw', data).then(r => r.data),
    withdrawals: () => apiClient.get('/payments/withdrawals').then(r => r.data),
    history: () => apiClient.get('/payments/history').then(r => r.data),
    validate: (address) => apiClient.post('/payments/validate', { address }).then(r => r.data),
  },
  adgem: {
    offers: (userId) => apiClient.get(`/adgem/offers?user_id=${userId}`).then(r => r.data),
  },
};

// Formatting utilities
export const formatBalance = (balance) => {
  if (balance >= 1000000) {
    return `${(balance / 1000000).toFixed(1)}M`;
  }
  if (balance >= 1000) {
    return `${(balance / 1000).toFixed(1)}K`;
  }
  return balance.toString();
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getVipLevelInfo = (level) => {
  const levels = {
    none: { name: 'Beginner', color: '#6b7280', multiplier: 1.0 },
    bronze: { name: 'Bronze', color: '#cd7f32', multiplier: 1.1 },
    silver: { name: 'Silver', color: '#c0c0c0', multiplier: 1.2 },
    gold: { name: 'Gold', color: '#ffd700', multiplier: 1.3 },
    platinum: { name: 'Platinum', color: '#e5e4e2', multiplier: 1.5 },
    diamond: { name: 'Diamond', color: '#b9f2ff', multiplier: 2.0 }
  };
  return levels[level] || levels.none;
};

export const getTaskCategoryInfo = (category) => {
  const categories = {
    entertainment: { name: 'Entertainment', icon: '🎬', color: '#f59e0b' },
    education: { name: 'Education', icon: '📚', color: '#3b82f6' },
    finance: { name: 'Finance', icon: '💰', color: '#10b981' },
    crypto: { name: 'Cryptocurrency', icon: '₿', color: '#f97316' },
    social: { name: 'Social Media', icon: '📱', color: '#8b5cf6' },
    gaming: { name: 'Gaming', icon: '🎮', color: '#06b6d4' },
    surveys: { name: 'Surveys', icon: '📊', color: '#84cc16' },
    apps: { name: 'Apps', icon: '📲', color: '#ec4899' },
    referrals: { name: 'Referrals', icon: '👥', color: '#14b8a6' },
    special: { name: 'Special', icon: '⭐', color: '#eab308' }
  };
  return categories[category] || categories.special;
}; 