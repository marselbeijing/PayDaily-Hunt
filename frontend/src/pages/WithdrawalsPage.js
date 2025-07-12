import React from 'react';
import { useQuery } from 'react-query';
import { getWithdrawals } from '../services/api';
import './WithdrawalsPage.css';

const WithdrawalsPage = () => {
  const { data: withdrawals, isLoading } = useQuery(
    'withdrawals',
    getWithdrawals,
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  if (isLoading) {
    return (
      <div className="withdrawals-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка выводов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="withdrawals-page">
      <div className="withdrawals-header">
        <h1>Выводы средств</h1>
        <p>История ваших выводов</p>
      </div>
      
      <div className="withdrawals-content">
        {withdrawals && withdrawals.length > 0 ? (
          <div className="withdrawals-list">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal._id} className="withdrawal-card">
                <div className="withdrawal-header">
                  <div className="withdrawal-amount">{withdrawal.amount} USDT</div>
                  <div className={`withdrawal-status ${withdrawal.status}`}>
                    {withdrawal.status}
                  </div>
                </div>
                <div className="withdrawal-details">
                  <div className="detail-item">
                    <span>Кошелек:</span>
                    <span>{withdrawal.walletAddress}</span>
                  </div>
                  <div className="detail-item">
                    <span>Дата:</span>
                    <span>{new Date(withdrawal.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-withdrawals">
            <div className="empty-icon">💰</div>
            <h3>Выводов пока нет</h3>
            <p>Когда вы выведете средства, они появятся здесь</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalsPage;