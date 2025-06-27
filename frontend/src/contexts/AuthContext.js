import React, { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { authTelegram, performCheckin, getProfile, refreshToken } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Инициализация авторизации через Telegram
  const initializeTelegramAuth = useCallback(async (referralCode = null) => {
    try {
      setLoading(true);
      
      // Проверяем есть ли сохраненный токен
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          // Пытаемся получить профиль с сохраненным токеном
          const profileData = await getProfile(savedToken);
          setUser(profileData.user);
          setToken(savedToken);
          setLoading(false);
          return;
        } catch (error) {
          // Токен недействителен, удаляем его
          localStorage.removeItem('token');
          setToken(null);
        }
      }

      // Получаем данные Telegram WebApp
      const webApp = window.Telegram?.WebApp;
      if (!webApp || !webApp.initData) {
        // Для разработки создаем фиктивные данные
        if (process.env.NODE_ENV === 'development') {
          const mockUser = {
            id: 'dev_user_123',
            telegramId: '123456789',
            username: 'dev_user',
            firstName: 'Test',
            lastName: 'User',
            points: 1500,
            totalEarned: 5000,
            vipLevel: 'bronze',
            vipPoints: 1200,
            vipMultiplier: 1.1,
            nextVipLevel: 'silver',
            pointsToNextVip: 3800,
            checkinStreak: 3,
            maxCheckinStreak: 7,
            canCheckin: true,
            tasksCompleted: 15,
            tasksCompletedToday: 2,
            referralCode: 'TEST123',
            referrals: 2,
            referralEarnings: 200,
            isActive: true,
            createdAt: new Date().toISOString()
          };
          
          setUser(mockUser);
          setToken('dev_token');
          localStorage.setItem('token', 'dev_token');
          setLoading(false);
          return;
        }
        
        throw new Error('Telegram WebApp данные недоступны');
      }

      // Авторизация через Telegram
      const authData = await authTelegram({
        initData: webApp.initData,
        referralCode
      });

      if (authData.success) {
        setUser(authData.user);
        setToken(authData.token);
        localStorage.setItem('token', authData.token);
        toast.success('Добро пожаловать в PayDaily Hunt! 🎉');
      } else {
        throw new Error(authData.message || 'Ошибка авторизации');
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      toast.error('Ошибка авторизации: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Обновление профиля пользователя
  const updateUser = useCallback(async () => {
    if (!token) return;
    
    try {
      const profileData = await getProfile(token);
      setUser(profileData.user);
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      // Если токен недействителен, выходим
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    }
  }, [token]);

  // Выполнение ежедневного чек-ина
  const performDailyCheckin = useCallback(async () => {
    if (!token || !user) return;

    try {
      const response = await performCheckin(token);
      
      if (response.success) {
        // Обновляем данные пользователя
        setUser(prevUser => ({
          ...prevUser,
          ...response.user
        }));
        
        toast.success(
          `Чек-ин выполнен! +${response.reward.points} баллов 🎉`
        );
        
        return response.reward;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Ошибка чек-ина:', error);
      toast.error('Ошибка чек-ина: ' + error.message);
      throw error;
    }
  }, [token, user]);

  // Обновление токена
  const refreshAuthToken = useCallback(async () => {
    if (!token) return;

    try {
      const response = await refreshToken(token);
      if (response.success) {
        setToken(response.token);
        localStorage.setItem('token', response.token);
      }
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      logout();
    }
  }, [token]);

  // Выход из системы
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    toast.success('Вы вышли из системы');
  }, []);

  // Обновление очков пользователя (для использования после выполнения заданий)
  const updateUserPoints = useCallback((newPoints, earnedPoints) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      
      return {
        ...prevUser,
        points: newPoints,
        totalEarned: prevUser.totalEarned + earnedPoints,
        tasksCompleted: prevUser.tasksCompleted + 1,
        tasksCompletedToday: prevUser.tasksCompletedToday + 1
      };
    });
  }, []);

  // Обновление VIP статуса
  const updateVipStatus = useCallback((vipData) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      
      return {
        ...prevUser,
        ...vipData
      };
    });
  }, []);

  // Добавление реферала
  const addReferral = useCallback((referralData) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      
      return {
        ...prevUser,
        referrals: prevUser.referrals + 1,
        referralEarnings: prevUser.referralEarnings + (referralData.bonus || 0)
      };
    });
  }, []);

  // Обновление баланса после вывода
  const updateBalanceAfterWithdrawal = useCallback((pointsDeducted) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      
      return {
        ...prevUser,
        points: prevUser.points - pointsDeducted
      };
    });
  }, []);

  // Проверка валидности токена
  const isTokenValid = useCallback(() => {
    if (!token) return false;
    
    try {
      // Простая проверка токена JWT
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (error) {
      return false;
    }
  }, [token]);

  // Получение заголовков для API запросов
  const getAuthHeaders = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  // Значения контекста
  const value = {
    // Состояние
    user,
    loading,
    token,
    isAuthenticated: !!user && !!token,
    
    // Методы авторизации
    initializeTelegramAuth,
    logout,
    refreshAuthToken,
    
    // Методы пользователя
    updateUser,
    performDailyCheckin,
    updateUserPoints,
    updateVipStatus,
    addReferral,
    updateBalanceAfterWithdrawal,
    
    // Утилиты
    isTokenValid,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 