import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function Profile({ onNavigate }) {
  const { user, logout, loading: authLoading, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !token) return;
    Promise.all([
      api.auth.profile(),
      api.users.referrals()
    ])
      .then(([profileData, referralsData]) => {
        setProfile(profileData.user || null);
        setReferrals(referralsData.referrals || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Error loading profile');
        setLoading(false);
      });
  }, [authLoading, token]);

  if (loading) return <div className="p-4">Loading profile...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-tg-card p-4 rounded-xl shadow mb-4">
        <div className="text-lg font-bold mb-2">{user?.firstName} {user?.lastName}</div>
        <div className="text-tg-hint text-sm mb-1">@{user?.username || 'not specified'}</div>
        <div className="text-tg-hint text-sm">ID: {user?.telegramId}</div>
      </div>
      <div className="bg-tg-card p-4 rounded-xl shadow mb-4">
        <div className="text-lg font-bold mb-2">Balance</div>
        <div className="text-3xl font-mono font-bold">{user?.balance ?? 0} <span className="text-base font-normal">USDT</span></div>
      </div>
      <div className="bg-tg-card p-4 rounded-xl shadow mb-4">
        <div className="text-lg font-bold mb-2">Statistics</div>
        <div className="text-sm text-tg-hint">Completed tasks: {user?.completedTasks ?? 0}</div>
        <div className="text-sm text-tg-hint">Total earned: {user?.totalEarned ?? 0} USDT</div>
      </div>
      <button className="btn btn-secondary w-full" onClick={logout}>Logout</button>
    </div>
  );
}
