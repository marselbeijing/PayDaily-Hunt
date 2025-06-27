import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

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

  // Telegram WebApp
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Проверяем сохраненный токен
      if (token) {
        api.setAuthToken(token);
        const response = await api.verifyToken();
        if (response.success) {
          setUser(response.user);
          setLoading(false);
          return;
        } else {
          // Токен недействителен
          localStorage.removeItem('token');
          setToken(null);
        }
      }

      // Авторизация через Telegram
      if (tg && tg.initData) {
        await authenticateWithTelegram(tg.initData);
      } else {
        // Для разработки - создаем тестового пользователя
        if (process.env.NODE_ENV === 'development') {
          await createTestUser();
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Ошибка инициализации авторизации:', error);
      setLoading(false);
    }
  };

  const authenticateWithTelegram = async (initData, referralCode = null) => {
    try {
      setLoading(true);
      const response = await api.authenticateWithTelegram(initData, referralCode);
      
      if (response.success) {
        setUser(response.user);
        setToken(response.token);
        localStorage.setItem('token', response.token);
        api.setAuthToken(response.token);
        
        // Уведомление о успешной авторизации
        if (tg) {
          tg.showPopup({
            title: 'Добро пожаловать!',
            message: `Привет, ${response.user.displayName}! Вы получили ${response.user.points} баллов.`,
            buttons: [{ type: 'ok' }]
          });
        }
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      if (tg) {
        tg.showAlert('Ошибка авторизации. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const createTestUser = async () => {
    try {
      // Тестовые данные для разработки
      const testInitData = new URLSearchParams({
        user: JSON.stringify({
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'ru'
        }),
        hash: 'test_hash'
      }).toString();

      await authenticateWithTelegram(testInitData);
    } catch (error) {
      console.error('Ошибка создания тестового пользователя:', error);
      setLoading(false);
    }
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    api.removeAuthToken();
    
    if (tg) {
      tg.close();
    }
  };

  const dailyCheckIn = async () => {
    try {
      const response = await api.dailyCheckIn();
      if (response.success) {
        updateUser({
          points: response.newPoints,
          dailyStreak: response.newStreak,
          canCheckIn: false
        });
        
        return response;
      }
    } catch (error) {
      console.error('Ошибка ежедневного чек-ина:', error);
      throw error;
    }
  };

  const addPoints = async (points, source = 'task') => {
    try {
      // Оптимистичное обновление UI
      updateUser(prev => ({
        ...prev,
        points: prev.points + points,
        totalEarned: prev.totalEarned + points
      }));

      // Анимация увеличения баллов
      if (tg) {
        tg.HapticFeedback.notificationOccurred('success');
      }

    } catch (error) {
      console.error('Ошибка добавления баллов:', error);
    }
  };

  const refreshUser = async () => {
    try {
      if (token) {
        const response = await api.verifyToken();
        if (response.success) {
          setUser(response.user);
        }
      }
    } catch (error) {
      console.error('Ошибка обновления данных пользователя:', error);
    }
  };

  const value = {
    user,
    loading,
    token,
    login: authenticateWithTelegram,
    logout,
    updateUser,
    dailyCheckIn,
    addPoints,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 