import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getTask } from '../services/api';
import './TaskDetailsPage.css';

const TaskDetailsPage = () => {
  const { id } = useParams();
  
  const { data: task, isLoading } = useQuery(
    ['task', id],
    () => getTask(id),
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  if (isLoading) {
    return (
      <div className="task-details-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка задания...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-details-page">
        <div className="error-container">
          <h2>Задание не найдено</h2>
          <p>Запрашиваемое задание не существует или было удалено.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-details-page">
      <div className="task-header">
        <h1>{task.title}</h1>
        <div className="task-reward">{task.reward} USDT</div>
      </div>

      <div className="task-content">
        <div className="task-description">
          <h3>Описание</h3>
          <p>{task.description}</p>
        </div>

        <div className="task-meta">
          <div className="meta-item">
            <span className="meta-label">Сложность:</span>
            <span className="meta-value">{task.difficulty}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Время выполнения:</span>
            <span className="meta-value">{task.estimatedTime} мин</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Категория:</span>
            <span className="meta-value">{task.category}</span>
          </div>
        </div>

        <div className="task-requirements">
          <h3>Требования</h3>
          <ul>
            {task.requirements && task.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>

        <button className="start-task-btn">
          Начать выполнение
        </button>
      </div>
    </div>
  );
};

export default TaskDetailsPage;