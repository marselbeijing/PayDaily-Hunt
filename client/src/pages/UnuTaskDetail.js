import React, { useEffect, useState } from 'react';
import { api, formatPriceInUsd } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function UnuTaskDetail({ taskId, onNavigate }) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    
    api.unu.taskDetail(taskId)
      .then(data => {
        setTask(data.task);
        setLoading(false);
      })
      .catch(err => {
        setError('Error loading task details');
        setLoading(false);
      });
  }, [taskId]);

  const handleStartTask = () => {
    if (task.link) {
      window.open(task.link, '_blank');
    }
  };

  const handleSubmitReport = async () => {
    const proof = prompt('Введите доказательство выполнения задания:');
    if (!proof) return;

    setSubmitting(true);
    try {
      // Здесь можно добавить логику отправки отчета через UNU API
      // Пока просто показываем уведомление
      alert('Отчет отправлен на проверку');
    } catch (err) {
      alert('Ошибка при отправке отчета');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4">Loading task details...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!task) return <div className="p-4">Task not found</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <div className="flex items-center mb-4">
        <button onClick={() => onNavigate('tasks')} className="mr-3 text-blue-500">← Back</button>
        <h1 className="text-2xl font-bold">UNU Task Details</h1>
      </div>

      <div className="bg-tg-card p-4 rounded-xl shadow mb-4">
        <h2 className="text-xl font-bold mb-2">{task.name}</h2>
        <div className="text-tg-hint text-sm mb-4">{task.descr}</div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-xs text-tg-hint">Reward:</span>
            <div className="font-bold">{formatPriceInUsd(task.price_rub)}</div>
          </div>
          <div>
            <span className="text-xs text-tg-hint">Status:</span>
            <div className={`font-bold ${
              task.status === 4 ? 'text-green-500' : 
              task.status === 3 ? 'text-red-500' : 
              task.status === 6 ? 'text-yellow-500' : 'text-gray-500'
            }`}>
              {task.status === 4 ? 'Active' : 
               task.status === 3 ? 'Stopped' : 
               task.status === 6 ? 'Under Review' : 'Inactive'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-xs text-tg-hint">Total Limit:</span>
            <div className="font-bold">{task.limit_total}</div>
          </div>
          <div>
            <span className="text-xs text-tg-hint">Tariff ID:</span>
            <div className="font-bold">{task.tarif_id}</div>
          </div>
        </div>

        {task.need_for_report && (
          <div className="mb-4">
            <span className="text-xs text-tg-hint">Required for report:</span>
            <div className="text-sm mt-1">{task.need_for_report}</div>
          </div>
        )}

        <div className="space-y-2">
          {task.status === 4 && (
            <>
              {task.link && (
                <button 
                  className="btn btn-primary w-full"
                  onClick={handleStartTask}
                >
                  Start Task
                </button>
              )}
              <button 
                className="btn btn-secondary w-full"
                onClick={handleSubmitReport}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </>
          )}
          {task.status !== 4 && (
            <div className="text-center text-tg-hint text-sm">
              This task is not currently active
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 