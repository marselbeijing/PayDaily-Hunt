import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Tasks({ onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.tasks.list()
      .then(data => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Error loading tasks');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Loading tasks...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      {tasks.length === 0 ? (
        <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm">
          No available tasks.
        </div>
      ) : (
        <div className="space-y-4">
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
    </div>
  );
} 