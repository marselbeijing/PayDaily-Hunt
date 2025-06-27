import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, formatPoints, handleApiError } from '../services/api';
import toast from 'react-hot-toast';

const HomePage = () => {
  const { user, dailyCheckIn, updateUser } = useAuth();
  const [stats, setStats] = useState({
    todayEarnings: 0,
    tasksAvailable: 0,
    topTask: null
  });
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboardResponse, tasksResponse] = await Promise.all([
        api.getDashboardStats(),
        api.getTasks({ limit: 1, page: 1 })
      ]);

      setStats({
        todayEarnings: dashboardResponse.todayEarnings || 0,
        tasksAvailable: tasksResponse.pagination?.total || 0,
        topTask: tasksResponse.tasks[0] || null
      });
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user.canCheckIn || checkingIn) return;

    setCheckingIn(true);
    try {
      const response = await dailyCheckIn();
      toast.success(`Получено ${response.reward} баллов! День ${response.newStreak}`, {
        icon: '🎉',
        duration: 4000
      });
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setCheckingIn(false);
    }
  };

  const getVipLevelInfo = (level) => {
    const levels = {
      bronze: { name: 'Бронза', color: '#CD7F32', next: 'silver', pointsNeeded: 5000 },
      silver: { name: 'Серебро', color: '#C0C0C0', next: 'gold', pointsNeeded: 20000 },
      gold: { name: 'Золото', color: '#FFD700', next: 'platinum', pointsNeeded: 50000 },
      platinum: { name: 'Платина', color: '#E5E4E2', next: 'diamond', pointsNeeded: 100000 },
      diamond: { name: 'Алмаз', color: '#B9F2FF', next: null, pointsNeeded: 0 }
    };
    return levels[level] || levels.bronze;
  };

  const vipInfo = getVipLevelInfo(user?.vipLevel);
  const progressToNext = vipInfo.next ? 
    Math.min(100, (user?.points / vipInfo.pointsNeeded) * 100) : 100;

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Приветствие и баланс */}
      <div className="user-header">
        <div className="user-welcome">
          <h1>Привет, {user?.displayName}! 👋</h1>
          <p className="user-level">Уровень {user?.level} • {vipInfo.name}</p>
        </div>
        
        <div className="user-balance">
          <div className="balance-main">
            <span className="balance-label">Баланс</span>
            <span className="balance-amount">{formatPoints(user?.points || 0)}</span>
          </div>
          <div className="balance-usdt">
            ≈ ${((user?.points || 0) / 1000).toFixed(2)} USDT
          </div>
        </div>
      </div>

      {/* VIP прогресс */}
      {vipInfo.next && (
        <div className="vip-progress-card">
          <div className="vip-progress-header">
            <span>Прогресс до {getVipLevelInfo(vipInfo.next).name}</span>
            <span>{Math.floor(progressToNext)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${progressToNext}%`,
                backgroundColor: vipInfo.color 
              }}
            />
          </div>
          <div className="vip-progress-info">
            <span>{formatPoints(user?.points || 0)} / {formatPoints(vipInfo.pointsNeeded)}</span>
            <span>+{((getVipLevelInfo(vipInfo.next).name === 'Серебро' ? 10 : 
                       getVipLevelInfo(vipInfo.next).name === 'Золото' ? 20 :
                       getVipLevelInfo(vipInfo.next).name === 'Платина' ? 30 : 50))}% к наградам</span>
          </div>
        </div>
      )}

      {/* Ежедневный чек-ин */}
      <div className="checkin-card">
        <div className="checkin-header">
          <div>
            <h3>Ежедневные награды</h3>
            <p>Серия: {user?.dailyStreak || 0} дней</p>
          </div>
          <div className="checkin-streak">
            🔥 {user?.dailyStreak || 0}
          </div>
        </div>
        
        <div className="checkin-rewards">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const rewards = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35, 7: 100 };
            const isCompleted = (user?.dailyStreak || 0) >= day;
            const isCurrent = (user?.dailyStreak || 0) + 1 === day && user?.canCheckIn;
            
            return (
              <div 
                key={day} 
                className={`reward-day ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="day-number">День {day}</div>
                <div className="day-reward">{rewards[day]}</div>
                <div className="day-icon">
                  {isCompleted ? '✅' : isCurrent ? '🎁' : '⭕'}
                </div>
              </div>
            );
          })}
        </div>
        
        <button 
          className={`checkin-button ${!user?.canCheckIn ? 'disabled' : ''}`}
          onClick={handleCheckIn}
          disabled={!user?.canCheckIn || checkingIn}
        >
          {checkingIn ? 'Получение...' : 
           user?.canCheckIn ? `Получить награду дня ${(user?.dailyStreak || 0) + 1}` : 
           'Награда уже получена'}
        </button>
      </div>

      {/* Быстрая статистика */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatPoints(stats.todayEarnings)}</div>
            <div className="stat-label">Заработано сегодня</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.tasksAvailable}</div>
            <div className="stat-label">Доступно заданий</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{user?.tasksCompleted || 0}</div>
            <div className="stat-label">Выполнено</div>
          </div>
        </div>
      </div>

      {/* Рекомендуемое задание */}
      {stats.topTask && (
        <div className="featured-task">
          <h3>🔥 Рекомендуемое задание</h3>
          <div className="task-card featured">
            <div className="task-image">
              {stats.topTask.imageUrl ? (
                <img src={stats.topTask.imageUrl} alt={stats.topTask.title} />
              ) : (
                <div className="task-icon">
                  {stats.topTask.type === 'video' ? '📺' :
                   stats.topTask.type === 'survey' ? '📝' :
                   stats.topTask.type === 'social' ? '📱' : '🔗'}
                </div>
              )}
            </div>
            
            <div className="task-info">
              <h4>{stats.topTask.title}</h4>
              <p>{stats.topTask.description}</p>
              <div className="task-meta">
                <span className="task-reward">+{stats.topTask.reward} баллов</span>
                <span className="task-time">~{stats.topTask.estimatedTime} мин</span>
              </div>
            </div>
            
            <button 
              className="task-start-btn"
              onClick={() => window.location.href = `/task/${stats.topTask._id}`}
            >
              Начать
            </button>
          </div>
        </div>
      )}

      {/* Быстрые действия */}
      <div className="quick-actions">
        <h3>Быстрые действия</h3>
        <div className="action-buttons">
          <a href="/tasks" className="action-btn">
            <span className="action-icon">📋</span>
            <span>Все задания</span>
          </a>
          
          <a href="/referrals" className="action-btn">
            <span className="action-icon">👥</span>
            <span>Пригласить друзей</span>
          </a>
          
          <a href="/withdraw" className="action-btn">
            <span className="action-icon">💸</span>
            <span>Вывести деньги</span>
          </a>
          
          <a href="/leaderboard" className="action-btn">
            <span className="action-icon">🏆</span>
            <span>Рейтинг</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;