import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function EwallOffers() {
  const { user, token } = useAuth();
  const [offerwallUrl, setOfferwallUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!token) return;
    
    Promise.all([
      fetchOfferwallUrl(),
      fetchStats()
    ]).finally(() => setLoading(false));
  }, [token]);

  const fetchOfferwallUrl = async () => {
    try {
      const response = await fetch('/api/ewall/offerwall', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки офферволла');
      }
      
      const data = await response.json();
      setOfferwallUrl(data.offerwallUrl);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ewall/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 pt-2 pb-20">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-tg-hint">Загрузка офферволла...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 pt-2 pb-20">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Ошибка: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-4 text-center">Ewall Офферволл</h1>
      
      {stats && (
        <div className="bg-tg-card p-4 rounded-xl shadow mb-4">
          <h2 className="text-lg font-semibold mb-3">Ваша статистика</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-500">{stats.totalCompleted}</div>
              <div className="text-sm text-tg-hint">Завершено</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">{stats.totalEarned.toFixed(4)}</div>
              <div className="text-sm text-tg-hint">USDT заработано</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <div className="text-sm text-tg-hint">В ожидании</div>
            </div>
          </div>
        </div>
      )}

      {offerwallUrl && (
        <div className="bg-tg-card rounded-xl shadow overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-green-500 to-blue-500">
            <h2 className="text-white font-semibold text-center">Доступные задания</h2>
          </div>
          <div className="relative" style={{ height: '600px' }}>
            <iframe
              src={offerwallUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="auto"
              title="Ewall Offerwall"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
