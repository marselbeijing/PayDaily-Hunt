import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
        setError('Ошибка загрузки профиля');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Загрузка профиля...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-2">Профиль</h1>
      <div className="mb-4">
        <div className="text-tg-hint text-sm mb-1">Telegram</div>
        <div className="font-mono">{profile?.username || user?.username || '—'}</div>
        <div className="text-tg-hint text-xs">ID: {profile?.id || user?.id || '—'}</div>
      </div>
      <div className="mb-4">
        <div className="text-tg-hint text-sm mb-1">VIP уровень</div>
        <div className="font-bold text-lg">{profile?.vipLevel ?? 0}</div>
      </div>
      <div className="mb-4">
        <div className="text-tg-hint text-sm mb-1">Рефералы</div>
        <div className="text-tg-hint text-xs mb-1">Всего: {referrals.length}</div>
        {referrals.length === 0 ? (
          <div className="text-tg-hint text-xs">Нет рефералов</div>
        ) : (
          <ul className="text-xs list-disc pl-4">
            {referrals.slice(0, 5).map((ref, idx) => (
              <li key={idx}>{ref.username || ref.id}</li>
            ))}
            {referrals.length > 5 && <li>и ещё {referrals.length - 5}...</li>}
          </ul>
        )}
      </div>
      <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm">
        Здесь будет больше информации о достижениях и настройках.
      </div>
    </div>
  );
} 