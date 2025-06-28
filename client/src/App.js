import React, { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import LoadingScreen from './components/LoadingScreen';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import Navigation from './components/Navigation';
import TaskDetail from './pages/TaskDetail';
import Wallet from './pages/Wallet';
import Leaderboard from './pages/Leaderboard';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const { tg, isReady } = useTelegram();
  
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

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

        setLoading(false);
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        setLoading(false);
      }
    };

    initApp();
  }, [isReady, tg]);

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    if (params.taskId) {
      setSelectedTaskId(params.taskId);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={navigateTo} />;
      case 'tasks':
        return <Tasks onNavigate={navigateTo} />;
      case 'task-detail':
        return <TaskDetail taskId={selectedTaskId} onNavigate={navigateTo} />;
      case 'profile':
        return <Profile onNavigate={navigateTo} />;
      case 'wallet':
        return <Wallet onNavigate={navigateTo} />;
      case 'leaderboard':
        return <Leaderboard onNavigate={navigateTo} />;
      default:
        return <Home onNavigate={navigateTo} />;
    }
  };

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
      <div className="min-h-screen bg-tg-bg safe-area-top safe-area-bottom pb-16">
        {renderCurrentPage()}
        <Navigation currentPage={currentPage} onNavigate={navigateTo} />
      </div>
    </AuthProvider>
  );
}

export default App; 