import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = {
  auth: {
    telegram: (initData) => axios.post(`${API_URL}/auth/telegram`, { initData }).then(r => r.data),
    checkin: () => axios.post(`${API_URL}/auth/checkin`).then(r => r.data),
    profile: () => axios.get(`${API_URL}/auth/profile`).then(r => r.data),
  },
  tasks: {
    list: () => axios.get(`${API_URL}/tasks`).then(r => r.data),
    detail: (id) => axios.get(`${API_URL}/tasks/${id}`).then(r => r.data),
    start: (id) => axios.post(`${API_URL}/tasks/${id}/start`).then(r => r.data),
    complete: (id, data) => axios.post(`${API_URL}/tasks/${id}/complete`, data).then(r => r.data),
    history: () => axios.get(`${API_URL}/tasks/history`).then(r => r.data),
  },
  users: {
    leaderboard: () => axios.get(`${API_URL}/users/leaderboard`).then(r => r.data),
    referrals: () => axios.get(`${API_URL}/users/referrals`).then(r => r.data),
    stats: () => axios.get(`${API_URL}/users/stats`).then(r => r.data),
    achievements: () => axios.get(`${API_URL}/users/achievements`).then(r => r.data),
  },
  payments: {
    withdraw: (data) => axios.post(`${API_URL}/payments/withdraw`, data).then(r => r.data),
    history: () => axios.get(`${API_URL}/payments/history`).then(r => r.data),
    validate: (address) => axios.post(`${API_URL}/payments/validate`, { address }).then(r => r.data),
  }
};

// Утилиты для форматирования
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
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getVipLevelInfo = (level) => {
  const levels = {
    none: { name: 'Новичок', color: '#6b7280', multiplier: 1.0 },
    bronze: { name: 'Бронза', color: '#cd7f32', multiplier: 1.1 },
    silver: { name: 'Серебро', color: '#c0c0c0', multiplier: 1.2 },
    gold: { name: 'Золото', color: '#ffd700', multiplier: 1.3 },
    platinum: { name: 'Платина', color: '#e5e4e2', multiplier: 1.5 },
    diamond: { name: 'Алмаз', color: '#b9f2ff', multiplier: 2.0 }
  };
  return levels[level] || levels.none;
};

export const getTaskCategoryInfo = (category) => {
  const categories = {
    entertainment: { name: 'Развлечения', icon: '🎬', color: '#f59e0b' },
    education: { name: 'Образование', icon: '📚', color: '#3b82f6' },
    finance: { name: 'Финансы', icon: '💰', color: '#10b981' },
    crypto: { name: 'Криптовалюты', icon: '₿', color: '#f97316' },
    social: { name: 'Соцсети', icon: '📱', color: '#8b5cf6' },
    gaming: { name: 'Игры', icon: '🎮', color: '#06b6d4' },
    surveys: { name: 'Опросы', icon: '📊', color: '#84cc16' },
    apps: { name: 'Приложения', icon: '📲', color: '#ec4899' },
    referrals: { name: 'Рефералы', icon: '👥', color: '#14b8a6' },
    special: { name: 'Специальные', icon: '⭐', color: '#eab308' }
  };
  return categories[category] || categories.special;
}; 