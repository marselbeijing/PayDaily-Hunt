import React, { useEffect, useState } from 'react';
import { api, formatPriceInUsd } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Tasks({ onNavigate }) {
  const { loading, token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unuTasks, setUnuTasks] = useState([]);

  useEffect(() => {
    if (loading || !token) return;
    setLoading(true);
    Promise.all([
      api.tasks.list(),
      api.unu.tasks()
    ])
      .then(([data, unuData]) => {
        setTasks(data.tasks || []);
        setUnuTasks(unuData.tasks || []);
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
      <h1 className="text-2xl font-bold mb-4 text-center">Tasks</h1>
      {unuTasks.length === 0 ? (
        <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm text-center">
          No available tasks.
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold mb-2 text-center">Additional tasks</h2>
          {unuTasks.map(task => (
            <div key={task.id} className="bg-tg-card p-4 rounded-xl shadow border border-blue-400">
              <div className="font-bold text-lg mb-1">{task.name}</div>
              <div className="text-tg-hint text-sm mb-2">Reward: <b>{formatPriceInUsd(task.price_rub)}</b></div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-tg-hint">Limit: {task.limit_total}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('unu-task-detail', { taskId: task.id })}>Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 