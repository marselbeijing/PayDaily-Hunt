import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function TaskDetail({ taskId, onNavigate }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!taskId) {
      setError('ID задания не указан');
      setLoading(false);
      return;
    }

    api.tasks.detail(taskId)
      .then(data => {
        setTask(data.task);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки задания');
        setLoading(false);
      });
  }, [taskId]);

  const handleComplete = () => {
    api.tasks.complete(taskId, {})
      .then(data => {
        setCompleted(true);
        setMessage(data.message || 'Задание выполнено!');
      })
      .catch(() => {
        setMessage('Ошибка при выполнении задания');
      });
  };

  if (loading) return <div className="p-4">Загрузка...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!task) return <div className="p-4">Задание не найдено</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <button className="mb-4 text-blue-500" onClick={() => onNavigate('tasks')}>&larr; Назад</button>
      <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
      <div className="text-tg-hint text-sm mb-2">{task.description}</div>
      <div className="mb-4">Награда: <b>{task.reward} USDT</b></div>
      {completed ? (
        <div className="text-green-600 font-bold mb-4">{message}</div>
      ) : (
        <button className="btn btn-primary" onClick={handleComplete}>Выполнить задание</button>
      )}
      {message && !completed && <div className="text-red-500 mt-2">{message}</div>}
    </div>
  );
}
