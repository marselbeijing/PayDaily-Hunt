import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { getProfile, getReferrals } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // Получаем данные профиля
  const { data: profileData, isLoading: profileLoading } = useQuery(
    'profile',
    getProfile,
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  // Получаем данные рефералов
  const { data: referralsData, isLoading: referralsLoading } = useQuery(
    'referrals',
    getReferrals,
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  useEffect(() => {
    if (profileData?.user) {
      setFormData({
        firstName: profileData.user.firstName || '',
        lastName: profileData.user.lastName || '',
        email: profileData.user.email || '',
        phone: profileData.user.phone || ''
      });
    }
  }, [profileData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Профиль обновлен успешно');
    } catch (error) {
      toast.error('Ошибка при обновлении профиля');
    }
  };

  const copyReferralCode = () => {
    if (referralsData?.referralCode) {
      navigator.clipboard.writeText(referralsData.referralCode);
      toast.success('Реферальный код скопирован!');
    }
  };

  const copyReferralLink = () => {
    if (referralsData?.referralLink) {
      navigator.clipboard.writeText(referralsData.referralLink);
      toast.success('Реферальная ссылка скопирована!');
    }
  };

  const shareReferralLink = () => {
    if (referralsData?.referralLink && window.Telegram?.WebApp) {
      window.Telegram.WebApp.showPopup({
        title: 'Поделиться реферальной ссылкой',
        message: `Пригласите друзей и получайте ${referralsData?.stats?.bonusPercent || 10}% от их заработка!\n\n${referralsData.referralLink}`,
        buttons: [
          {
            type: 'default',
            text: 'Поделиться',
            id: 'share'
          },
          {
            type: 'cancel',
            text: 'Отмена'
          }
        ]
      });
    }
  };

  if (profileLoading || referralsLoading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  const profile = profileData?.user;
  const referrals = referralsData;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Профиль</h1>
      </div>

      {/* Основная информация профиля */}
      <div className="profile-section">
        <div className="section-header">
          <h2>Основная информация</h2>
          <button 
            className="edit-btn"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Отмена' : 'Редактировать'}
          </button>
        </div>

        <div className="profile-info">
          <div className="info-row">
            <label>Имя:</label>
            {isEditing ? (
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Введите имя"
              />
            ) : (
              <span>{profile?.firstName || 'Не указано'}</span>
            )}
          </div>

          <div className="info-row">
            <label>Фамилия:</label>
            {isEditing ? (
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Введите фамилию"
              />
            ) : (
              <span>{profile?.lastName || 'Не указано'}</span>
            )}
          </div>

          <div className="info-row">
            <label>Email:</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Введите email"
              />
            ) : (
              <span>{profile?.email || 'Не указано'}</span>
            )}
          </div>

          <div className="info-row">
            <label>Телефон:</label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Введите телефон"
              />
            ) : (
              <span>{profile?.phone || 'Не указано'}</span>
            )}
          </div>

          {isEditing && (
            <button className="save-btn" onClick={handleSaveProfile}>
              Сохранить
            </button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="profile-section">
        <h2>Статистика</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{profile?.balance || 0}</div>
            <div className="stat-label">Баланс</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile?.tasksCompleted || 0}</div>
            <div className="stat-label">Заданий выполнено</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile?.totalEarned || 0}</div>
            <div className="stat-label">Всего заработано</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile?.vipLevel || 'none'}</div>
            <div className="stat-label">VIP уровень</div>
          </div>
        </div>
      </div>

      {/* Реферальная программа */}
      <div className="profile-section">
        <h2>Реферальная программа</h2>
        
        {referrals && (
          <>
            {/* Реферальный код */}
            <div className="referral-code-section">
              <h3>Ваш реферальный код</h3>
              <div className="referral-code-container">
                <div className="referral-code">{referrals.referralCode}</div>
                <button className="copy-btn" onClick={copyReferralCode}>
                  Копировать
                </button>
              </div>
              
              <div className="referral-link-container">
                <div className="referral-link">{referrals.referralLink}</div>
                <button className="copy-btn" onClick={copyReferralLink}>
                  Копировать ссылку
                </button>
              </div>
              
              <button className="share-btn" onClick={shareReferralLink}>
                Поделиться с друзьями
              </button>
            </div>

            {/* Статистика рефералов */}
            <div className="referral-stats">
              <h3>Статистика рефералов</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{referrals.stats?.totalReferrals || 0}</div>
                  <div className="stat-label">Всего рефералов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{referrals.stats?.activeReferrals || 0}</div>
                  <div className="stat-label">Активных рефералов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{referrals.stats?.currentEarnings || 0}</div>
                  <div className="stat-label">Заработано с рефералов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{referrals.stats?.potentialEarnings || 0}</div>
                  <div className="stat-label">Потенциальный доход</div>
                </div>
              </div>
              
              <div className="bonus-info">
                <p>Вы получаете <strong>{referrals.stats?.bonusPercent || 10}%</strong> от заработка каждого приглашенного пользователя!</p>
              </div>
            </div>

            {/* Список рефералов */}
            {referrals.referrals && referrals.referrals.length > 0 && (
              <div className="referrals-list">
                <h3>Ваши рефералы ({referrals.referrals.length})</h3>
                <div className="referrals-grid">
                  {referrals.referrals.map((referral) => (
                    <div key={referral.id} className="referral-card">
                      <div className="referral-avatar">
                        {referral.firstName ? referral.firstName[0] : referral.username[0]}
                      </div>
                      <div className="referral-info">
                        <div className="referral-name">
                          {referral.firstName && referral.lastName 
                            ? `${referral.firstName} ${referral.lastName}`
                            : referral.username
                          }
                        </div>
                        <div className="referral-stats">
                          <span>Заработал: {referral.totalEarned}</span>
                          <span>Заданий: {referral.tasksCompleted}</span>
                        </div>
                        <div className="referral-date">
                          Присоединился: {new Date(referral.joinedAt).toLocaleDateString('ru-RU')}
                        </div>
                        <div className={`referral-status ${referral.isActive ? 'active' : 'inactive'}`}>
                          {referral.isActive ? 'Активен' : 'Неактивен'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!referrals.referrals || referrals.referrals.length === 0) && (
              <div className="empty-referrals">
                <div className="empty-icon">👥</div>
                <h3>У вас пока нет рефералов</h3>
                <p>Поделитесь своей реферальной ссылкой с друзьями и начните зарабатывать вместе!</p>
                <button className="share-btn" onClick={shareReferralLink}>
                  Пригласить друзей
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;