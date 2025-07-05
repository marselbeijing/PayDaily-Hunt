import React, { useEffect, useState } from 'react';
import { api, formatPriceInUsd } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Tasks({ onNavigate }) {
  const { loading, token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unuTasks, setUnuTasks] = useState([]);
  const [subscribed, setSubscribed] = useState(() => {
    return localStorage.getItem('pd_telegram_subscribed') === '1';
  });
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const checkSubscription = async () => {
    if (!user?.telegramId) return;
    try {
      const res = await api.auth.checkTelegramSub(user.telegramId);
      if (res.isMember) {
        setSubscribed(true);
        localStorage.setItem('pd_telegram_subscribed', '1');
      } else {
        setSubscribed(false);
        localStorage.removeItem('pd_telegram_subscribed');
      }
    } catch {}
  };

  useEffect(() => {
    if (user?.telegramId) checkSubscription();
    // eslint-disable-next-line
  }, [user?.telegramId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSubscription();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [user?.telegramId]);

  useEffect(() => {
    if (loading || !token) return;
    setLoading(true);
    Promise.all([
      api.tasks.list(),
      api.unu.tasks() // Без фильтра по статусу
    ])
      .then(([data, unuData]) => {
        setTasks(data.tasks || []);
        setUnuTasks(unuData.tasks || []);
        setLoading(false);
        // ВРЕМЕННО: логируем все задания UNU
        if (window && window.console) {
          console.log('UNU tasks:', unuData.tasks);
        }
      })
      .catch(err => {
        setError('Error loading tasks');
        setLoading(false);
      });
  }, [loading, token, user]);

  const handleTelegramComplete = () => {
    window.open('https://t.me/PayDailyHunt', '_blank');
    setTimeout(() => {
      checkSubscription();
    }, 2000);
  };

  const handleUnuDetails = (taskId) => {
    if (!subscribed) {
      setShowSubscribeModal(true);
      return;
    }
    onNavigate('unu-task-detail', { taskId });
  };

  if (loadingTasks) return <div className="p-4">Loading tasks...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  // Исключаем только тестовые задания по названию
  const testTitles = [
    'Join our Telegram channel',
    'Install our mobile app',
    'Take a short survey'
  ];
  const paidUnuTasks = unuTasks.filter(task => !testTitles.includes(task.name));

  // Универсальный фильтр для активных UNU-заданий
  const activeUnuTasks = unuTasks.filter(task => {
    if (!task.status) return false;
    const s = String(task.status).toLowerCase();
    return s === '2' || s === 'active' || s.includes('active');
  });

  // Фиксированные задания
  const fixedTasks = [
    {
      id: 'fixed-telegram',
      name: 'Subscribe to Telegram channel',
      description: 'Join our official Telegram channel and stay updated.',
      reward: '0.10 USDT',
    },
    {
      id: 'fixed-youtube',
      name: 'Subscribe to YouTube channel',
      description: 'Subscribe to our YouTube channel for more content.',
      reward: '0.15 USDT',
    },
    {
      id: 'fixed-ad',
      name: 'Watch an ad',
      description: 'Watch a short advertisement and get a reward.',
      reward: '0.05 USDT',
    },
  ];

  return (
    <div className="p-4 pt-2 pb-20">
      {/* ВРЕМЕННО: отладочная информация */}
      <div className="mb-2 p-2 bg-yellow-100 text-xs rounded">
        <div><b>Debug:</b> telegramId: {user?.telegramId || 'нет'} | subscribed: {String(subscribed)}</div>
      </div>
      <h1 className="text-2xl font-bold mb-4 text-center">Tasks</h1>
      {/* Фиксированные задания */}
      <div className="space-y-4 mb-6">
        {fixedTasks.map(task => (
          <div key={task.id} className="bg-tg-card p-4 rounded-xl shadow border border-green-400">
            <div className="font-bold text-lg mb-1">{task.name}</div>
            <div className="text-tg-hint text-sm mb-2">{task.description}</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-tg-hint">Reward: <b>{task.reward}</b></span>
              {task.id === 'fixed-telegram' ? (
                subscribed ? (
                  <span className="text-green-500 font-bold">✔ Subscribed</span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={handleTelegramComplete}>
                    Complete
                  </button>
                )
              ) : (
                <button className="btn btn-primary btn-sm" disabled>Complete</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* UNU-задания всегда отображаются */}
      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-semibold mb-2 text-center">Additional tasks</h2>
        {activeUnuTasks.length === 0 ? (
          <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm text-center">
            No available tasks.
          </div>
        ) : (
          activeUnuTasks.map(task => (
            <div key={task.id} className="bg-tg-card p-4 rounded-xl shadow border border-blue-400">
              <div className="font-bold text-lg mb-1">{task.name}</div>
              <div className="text-tg-hint text-sm mb-2">Reward: <b>{formatPriceInUsd(task.price_rub)}</b></div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-tg-hint">Limit: {task.limit_total}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => handleUnuDetails(task.id)}>Details</button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Модальное окно предупреждения */}
      {showSubscribeModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl p-6 max-w-xs text-center shadow-xl">
            <div className="text-red-500 font-semibold mb-4">To start completing tasks, please subscribe to our Telegram channel first.</div>
            <button className="btn btn-primary w-full" onClick={() => setShowSubscribeModal(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
} 