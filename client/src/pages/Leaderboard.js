import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.users.leaderboard()
      .then(data => {
        setUsers(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки лидерборда');
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-4">Лидерборд</h1>
      {loading ? (
        <div>Загрузка...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-tg-hint text-sm">Нет данных для отображения.</div>
      ) : (
        <ol className="space-y-2">
          {users.slice(0, 10).map((user, idx) => (
            <li key={user.id} className="bg-tg-card p-2 rounded flex justify-between items-center">
              <span className="font-mono">#{idx + 1}</span>
              <span className="flex-1 mx-2">{user.username || user.id}</span>
              <span className="font-bold">{user.balance} USDT</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
} 