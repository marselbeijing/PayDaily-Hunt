import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.tasks.list()
      .then(data => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Ошибка загрузки заданий');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Загрузка заданий...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-4">Задания</h1>
      {tasks.length === 0 ? (
        <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm">
          Нет доступных заданий.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task._id} className="bg-tg-card p-4 rounded-xl shadow">
              <div className="font-bold text-lg mb-1">{task.title}</div>
              <div className="text-tg-hint text-sm mb-2">{task.description}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-tg-hint">Награда: <b>{task.reward} USDT</b></span>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tasks/${task._id}`)}>Выполнить</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 