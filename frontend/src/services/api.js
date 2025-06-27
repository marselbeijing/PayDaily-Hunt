import axios from 'axios';

// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерсептор для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ответов
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Обработка ошибок авторизации
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    
    // Возвращаем структурированную ошибку
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Произошла неизвестная ошибка';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

// AUTH API
export const authTelegram = async (data) => {
  return api.post('/auth/telegram', data);
};

export const performCheckin = async () => {
  return api.post('/auth/checkin');
};

export const getProfile = async () => {
  return api.get('/auth/profile');
};

export const updateProfile = async (data) => {
  return api.put('/auth/profile', data);
};

export const refreshToken = async () => {
  return api.post('/auth/refresh');
};

export const getCheckinStatus = async () => {
  return api.get('/auth/checkin-status');
};

// TASKS API
export const getTasks = async (params = {}) => {
  return api.get('/tasks', { params });
};

export const getTask = async (id) => {
  return api.get(`/tasks/${id}`);
};

export const startTask = async (id, data = {}) => {
  return api.post(`/tasks/${id}/start`, data);
};

export const completeTask = async (completionId, data = {}) => {
  return api.post(`/tasks/complete/${completionId}`, data);
};

export const getTaskHistory = async (params = {}) => {
  return api.get('/tasks/history', { params });
};

export const getTaskCategories = async () => {
  return api.get('/tasks/categories');
};

export const rateTask = async (completionId, data) => {
  return api.post(`/tasks/rate/${completionId}`, data);
};

// USERS API
export const getLeaderboard = async (params = {}) => {
  return api.get('/users/leaderboard', { params });
};

export const getReferrals = async () => {
  return api.get('/users/referrals');
};

export const getUserStats = async (params = {}) => {
  return api.get('/users/stats', { params });
};

export const getAchievements = async () => {
  return api.get('/users/achievements');
};

export const getUserProfile = async (userId) => {
  return api.get(`/users/profile/${userId}`);
};

// PAYMENTS API
export const getPaymentRates = async () => {
  return api.get('/payments/rates');
};

export const calculateWithdrawal = async (data) => {
  return api.post('/payments/calculate', data);
};

export const createWithdrawal = async (data) => {
  return api.post('/payments/withdraw', data);
};

export const getWithdrawals = async (params = {}) => {
  return api.get('/payments/withdrawals', { params });
};

export const getWithdrawal = async (id) => {
  return api.get(`/payments/withdrawal/${id}`);
};

export const cancelWithdrawal = async (id) => {
  return api.post(`/payments/withdrawal/${id}/cancel`);
};

export const getPaymentStats = async () => {
  return api.get('/payments/stats');
};

// PARTNERS API
export const getPartnerStats = async () => {
  return api.get('/partners/stats');
};

// UTILITY FUNCTIONS

// Форматирование чисел
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Форматирование валюты
export const formatCurrency = (amount, currency = 'USDT') => {
  const formatted = parseFloat(amount).toFixed(2);
  return `${formatted} ${currency}`;
};

// Форматирование баллов
export const formatPoints = (points) => {
  return points.toLocaleString('ru-RU');
};

// Форматирование времени
export const formatTime = (seconds) => {
  if (seconds < 60) {
    return `${seconds}с`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}ч ${minutes}м`;
};

// Форматирование даты
export const formatDate = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Сегодня';
  }
  if (diffDays === 1) {
    return 'Вчера';
  }
  if (diffDays < 7) {
    return `${diffDays} дней назад`;
  }
  
  return target.toLocaleDateString('ru-RU');
};

// Форматирование времени относительно текущего
export const formatRelativeTime = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'Только что';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`;
  }
  if (diffHours < 24) {
    return `${diffHours} ч назад`;
  }
  if (diffDays < 30) {
    return `${diffDays} дн назад`;
  }
  
  return formatDate(date);
};

// Получение инициалов для аватара
export const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
};

// Получение цвета для VIP уровня
export const getVipColor = (level) => {
  const colors = {
    none: '#999999',
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF'
  };
  return colors[level] || colors.none;
};

// Получение emoji для VIP уровня
export const getVipEmoji = (level) => {
  const emojis = {
    none: '⚪',
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '💠'
  };
  return emojis[level] || emojis.none;
};

// Получение статуса задания на русском
export const getTaskStatusText = (status) => {
  const statuses = {
    started: 'Начато',
    submitted: 'Отправлено',
    pending_verification: 'На проверке',
    verified: 'Завершено',
    rejected: 'Отклонено',
    cancelled: 'Отменено'
  };
  return statuses[status] || status;
};

// Получение цвета для статуса задания
export const getTaskStatusColor = (status) => {
  const colors = {
    started: '#ffa502',
    submitted: '#3742fa',
    pending_verification: '#2f3542',
    verified: '#2ed573',
    rejected: '#ff4757',
    cancelled: '#999999'
  };
  return colors[status] || '#999999';
};

// Получение статуса вывода на русском
export const getWithdrawalStatusText = (status) => {
  const statuses = {
    pending: 'Ожидает',
    processing: 'Обрабатывается',
    completed: 'Завершен',
    failed: 'Ошибка',
    cancelled: 'Отменен',
    on_hold: 'На удержании'
  };
  return statuses[status] || status;
};

// Получение цвета для статуса вывода
export const getWithdrawalStatusColor = (status) => {
  const colors = {
    pending: '#ffa502',
    processing: '#3742fa',
    completed: '#2ed573',
    failed: '#ff4757',
    cancelled: '#999999',
    on_hold: '#ff6b35'
  };
  return colors[status] || '#999999';
};

// Валидация адреса кошелька
export const validateWalletAddress = (address, type) => {
  const patterns = {
    USDT_TRC20: /^T[A-Za-z1-9]{33}$/,
    USDT_ERC20: /^0x[a-fA-F0-9]{40}$/,
    USDT_BEP20: /^0x[a-fA-F0-9]{40}$/,
    BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
    ETH: /^0x[a-fA-F0-9]{40}$/,
    BNB: /^0x[a-fA-F0-9]{40}$/
  };
  
  const pattern = patterns[type];
  return pattern ? pattern.test(address) : false;
};

// Получение иконки для типа кошелька
export const getWalletIcon = (type) => {
  const icons = {
    USDT_TRC20: '💰',
    USDT_ERC20: '💰',
    USDT_BEP20: '💰',
    BTC: '₿',
    ETH: 'Ξ',
    BNB: '🟡'
  };
  return icons[type] || '💰';
};

// Получение названия сети
export const getNetworkName = (network) => {
  const names = {
    TRON: 'TRON',
    ETHEREUM: 'Ethereum',
    BSC: 'Binance Smart Chain',
    BITCOIN: 'Bitcoin'
  };
  return names[network] || network;
};

// Функция для хапкик фидбека (вибрация)
export const hapticFeedback = (type = 'light') => {
  if (window.Telegram?.WebApp?.HapticFeedback) {
    const haptic = window.Telegram.WebApp.HapticFeedback;
    
    switch (type) {
      case 'light':
        haptic.impactOccurred('light');
        break;
      case 'medium':
        haptic.impactOccurred('medium');
        break;
      case 'heavy':
        haptic.impactOccurred('heavy');
        break;
      case 'success':
        haptic.notificationOccurred('success');
        break;
      case 'warning':
        haptic.notificationOccurred('warning');
        break;
      case 'error':
        haptic.notificationOccurred('error');
        break;
      default:
        haptic.impactOccurred('light');
    }
  }
};

// Функция для показа главной кнопки Telegram
export const showMainButton = (text, onClick) => {
  if (window.Telegram?.WebApp?.MainButton) {
    const mainButton = window.Telegram.WebApp.MainButton;
    mainButton.setText(text);
    mainButton.onClick(onClick);
    mainButton.show();
  }
};

// Функция для скрытия главной кнопки Telegram
export const hideMainButton = () => {
  if (window.Telegram?.WebApp?.MainButton) {
    window.Telegram.WebApp.MainButton.hide();
  }
};

// Функция для открытия ссылки
export const openLink = (url, options = {}) => {
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url, options);
  } else {
    window.open(url, '_blank');
  }
};

// Функция для копирования в буфер обмена
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Ошибка копирования:', error);
    return false;
  }
};

export default api; 