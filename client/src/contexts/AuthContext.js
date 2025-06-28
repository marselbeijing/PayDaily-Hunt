import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    case 'LOGOUT':
      return {
        ...initialState,
        loading: false
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { tg, user: telegramUser, isReady } = useTelegram();

  // Восстановление сессии при загрузке
  useEffect(() => {
    const initAuth = async () => {
      if (!isReady) return;

      const token = localStorage.getItem('paydaily_token');
      const userData = localStorage.getItem('paydaily_user');

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          api.setAuthToken(token);
          dispatch({
            type: 'SET_USER',
            payload: { user, token }
          });
          return;
        } catch (error) {
          console.error('Ошибка восстановления сессии:', error);
          localStorage.removeItem('paydaily_token');
          localStorage.removeItem('paydaily_user');
        }
      }

      // Если нет сохраненной сессии, пробуем авторизоваться через Telegram
      if (telegramUser && tg && tg.initData) {
        try {
          await login(tg.initData);
        } catch (error) {
          console.error('Ошибка автоавторизации:', error);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, [isReady, telegramUser, tg]);

  // Авторизация через Telegram
  const login = async (initData, referralCode = null) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await api.post('/auth/telegram', {
        initData,
        referralCode
      });

      const { token, user } = response;

      // Сохраняем в localStorage
      localStorage.setItem('paydaily_token', token);
      localStorage.setItem('paydaily_user', JSON.stringify(user));

      // Устанавливаем токен для API
      api.setAuthToken(token);

      dispatch({
        type: 'SET_USER',
        payload: { user, token }
      });

      // Показываем приветствие для новых пользователей
      if (user.isNewUser) {
        toast.success(`Добро пожаловать, ${user.firstName}! 🎉`);
      } else {
        toast.success('Добро пожаловать снова! 👋');
      }

      return { success: true, user, token };
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Ошибка авторизации';
      
      dispatch({
        type: 'SET_ERROR',
        payload: errorMessage
      });

      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Выход из системы
  const logout = () => {
    localStorage.removeItem('paydaily_token');
    localStorage.removeItem('paydaily_user');
    api.removeAuthToken();
    dispatch({ type: 'LOGOUT' });
    toast.success('Вы вышли из системы');
  };

  // Обновление данных пользователя
  const updateUser = (userData) => {
    dispatch({
      type: 'UPDATE_USER',
      payload: userData
    });

    // Обновляем localStorage
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('paydaily_user', JSON.stringify(updatedUser));
  };

  // Ежедневный чек-ин
  const performCheckIn = async () => {
    try {
      const response = await api.post('/auth/checkin');
      const { bonus, streak, newBalance, levelChanged, newLevel, message } = response.data;

      // Обновляем пользователя
      updateUser({
        balance: newBalance,
        checkInStreak: streak,
        vipLevel: levelChanged ? newLevel : state.user.vipLevel
      });

      // Показываем уведомления
      toast.success(message);

      if (levelChanged) {
        toast.success(`🎉 Поздравляем! Новый VIP уровень: ${newLevel.toUpperCase()}!`, {
          duration: 5000
        });
      }

      return {
        success: true,
        bonus,
        streak,
        newBalance,
        levelChanged,
        newLevel
      };
    } catch (error) {
      console.error('Ошибка чек-ина:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка чек-ина';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Обновление профиля
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      
      updateUser(response.data.user);
      toast.success('Профиль успешно обновлен');
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка обновления профиля';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Получение актуальных данных пользователя
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/profile');
      updateUser(response.user);
      return { success: true };
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
      return { success: false };
    }
  };

  // Проверка токена
  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/profile');
      return { success: true, user: response.user };
    } catch (error) {
      console.error('Токен недействителен:', error);
      logout();
      return { success: false };
    }
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    performCheckIn,
    updateProfile,
    refreshUser,
    verifyToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 