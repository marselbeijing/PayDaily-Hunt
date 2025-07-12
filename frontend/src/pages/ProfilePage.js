import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, getReferrals, formatCurrency, formatPoints, getVipColor, getVipEmoji, copyToClipboard } from '../services/api';
import toast from 'react-hot-toast';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Получаем данные профиля
  const { data: profileData, isLoading: profileLoading } = useQuery(
    'profile',
    getProfile,
    { staleTime: 5 * 60 * 1000 }
  );

  // Получаем данные рефералов
  const { data: referralsData, isLoading: referralsLoading } = useQuery(
    'referrals',
    getReferrals,
    { staleTime: 5 * 60 * 1000 }
  );

  const handleCopyReferralLink = async () => {
    if (profileData?.referralLink) {
      try {
        await copyToClipboard(profileData.referralLink);
        toast.success('Реферальная ссылка скопирована!');
      } catch (error) {
        toast.error('Не удалось скопировать ссылку');
      }
    }
  };

  const handleCopyReferralCode = async () => {
    if (profileData?.referralCode) {
      try {
        await copyToClipboard(profileData.referralCode);
        toast.success('Реферальный код скопирован!');
      } catch (error) {
        toast.error('Не удалось скопировать код');
      }
    }
  };

  if (profileLoading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        {/* Заголовок */}
        <div className="profile-header">
          <h1>Профиль</h1>
          <div className="profile-avatar">
            <div className="avatar-placeholder">
              {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
          </div>
        </div>

        {/* Табы */}
        <div className="profile-tabs">
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Профиль
          </button>
          <button 
            className={`tab ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            Рефералы
          </button>
        </div>

        {/* Контент профиля */}
        {activeTab === 'profile' && (
          <div className="profile-content">
            {/* Основная информация */}
            <div className="profile-card">
              <h3>Основная информация</h3>
              <div className="profile-info">
                <div className="info-row">
                  <span className="label">Имя:</span>
                  <span className="value">{profileData?.firstName || 'Не указано'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Username:</span>
                  <span className="value">@{profileData?.username || 'Не указано'}</span>
                </div>
                <div className="info-row">
                  <span className="label">VIP уровень:</span>
                  <span className="value vip-level" style={{ color: getVipColor(profileData?.vipLevel) }}>
                    {getVipEmoji(profileData?.vipLevel)} {profileData?.vipLevel}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Уровень:</span>
                  <span className="value">{profileData?.level || 1}</span>
                </div>
              </div>
            </div>

            {/* Статистика */}
            <div className="profile-card">
              <h3>Статистика</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{formatPoints(profileData?.points || 0)}</div>
                  <div className="stat-label">Баллы</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{formatCurrency(profileData?.totalEarned || 0)}</div>
                  <div className="stat-label">Заработано</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{profileData?.tasksCompleted || 0}</div>
                  <div className="stat-label">Заданий выполнено</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{profileData?.referrals || 0}</div>
                  <div className="stat-label">Рефералов</div>
                </div>
              </div>
            </div>

            {/* Реферальная программа */}
            <div className="profile-card">
              <h3>Реферальная программа</h3>
              <div className="referral-info">
                <div className="referral-stats">
                  <div className="referral-stat">
                    <div className="stat-value">{formatCurrency(profileData?.referralEarnings || 0)}</div>
                    <div className="stat-label">Заработано с рефералов</div>
                  </div>
                  <div className="referral-stat">
                    <div className="stat-value">{profileData?.referrals || 0}</div>
                    <div className="stat-label">Приглашено пользователей</div>
                  </div>
                </div>
                
                <div className="referral-code-section">
                  <div className="referral-code">
                    <span className="code-label">Ваш реферальный код:</span>
                    <div className="code-display">
                      <span className="code-text">{profileData?.referralCode || 'Загрузка...'}</span>
                      <button 
                        className="copy-btn"
                        onClick={handleCopyReferralCode}
                        title="Скопировать код"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  
                  <div className="referral-link">
                    <span className="link-label">Реферальная ссылка:</span>
                    <div className="link-display">
                      <span className="link-text">{profileData?.referralLink || 'Загрузка...'}</span>
                      <button 
                        className="copy-btn"
                        onClick={handleCopyReferralLink}
                        title="Скопировать ссылку"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>

                <div className="referral-benefits">
                  <h4>Как это работает:</h4>
                  <ul>
                    <li>🎁 Получите 100 баллов за каждого приглашенного пользователя</li>
                    <li>💰 Зарабатывайте 10% от дохода ваших рефералов</li>
                    <li>📈 Чем больше рефералов, тем больше доход</li>
                    <li>🏆 Получайте бонусы за достижения рефералов</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Контент рефералов */}
        {activeTab === 'referrals' && (
          <div className="referrals-content">
            {referralsLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                {/* Статистика рефералов */}
                <div className="referrals-stats">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-value">{referralsData?.stats?.totalReferrals || 0}</div>
                      <div className="stat-label">Всего рефералов</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                      <div className="stat-value">{formatCurrency(referralsData?.stats?.totalEarnings || 0)}</div>
                      <div className="stat-label">Заработано</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      <div className="stat-value">{referralsData?.stats?.activeReferrals || 0}</div>
                      <div className="stat-label">Активных</div>
                    </div>
                  </div>
                </div>

                {/* Список рефералов */}
                <div className="referrals-list">
                  <h3>Ваши рефералы</h3>
                  {referralsData?.referrals?.length > 0 ? (
                    <div className="referrals-grid">
                      {referralsData.referrals.map((referral, index) => (
                        <div key={referral._id || index} className="referral-card">
                          <div className="referral-avatar">
                            {referral.displayName?.charAt(0) || 'U'}
                          </div>
                          <div className="referral-info">
                            <div className="referral-name">{referral.displayName}</div>
                            <div className="referral-stats">
                              <span>Заданий: {referral.tasksCompleted || 0}</span>
                              <span>Баллы: {formatPoints(referral.points || 0)}</span>
                            </div>
                            <div className="referral-date">
                              Присоединился: {new Date(referral.registrationDate).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-referrals">
                      <div className="empty-icon">👥</div>
                      <h4>У вас пока нет рефералов</h4>
                      <p>Пригласите друзей и начните зарабатывать вместе!</p>
                      <button 
                        className="share-btn"
                        onClick={handleCopyReferralLink}
                      >
                        Поделиться ссылкой
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;