import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import TaskDetailsPage from './pages/TaskDetailsPage';
import ProfilePage from './pages/ProfilePage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ReferralsPage from './pages/ReferralsPage';
import LoadingScreen from './components/LoadingScreen';
import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { user, loading, initializeTelegramAuth } = useAuth();
  const [telegramInitialized, setTelegramInitialized] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp
    const initTelegram = async () => {
      try {
        if (window.Telegram?.WebApp) {
          const webApp = window.Telegram.WebApp;
          
          // Configure WebApp
          webApp.ready();
          webApp.expand();
          webApp.enableClosingConfirmation();
          
          // Set theme
          if (webApp.setHeaderColor) {
            webApp.setHeaderColor('bg_color');
          }
          
          // Handle theme changes
          const handleThemeChanged = () => {
            document.documentElement.style.setProperty('--tg-theme-bg-color', webApp.themeParams.bg_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-text-color', webApp.themeParams.text_color || '#000000');
            document.documentElement.style.setProperty('--tg-theme-hint-color', webApp.themeParams.hint_color || '#999999');
            document.documentElement.style.setProperty('--tg-theme-link-color', webApp.themeParams.link_color || '#0088cc');
            document.documentElement.style.setProperty('--tg-theme-button-color', webApp.themeParams.button_color || '#0088cc');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', webApp.themeParams.button_text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', webApp.themeParams.secondary_bg_color || '#f1f1f1');
          };
          
          handleThemeChanged();
          webApp.onEvent('themeChanged', handleThemeChanged);
          
          // Handle viewport changes
          const handleViewportChanged = ({ isStateStable }) => {
            if (isStateStable) {
              document.body.style.height = `${webApp.viewportHeight}px`;
            }
          };
          
          webApp.onEvent('viewportChanged', handleViewportChanged);
          
          // Get referral code from start param
          const startParam = webApp.initDataUnsafe?.start_param;
          
          // Initialize authentication
          await initializeTelegramAuth(startParam);
          
          setTelegramInitialized(true);
        } else {
          // Fallback for development
          console.warn('Telegram WebApp не доступен, используем fallback режим');
          setTelegramInitialized(true);
        }
      } catch (error) {
        console.error('Ошибка инициализации Telegram WebApp:', error);
        setTelegramInitialized(true);
      }
    };

    initTelegram();
  }, [initializeTelegramAuth]);

  // Show loading screen while initializing
  if (loading || !telegramInitialized) {
    return <LoadingScreen />;
  }

  // Show login screen if no user
  if (!user) {
    return (
      <div className="app">
        <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div className="card">
            <h1 style={{ marginBottom: '16px', fontSize: '24px' }}>🎯 PayDaily Hunt</h1>
            <p style={{ color: 'var(--tg-theme-hint-color)', marginBottom: '24px' }}>
              Добро пожаловать! Зарабатывайте деньги выполняя простые задания.
            </p>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ fontSize: '14px', color: 'var(--tg-theme-hint-color)', marginTop: '16px' }}>
              Подключение к Telegram...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <main style={{ flex: 1, paddingBottom: '80px' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/:id" element={<TaskDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/withdrawals" element={<WithdrawalsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Navigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#2ed573',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ff4757',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 