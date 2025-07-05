import axios from 'axios';

// Позволяет явно задать адрес API через переменную окружения
const API_URL = process.env.REACT_APP_API_URL
  || (process.env.NODE_ENV === 'production'
    ? 'https://paydaily-hunt.onrender.com/api'
    : 'http://localhost:5000/api');

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
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
    checkTelegramSub: (telegramId) => apiClient.get(`/auth/check-telegram-sub?telegramId=${telegramId}`).then(r => r.data),
  },
  tasks: {
    list: () => apiClient.get('/tasks').then(r => r.data),
    detail: (id) => apiClient.get(`/tasks/${id}`).then(r => r.data),
    start: (id) => apiClient.post(`/tasks/${id}/start`).then(r => r.data),
    complete: (id, data) => apiClient.post(`/tasks/${id}/submit`, data).then(r => r.data),
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
  unu: {
    tasks: (params) => apiClient.get('/unu/tasks', { params }).then(r => r.data),
    taskDetail: (taskId) => apiClient.get(`/unu/tasks/${taskId}`).then(r => r.data),
    createTask: (data) => apiClient.post('/unu/tasks', data).then(r => r.data),
    setTaskLimit: (taskId, add_to_limit) => apiClient.post(`/unu/tasks/${taskId}/limit`, { add_to_limit }).then(r => r.data),
    reports: (params) => apiClient.get('/unu/reports', { params }).then(r => r.data),
    approveReport: (reportId) => apiClient.post(`/unu/reports/${reportId}/approve`).then(r => r.data),
    rejectReport: (reportId, comment, reject_type) => apiClient.post(`/unu/reports/${reportId}/reject`, { comment, reject_type }).then(r => r.data),
    balance: () => apiClient.get('/unu/balance').then(r => r.data),
    expenses: (params) => apiClient.get('/unu/expenses', { params }).then(r => r.data),
    tariffs: () => apiClient.get('/unu/tariffs').then(r => r.data),
    folders: () => apiClient.get('/unu/folders').then(r => r.data),
    createFolder: (name) => apiClient.post('/unu/folders', { name }).then(r => r.data),
    deleteFolder: (folderId) => apiClient.delete(`/unu/folders/${folderId}`).then(r => r.data),
    moveTask: (taskId, folder_id) => apiClient.post(`/unu/tasks/${taskId}/move`, { folder_id }).then(r => r.data),
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

// Конвертация рублей в доллары (курс 1 USD = 80 RUB)
export const convertRubToUsd = (rubAmount) => {
  const exchangeRate = 80; // 1 USD = 80 RUB
  const usdAmount = rubAmount / exchangeRate;
  return usdAmount.toFixed(2);
};

// Форматирование цены в USDT
export const formatPriceInUsd = (rubAmount) => {
  const usdAmount = convertRubToUsd(rubAmount);
  return `${usdAmount} USDT`;
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