import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com/api' 
  : 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    // Интерцептор для добавления токена
    this.axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('paydaily_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Интерцептор для обработки ошибок
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Токен истек, удаляем его
          localStorage.removeItem('paydaily_token');
          localStorage.removeItem('paydaily_user');
          window.location.reload();
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.axios.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.axios.defaults.headers.Authorization;
    }
  }

  removeAuthToken() {
    delete this.axios.defaults.headers.Authorization;
  }

  // Методы для работы с API
  async get(endpoint) {
    const response = await this.axios.get(endpoint);
    return response.data;
  }

  async post(endpoint, data = {}) {
    const response = await this.axios.post(endpoint, data);
    return response.data;
  }

  async put(endpoint, data = {}) {
    const response = await this.axios.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint) {
    const response = await this.axios.delete(endpoint);
    return response.data;
  }

  // Auth endpoints
  auth = {
    telegram: (initData, referralCode) => 
      this.post('/auth/telegram', { initData, referralCode }),
    checkin: () => 
      this.post('/auth/checkin'),
    me: () => 
      this.get('/auth/me'),
    updateProfile: (data) => 
      this.put('/auth/profile', data),
    verifyToken: () => 
      this.post('/auth/verify-token'),
    refreshToken: () => 
      this.post('/auth/refresh-token')
  };

  // Tasks endpoints
  tasks = {
    getAll: (params = {}) => 
      this.get(`/tasks?${new URLSearchParams(params)}`),
    getById: (id) => 
      this.get(`/tasks/${id}`),
    start: (id) => 
      this.post(`/tasks/${id}/start`),
    complete: (id, data) => 
      this.post(`/tasks/${id}/complete`, data),
    getHistory: (params = {}) => 
      this.get(`/tasks/my/history?${new URLSearchParams(params)}`),
    getFeatured: () => 
      this.get('/tasks/featured'),
    getCategories: () => 
      this.get('/tasks/categories')
  };

  // Users endpoints
  users = {
    getProfile: (id) => 
      this.get(`/users/${id}`),
    getLeaderboard: (params = {}) => 
      this.get(`/users/leaderboard?${new URLSearchParams(params)}`),
    getReferrals: () => 
      this.get('/users/referrals'),
    getStats: () => 
      this.get('/users/stats'),
    updateSettings: (data) => 
      this.put('/users/settings', data)
  };

  // Payments endpoints
  payments = {
    withdraw: (data) => 
      this.post('/payments/withdraw', data),
    getHistory: (params = {}) => 
      this.get(`/payments/history?${new URLSearchParams(params)}`),
    getMethods: () => 
      this.get('/payments/methods'),
    validateAddress: (address, network) => 
      this.post('/payments/validate-address', { address, network })
  };

  // Partners endpoints
  partners = {
    getOffers: (network) => 
      this.get(`/partners/${network}/offers`),
    syncOffers: (network) => 
      this.post(`/partners/${network}/sync`),
    callback: (network, data) => 
      this.post(`/partners/${network}/callback`, data)
  };
}

// Создаем единственный экземпляр
export const api = new ApiService();

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