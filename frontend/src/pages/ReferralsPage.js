import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { getReferrals, getProfile, formatCurrency, formatPoints, copyToClipboard } from '../services/api';
import toast from 'react-hot-toast';
import './ReferralsPage.css';

const ReferralsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Получаем данные рефералов
  const { data: referralsData, isLoading: referralsLoading, refetch: refetchReferrals } = useQuery(
    'referrals',
    getReferrals,
    { staleTime: 5 * 60 * 1000 }
  );

  // Получаем данные профиля
  const { data: profileData, isLoading: profileLoading } = useQuery(
    'profile',
    getProfile,
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

  const handleShareTelegram = () => {
    const text = `🎯 Привет! Я использую PayDaily Hunt для заработка. Присоединяйся ко мне и начни зарабатывать! 

💰 Зарабатывай деньги выполняя простые задания
🎁 Получи 100 баллов за регистрацию
📈 Развивайся и повышай свой уровень

Моя реферальная ссылка: ${profileData?.referralLink || ''}

#PayDailyHunt #Заработок #Рефералы`;

    const url = `https://t.me/share/url?url=${encodeURIComponent(profileData?.referralLink || '')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = `🎯 Привет! Я использую PayDaily Hunt для заработка. Присоединяйся ко мне и начни зарабатывать! 

💰 Зарабатывай деньги выполняя простые задания
🎁 Получи 100 баллов за регистрацию
📈 Развивайся и повышай свой уровень

Моя реферальная ссылка: ${profileData?.referralLink || ''}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (referralsLoading || profileLoading) {
    return (
      <div className="referrals-page">
        <div className="container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="referrals-page">
      <div className="container">
        {/* Заголовок */}
        <div className="referrals-header">
          <h1>Реферальная программа</h1>
          <p className="subtitle">Приглашайте друзей и зарабатывайте вместе!</p>
        </div>

        {/* Табы */}
        <div className="referrals-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Обзор
          </button>
          <button 
            className={`tab ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            Мои рефералы
          </button>
          <button 
            className={`tab ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            Поделиться
          </button>
        </div>

        {/* Обзор */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            {/* Статистика */}
            <div className="stats-section">
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <div className="stat-value">{referralsData?.stats?.totalReferrals || 0}</div>
                    <div className="stat-label">Всего рефералов</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <div className="stat-value">{formatCurrency(referralsData?.stats?.totalEarnings || 0)}</div>
                    <div className="stat-label">Заработано</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <div className="stat-value">{referralsData?.stats?.activeReferrals || 0}</div>
                    <div className="stat-label">Активных</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">📈</div>
                  <div className="stat-info">
                    <div className="stat-value">10%</div>
                    <div className="stat-label">Комиссия</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Как это работает */}
            <div className="how-it-works">
              <h3>Как это работает</h3>
              <div className="steps-grid">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Поделитесь ссылкой</h4>
                    <p>Отправьте свою реферальную ссылку друзьям в социальных сетях</p>
                  </div>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Друг регистрируется</h4>
                    <p>Ваш друг переходит по ссылке и регистрируется в приложении</p>
                  </div>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Получайте бонусы</h4>
                    <p>Вы получаете 100 баллов сразу и 10% от всех заработков реферала</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Преимущества */}
            <div className="benefits-section">
              <h3>Преимущества реферальной программы</h3>
              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon">🎁</div>
                  <h4>Мгновенные бонусы</h4>
                  <p>100 баллов за каждого приглашенного пользователя</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">💰</div>
                  <h4>Пассивный доход</h4>
                  <p>10% от всех заработков ваших рефералов</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">📈</div>
                  <h4>Неограниченный потенциал</h4>
                  <p>Приглашайте сколько угодно друзей</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🏆</div>
                  <h4>Дополнительные бонусы</h4>
                  <p>Специальные награды за достижения рефералов</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Мои рефералы */}
        {activeTab === 'referrals' && (
          <div className="referrals-content">
            {referralsData?.referrals?.length > 0 ? (
              <div className="referrals-list">
                <div className="list-header">
                  <h3>Ваши рефералы ({referralsData.referrals.length})</h3>
                  <button 
                    className="refresh-btn"
                    onClick={() => refetchReferrals()}
                    title="Обновить"
                  >
                    🔄
                  </button>
                </div>
                <div className="referrals-grid">
                  {referralsData.referrals.map((referral, index) => (
                    <div key={referral._id || index} className="referral-card">
                      <div className="referral-avatar">
                        {referral.displayName?.charAt(0) || 'U'}
                      </div>
                      <div className="referral-info">
                        <div className="referral-name">{referral.displayName}</div>
                        <div className="referral-stats">
                          <span className="stat">
                            <span className="stat-label">Заданий:</span>
                            <span className="stat-value">{referral.tasksCompleted || 0}</span>
                          </span>
                          <span className="stat">
                            <span className="stat-label">Баллы:</span>
                            <span className="stat-value">{formatPoints(referral.points || 0)}</span>
                          </span>
                        </div>
                        <div className="referral-date">
                          Присоединился: {new Date(referral.registrationDate).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div className="referral-status">
                        {referral.tasksCompleted > 0 ? (
                          <span className="status active">Активен</span>
                        ) : (
                          <span className="status inactive">Неактивен</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-referrals">
                <div className="empty-icon">👥</div>
                <h4>У вас пока нет рефералов</h4>
                <p>Пригласите друзей и начните зарабатывать вместе!</p>
                <div className="empty-actions">
                  <button 
                    className="share-btn primary"
                    onClick={() => setActiveTab('share')}
                  >
                    Поделиться ссылкой
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Поделиться */}
        {activeTab === 'share' && (
          <div className="share-content">
            {/* Реферальный код */}
            <div className="referral-code-section">
              <h3>Ваш реферальный код</h3>
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

            {/* Реферальная ссылка */}
            <div className="referral-link-section">
              <h3>Реферальная ссылка</h3>
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

            {/* Кнопки поделиться */}
            <div className="share-buttons">
              <h3>Поделиться в социальных сетях</h3>
              <div className="share-grid">
                <button 
                  className="share-btn telegram"
                  onClick={handleShareTelegram}
                >
                  <span className="share-icon">📱</span>
                  <span className="share-text">Telegram</span>
                </button>
                <button 
                  className="share-btn whatsapp"
                  onClick={handleShareWhatsApp}
                >
                  <span className="share-icon">💬</span>
                  <span className="share-text">WhatsApp</span>
                </button>
                <button 
                  className="share-btn copy"
                  onClick={handleCopyReferralLink}
                >
                  <span className="share-icon">📋</span>
                  <span className="share-text">Скопировать</span>
                </button>
              </div>
            </div>

            {/* Советы по привлечению */}
            <div className="tips-section">
              <h3>Советы по привлечению рефералов</h3>
              <div className="tips-list">
                <div className="tip-item">
                  <div className="tip-icon">💡</div>
                  <div className="tip-content">
                    <h4>Поделитесь своим опытом</h4>
                    <p>Расскажите друзьям о том, сколько вы заработали и какие задания выполняли</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-icon">📱</div>
                  <div className="tip-content">
                    <h4>Используйте социальные сети</h4>
                    <p>Публикуйте скриншоты своих заработков в Stories и постах</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-icon">👥</div>
                  <div className="tip-content">
                    <h4>Присоединяйтесь к группам</h4>
                    <p>Найдите группы по заработку и поделитесь своим опытом</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-icon">🎯</div>
                  <div className="tip-content">
                    <h4>Будьте активны</h4>
                    <p>Регулярно выполняйте задания, чтобы показать пример рефералам</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralsPage;