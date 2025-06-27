import React, { useState, useEffect, useCallback } from 'react';
import { useTelegram } from './hooks/useTelegram';
import LoadingScreen from './components/LoadingScreen';
import { api } from './services/api';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import Navigation from './components/Navigation';
import TaskDetail from './pages/TaskDetail';
import Wallet from './pages/Wallet';
import Leaderboard from './pages/Leaderboard';
import { AuthProvider } from './contexts/AuthContext';

// Простые тестовые компоненты
const TestButton = ({ children, onClick, className = "", disabled = false }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`btn btn-primary w-full ${className} ${disabled ? 'opacity-50' : ''}`}
  >
    {children}
  </button>
);

const InfoCard = ({ title, children }) => (
  <div className="card mb-4">
    <h3 className="font-semibold mb-2">{title}</h3>
    {children}
  </div>
);

const StatusBadge = ({ status, text }) => {
  const badgeClass = status === 'success' ? 'badge-success' : 
                    status === 'error' ? 'badge-error' : 
                    status === 'warning' ? 'badge-warning' : 'badge-primary';
  
  return <span className={`badge ${badgeClass}`}>{text}</span>;
};

function App() {
  const { 
    tg, 
    user, 
    queryId, 
    isReady, 
    showAlert, 
    hapticFeedback,
    showMainButton,
    hideMainButton 
  } = useTelegram();
  
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    error: null
  });
  const [testResults, setTestResults] = useState([]);

  const addTestResult = useCallback((title, status, data = null) => {
    const result = {
      id: Date.now(),
      title,
      status,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev]);
  }, []);

  const handleAuth = useCallback(async () => {
    try {
      if (!user || !tg) {
        throw new Error('Telegram данные недоступны');
      }
      const initData = tg.initData;
      if (!initData) {
        throw new Error('initData недоступны');
      }
      addTestResult('Попытка авторизации...', 'info');
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
        addTestResult('Авторизация успешна', 'success', {
          userId: response.user.id,
          balance: response.user.balance,
          vipLevel: response.user.vipLevel
        });
        hapticFeedback('notification', 'success');
      } else {
        throw new Error(response.message || 'Ошибка авторизации');
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      addTestResult('Ошибка авторизации', 'error', error.message);
      setAuthState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, [user, tg, addTestResult, hapticFeedback]);

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
          addTestResult('Пользователь Telegram найден', 'success', {
            id: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name
          });

          // Пробуем авторизоваться
          await handleAuth();
        } else {
          addTestResult('Пользователь Telegram не найден', 'warning', 
            'Приложение запущено вне Telegram WebApp');
        }

        setLoading(false);
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        addTestResult('Ошибка инициализации', 'error', error.message);
        setLoading(false);
      }
    };

    initApp();
  }, [isReady, user, tg, handleAuth, addTestResult]);

  const testBackendConnection = async () => {
    try {
      addTestResult('Тестирование соединения с backend...', 'info');
      
      const response = await fetch('http://localhost:5000/api/auth/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        addTestResult('Backend доступен', 'success', data);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      addTestResult('Backend недоступен', 'error', error.message);
    }
  };

  const testTelegramFeatures = () => {
    if (!tg) {
      addTestResult('Telegram WebApp недоступен', 'error');
      return;
    }

    // Тестируем различные функции
    const tests = [
      {
        name: 'Haptic Feedback',
        action: () => {
          hapticFeedback('impact', 'medium');
          return 'Вибрация отправлена';
        }
      },
      {
        name: 'Alert',
        action: () => {
          showAlert('Тестовое уведомление');
          return 'Alert показан';
        }
      },
      {
        name: 'Main Button',
        action: () => {
          showMainButton('Тест кнопки', () => {
            showAlert('Main Button нажата!');
            hideMainButton();
          });
          return 'Main Button показана';
        }
      }
    ];

    tests.forEach(test => {
      try {
        const result = test.action();
        addTestResult(`${test.name} - OK`, 'success', result);
      } catch (error) {
        addTestResult(`${test.name} - Ошибка`, 'error', error.message);
      }
    });
  };

  const testCheckin = async () => {
    if (!authState.isAuthenticated) {
      addTestResult('Чекин - Ошибка', 'error', 'Требуется авторизация');
      return;
    }

    try {
      addTestResult('Выполнение ежедневного чекина...', 'info');
      const response = await api.auth.checkin();
      
      if (response.success) {
        addTestResult('Чекин успешен', 'success', {
          reward: response.reward,
          streak: response.streak,
          nextReward: response.nextReward
        });
        
        // Обновляем баланс пользователя
        setAuthState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            balance: prev.user.balance + response.reward
          }
        }));
      } else {
        addTestResult('Чекин - Ошибка', 'error', response.message);
      }
    } catch (error) {
      addTestResult('Чекин - Ошибка', 'error', error.message);
    }
  };

  if (loading) {
    return <LoadingScreen />;
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