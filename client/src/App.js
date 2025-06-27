import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useTelegram } from './hooks/useTelegram';
import LoadingScreen from './components/LoadingScreen';
import { api } from './services/api';

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
  }, [isReady, user, tg, handleAuth]);

  const addTestResult = (title, status, data = null) => {
    const result = {
      id: Date.now(),
      title,
      status,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev]);
  };

  const handleAuth = async () => {
    try {
      if (!user || !tg) {
        throw new Error('Telegram данные недоступны');
      }

      // Получаем initData для авторизации
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

        // Сохраняем токен
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
  };

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
      <div className="min-h-screen bg-tg-bg safe-area-top safe-area-bottom">
        <div className="container mx-auto p-4 max-w-md">
          {/* Заголовок */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">PayDaily Hunt</h1>
            <p className="text-tg-hint">Тестовая версия</p>
          </div>

          {/* Информация о пользователе */}
          {user && (
            <InfoCard title="Telegram Пользователь">
              <div className="space-y-2 text-sm">
                <div>ID: <span className="font-mono">{user.id}</span></div>
                <div>Имя: {user.first_name} {user.last_name}</div>
                {user.username && <div>Username: @{user.username}</div>}
                <div>Язык: {user.language_code || 'не указан'}</div>
              </div>
            </InfoCard>
          )}

          {/* Статус авторизации */}
          <InfoCard title="Статус авторизации">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Статус:</span>
                <StatusBadge 
                  status={authState.isAuthenticated ? 'success' : 'error'} 
                  text={authState.isAuthenticated ? 'Авторизован' : 'Не авторизован'} 
                />
              </div>
              {authState.user && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Баланс:</span>
                    <span className="font-bold">{authState.user.balance} точек</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>VIP уровень:</span>
                    <StatusBadge 
                      status="info" 
                      text={authState.user.vipLevel || 'none'} 
                    />
                  </div>
                </>
              )}
              {authState.error && (
                <div className="text-red-500 text-sm mt-2">
                  Ошибка: {authState.error}
                </div>
              )}
            </div>
          </InfoCard>

          {/* Кнопки тестирования */}
          <div className="space-y-3 mb-6">
            <TestButton onClick={testBackendConnection}>
              🔗 Тест соединения с Backend
            </TestButton>
            
            <TestButton onClick={testTelegramFeatures} disabled={!tg}>
              📱 Тест функций Telegram
            </TestButton>
            
            <TestButton onClick={handleAuth} disabled={!user}>
              🔐 Повторная авторизация
            </TestButton>
            
            <TestButton 
              onClick={testCheckin} 
              disabled={!authState.isAuthenticated}
            >
              ✅ Тест ежедневного чекина
            </TestButton>
          </div>

          {/* Результаты тестов */}
          <InfoCard title="Результаты тестов">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {testResults.length === 0 ? (
                <p className="text-tg-hint text-sm">Результаты тестов будут отображаться здесь</p>
              ) : (
                testResults.map(result => (
                  <div key={result.id} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{result.title}</span>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={result.status} text={result.status} />
                        <span className="text-xs text-tg-hint">{result.timestamp}</span>
                      </div>
                    </div>
                    {result.data && (
                      <div className="text-xs text-tg-hint bg-tg-secondary p-2 rounded">
                        <pre className="whitespace-pre-wrap">
                          {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </InfoCard>

          {/* Техническая информация */}
          <InfoCard title="Техническая информация">
            <div className="space-y-1 text-xs text-tg-hint">
              <div>WebApp готов: {isReady ? '✅' : '❌'}</div>
              <div>Query ID: {queryId ? '✅' : '❌'}</div>
              <div>Тема: {tg?.colorScheme || 'неизвестно'}</div>
              <div>Платформа: {tg?.platform || 'неизвестно'}</div>
              <div>Версия: {tg?.version || 'неизвестно'}</div>
              <div>Viewport: {tg?.viewportHeight || 'неизвестно'}px</div>
            </div>
          </InfoCard>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App; 