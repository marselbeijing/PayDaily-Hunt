import React from 'react';
import { useQuery } from 'react-query';
import { getLeaderboard } from '../services/api';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const { data: leaderboard, isLoading } = useQuery(
    'leaderboard',
    getLeaderboard,
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  if (isLoading) {
    return (
      <div className="leaderboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка рейтинга...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>🏆 Рейтинг</h1>
        <p>Топ игроков по заработку</p>
      </div>
      
      <div className="leaderboard-content">
        {leaderboard && leaderboard.length > 0 ? (
          <div className="leaderboard-list">
            {leaderboard.map((user, index) => (
              <div key={user._id} className={`leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}`}>
                <div className="rank">
                  {index < 3 ? (
                    <div className="medal">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                  ) : (
                    <span className="rank-number">{index + 1}</span>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-avatar">
                    {user.firstName ? user.firstName[0] : user.username[0]}
                  </div>
                  <div className="user-details">
                    <div className="user-name">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username
                      }
                    </div>
                    <div className="user-stats">
                      <span>Заданий: {user.tasksCompleted}</span>
                      <span>VIP: {user.vipLevel}</span>
                    </div>
                  </div>
                </div>
                <div className="user-earnings">
                  {user.totalEarned} USDT
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-leaderboard">
            <div className="empty-icon">🏆</div>
            <h3>Рейтинг пуст</h3>
            <p>Будьте первым в рейтинге!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;