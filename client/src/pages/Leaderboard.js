import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Leaderboard({ onNavigate }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.users.leaderboard()
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Error loading leaderboard');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Loading leaderboard...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 pt-2 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold mb-4 text-center w-full">Leaderboard</h1>
      
      {leaderboard.length === 0 ? (
        <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm flex items-center justify-center w-full text-center">
          No data to display
        </div>
      ) : (
        <div className="space-y-3 w-full">
          {leaderboard.map((user, index) => (
            <div key={user._id} className="bg-tg-card p-4 rounded-xl shadow flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 ${
                  index === 0 ? 'bg-yellow-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-bold">{user.firstName} {user.lastName}</div>
                  <div className="text-sm text-tg-hint">@{user.username || 'unknown'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold">{user.balance || 0} USDT</div>
                <div className="text-xs text-tg-hint">{user.completedTasks || 0} tasks</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
