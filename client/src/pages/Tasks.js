import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Tasks({ onNavigate }) {
  const { loading, token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [adgemOffers, setAdgemOffers] = useState([]);
  const [loadingTasks, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loading || !token) return;
    setLoading(true);
    Promise.all([
      api.tasks.list(),
      user ? api.adgem.offers(user.id) : Promise.resolve({ offers: [] })
    ])
      .then(([data, adgemData]) => {
        setTasks(data.tasks || []);
        setAdgemOffers(adgemData.offers || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Error loading tasks');
        setLoading(false);
      });
  }, [loading, token, user]);

  if (loadingTasks) return <div className="p-4">Loading tasks...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      {tasks.length === 0 && adgemOffers.length === 0 ? (
        <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm">
          No available tasks.
        </div>
      ) : (
        <>
          {tasks.length > 0 && (
            <div className="space-y-4 mb-6">
              {tasks.map(task => (
                <div key={task._id} className="bg-tg-card p-4 rounded-xl shadow">
                  <div className="font-bold text-lg mb-1">{task.title}</div>
                  <div className="text-tg-hint text-sm mb-2">{task.description}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-tg-hint">Reward: <b>{task.reward} USDT</b></span>
                    <button className="btn btn-primary btn-sm" onClick={() => onNavigate('task-detail', { taskId: task._id })}>Complete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {adgemOffers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-2">AdGem Offers</h2>
              {adgemOffers.map(offer => (
                <div key={offer.offer_id} className="bg-tg-card p-4 rounded-xl shadow border border-yellow-400">
                  <div className="font-bold text-lg mb-1">{offer.name}</div>
                  <div className="text-tg-hint text-sm mb-2">{offer.description}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-tg-hint">Reward: <b>{offer.payout_usd} USD</b></span>
                    <a className="btn btn-secondary btn-sm" href={offer.tracking_url} target="_blank" rel="noopener noreferrer">Перейти</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
} 