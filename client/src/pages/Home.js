import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function Home({ onNavigate }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.tasks.history()
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки истории наград');
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-2">Привет, {user?.firstName || 'Гость'}!</h1>
      <div className="mb-4">
        <div className="text-tg-hint text-sm mb-1">Твой баланс</div>
        <div className="text-3xl font-mono font-bold">{user?.balance ?? 0} <span className="text-base font-normal">USDT</span></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button className="btn btn-primary" onClick={() => onNavigate('tasks')}>Выполнить задание</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('wallet')}>Получить награду</button>
      </div>
      <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm mb-4">
        Ежедневно выполняй задания и получай реальные награды в криптовалюте!
      </div>
      <div className="mb-2 font-bold">История наград</div>
      {loading ? (
        <div>Загрузка...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-tg-hint text-sm">Нет наград за последние дни.</div>
      ) : (
        <ul className="space-y-2">
          {history.slice(0, 5).map((item, idx) => (
            <li key={idx} className="bg-tg-card p-2 rounded flex justify-between items-center">
              <span className="text-sm">{item.taskTitle || 'Задание'}</span>
              <span className="font-mono text-green-500">+{item.reward} USDT</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 