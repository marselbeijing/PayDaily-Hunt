import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { getReferrals, formatCurrency, formatNumber } from '../services/api';
import toast from 'react-hot-toast';
import './ReferralsPage.css';

const ReferralsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(false);

  // Получаем данные рефералов
  const { data: referralsData, isLoading, refetch } = useQuery(
    'referrals',
    getReferrals,
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  const copyReferralCode = async () => {
    if (referralsData?.referralCode) {
      try {
        await navigator.clipboard.writeText(referralsData.referralCode);
        setCopiedCode(true);
        toast.success('Реферальный код скопирован!');
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (error) {
        toast.error('Ошибка при копировании');
      }
    }
  };

  const copyReferralLink = async () => {
    if (referralsData?.referralLink) {
      try {
        await navigator.clipboard.writeText(referralsData.referralLink);
        toast.success('Реферальная ссылка скопирована!');
      } catch (error) {
        toast.error('Ошибка при копировании');
      }
    }
  };

  const shareReferralLink = () => {
    if (referralsData?.referralLink && window.Telegram?.WebApp) {
      const message = `🎯 Привет! Присоединяйся к PayDaily Hunt и начни зарабатывать!\n\n💰 Выполняй простые задания и получай деньги\n🎁 Используй мой реферальный код: ${referralsData.referralCode}\n\n🔗 ${referralsData.referralLink}`;
      
      window.Telegram.WebApp.showPopup({
        title: 'Поделиться реферальной ссылкой',
        message: message,
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

  const shareToTelegram = () => {
    if (referralsData?.referralLink) {
      const message = `🎯 Привет! Присоединяйся к PayDaily Hunt и начни зарабатывать!\n\n💰 Выполняй простые задания и получай деньги\n🎁 Используй мой реферальный код: ${referralsData.referralCode}\n\n🔗 ${referralsData.referralLink}`;
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralsData.referralLink)}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="referrals-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка реферальной программы...</p>
        </div>
      </div>
    );
  }

  const referrals = referralsData;
  const stats = referrals?.stats || {};

  return (
    <div className="referrals-page">
      <div className="referrals-header">
        <h1>Реферальная программа</h1>
        <p>Приглашайте друзей и зарабатывайте вместе!</p>
      </div>

      {/* Основная статистика */}
      <div className="stats-overview">
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalReferrals || 0}</div>
            <div className="stat-label">Всего рефералов</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.currentEarnings || 0)}</div>
            <div className="stat-label">Заработано</div>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.potentialEarnings || 0)}</div>
            <div className="stat-label">Потенциальный доход</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeReferrals || 0}</div>
            <div className="stat-label">Активных рефералов</div>
          </div>
        </div>
      </div>

      {/* Реферальный код */}
      <div className="referral-code-section">
        <div className="section-header">
          <h2>Ваш реферальный код</h2>
          <div className="bonus-badge">
            {stats.bonusPercent || 10}% комиссия
          </div>
        </div>
        
        <div className="referral-code-container">
          <div className="code-display">
            <span className="code-label">Код:</span>
            <span className="code-value">{referrals?.referralCode}</span>
          </div>
          <button 
            className={`copy-btn ${copiedCode ? 'copied' : ''}`}
            onClick={copyReferralCode}
          >
            {copiedCode ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>

        <div className="referral-link-container">
          <div className="link-display">
            <span className="link-label">Ссылка:</span>
            <span className="link-value">{referrals?.referralLink}</span>
          </div>
          <button className="copy-btn" onClick={copyReferralLink}>
            Копировать
          </button>
        </div>

        <div className="share-buttons">
          <button className="share-btn primary" onClick={shareReferralLink}>
            📱 Поделиться в Telegram
          </button>
          <button className="share-btn secondary" onClick={shareToTelegram}>
            🔗 Открыть в Telegram
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="tabs-container">
        <div className="tabs">
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
            Рефералы ({referrals?.referrals?.length || 0})
          </button>
          <button 
            className={`tab ${activeTab === 'earnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            Заработок
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="info-cards">
                <div className="info-card">
                  <h3>Как это работает?</h3>
                  <ul>
                    <li>Поделитесь своим реферальным кодом с друзьями</li>
                    <li>Когда они регистрируются по вашему коду, вы получаете бонус</li>
                    <li>Вы зарабатываете {stats.bonusPercent || 10}% от их заработка</li>
                    <li>Чем больше рефералов, тем больше ваш доход!</li>
                  </ul>
                </div>
                
                <div className="info-card">
                  <h3>Бонусы за рефералов</h3>
                  <div className="bonus-levels">
                    <div className="bonus-level">
                      <span className="level">1 реферал</span>
                      <span className="bonus">+100 баллов</span>
                    </div>
                    <div className="bonus-level">
                      <span className="level">5 рефералов</span>
                      <span className="bonus">+500 баллов</span>
                    </div>
                    <div className="bonus-level">
                      <span className="level">10 рефералов</span>
                      <span className="bonus">+1000 баллов</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="motivation-section">
                <h3>Начните зарабатывать прямо сейчас!</h3>
                <p>Каждый реферал приносит вам дополнительный доход. Чем больше друзей вы пригласите, тем больше заработаете!</p>
                <button className="cta-btn" onClick={shareReferralLink}>
                  🚀 Пригласить друзей
                </button>
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="referrals-tab">
              {referrals?.referrals && referrals.referrals.length > 0 ? (
                <div className="referrals-list">
                  {referrals.referrals.map((referral) => (
                    <div key={referral.id} className="referral-item">
                      <div className="referral-avatar">
                        {referral.firstName ? referral.firstName[0] : referral.username[0]}
                      </div>
                      <div className="referral-details">
                        <div className="referral-name">
                          {referral.firstName && referral.lastName 
                            ? `${referral.firstName} ${referral.lastName}`
                            : referral.username
                          }
                        </div>
                        <div className="referral-info">
                          <span>Заработал: {formatCurrency(referral.totalEarned)}</span>
                          <span>Заданий: {referral.tasksCompleted}</span>
                          <span>VIP: {referral.vipLevel}</span>
                        </div>
                        <div className="referral-date">
                          Присоединился: {new Date(referral.joinedAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div className="referral-status">
                        <span className={`status-badge ${referral.isActive ? 'active' : 'inactive'}`}>
                          {referral.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-referrals">
                  <div className="empty-icon">👥</div>
                  <h3>У вас пока нет рефералов</h3>
                  <p>Поделитесь своей реферальной ссылкой с друзьями и начните зарабатывать вместе!</p>
                  <button className="cta-btn" onClick={shareReferralLink}>
                    Пригласить друзей
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="earnings-tab">
              <div className="earnings-overview">
                <div className="earnings-card">
                  <h3>Текущий заработок</h3>
                  <div className="earnings-amount">
                    {formatCurrency(stats.currentEarnings || 0)}
                  </div>
                  <p>Заработано с рефералов</p>
                </div>
                
                <div className="earnings-card">
                  <h3>Потенциальный доход</h3>
                  <div className="earnings-amount potential">
                    {formatCurrency(stats.potentialEarnings || 0)}
                  </div>
                  <p>Если все рефералы будут активны</p>
                </div>
              </div>

              <div className="earnings-breakdown">
                <h3>Детализация заработка</h3>
                <div className="breakdown-item">
                  <span>Комиссия с рефералов:</span>
                  <span>{stats.bonusPercent || 10}%</span>
                </div>
                <div className="breakdown-item">
                  <span>Общий заработок рефералов:</span>
                  <span>{formatCurrency(stats.totalEarned || 0)}</span>
                </div>
                <div className="breakdown-item">
                  <span>Ваш заработок:</span>
                  <span>{formatCurrency(stats.currentEarnings || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;