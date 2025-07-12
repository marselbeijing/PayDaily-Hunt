import React from 'react';
import { useQuery } from 'react-query';
import { getTasks } from '../services/api';
import './TasksPage.css';

const TasksPage = () => {
  const { data: tasks, isLoading } = useQuery(
    'tasks',
    getTasks,
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  if (isLoading) {
    return (
      <div className="tasks-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка заданий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1>Задания</h1>
        <p>Выполняйте задания и зарабатывайте деньги</p>
      </div>
      
      <div className="tasks-content">
        {tasks && tasks.length > 0 ? (
          <div className="tasks-grid">
            {tasks.map((task) => (
              <div key={task._id} className="task-card">
                <div className="task-header">
                  <h3>{task.title}</h3>
                  <div className="task-reward">{task.reward} USDT</div>
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-meta">
                  <span>Сложность: {task.difficulty}</span>
                  <span>Время: {task.estimatedTime} мин</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tasks">
            <div className="empty-icon">📋</div>
            <h3>Заданий пока нет</h3>
            <p>Скоро появятся новые задания для выполнения</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;