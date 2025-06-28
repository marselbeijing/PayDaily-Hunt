import React, { useState, useEffect, useCallback } from 'react';
import { useTelegram } from './hooks/useTelegram';
import LoadingScreen from './components/LoadingScreen';
import { api } from './services/api';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import Navigation from './components/Navigation';
import TaskDetail from './pages/TaskDetail';
import Wallet from './pages/Wallet';
import Leaderboard from './pages/Leaderboard';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const { 
    tg, 
    user, 
    isReady
  } = useTelegram();
  
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    error: null
  });

  const handleAuth = useCallback(async () => {
    try {
      if (!user || !tg) {
        throw new Error('Telegram данные недоступны');
      }
      const initData = tg.initData;
      if (!initData) {
        throw new Error('initData недоступны');
      }
      const response = await api.auth.telegram(initData);
      if (response.success) {
        setAuthState({
          isAuthenticated: true,
          user: response.user,
          token: response.token,
          error: null
        });
        localStorage.setItem('paydaily_token', response.token);
        localStorage.setItem('paydaily_user', JSON.stringify(response.user));
      } else {
        throw new Error(response.message || 'Ошибка авторизации');
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      setAuthState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, [user, tg]);

  // Инициализация приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        // Ждем инициализации Telegram WebApp
        if (!isReady) return;

        // Настраиваем тему
        if (tg) {
          document.documentElement.setAttribute('data-theme', tg.colorScheme || 'light');
          tg.expand();
          tg.enableClosingConfirmation();
        }

        // Проверяем данные пользователя
        if (user) {
          // Пробуем авторизоваться
          await handleAuth();
        } else {
          console.warn('Пользователь Telegram не найден');
        }

        setLoading(false);
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        setLoading(false);
      }
    };

    initApp();
  }, [isReady, user, tg, handleAuth]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!tg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h2 className="text-xl font-bold mb-4">Откройте приложение через Telegram</h2>
        <p className="text-gray-600">Данное приложение работает только как Telegram Mini App.</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-tg-bg safe-area-top safe-area-bottom pb-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
          <Navigation />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 