import React, { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import LoadingScreen from './components/LoadingScreen';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
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