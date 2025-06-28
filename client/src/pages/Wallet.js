import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function Wallet({ onNavigate }) {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    api.payments.history()
      .then(data => {
        setWithdrawals(data.withdrawals || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Error loading withdrawal history');
        setLoading(false);
      });
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount || !walletAddress) {
      alert('Please fill all fields');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > (user?.balance || 0)) {
      alert('Invalid amount');
      return;
    }

    setWithdrawing(true);
    try {
      await api.payments.withdraw({ amount, walletAddress });
      alert('Withdrawal request created');
      setWithdrawAmount('');
      setWalletAddress('');
      const data = await api.payments.history();
      setWithdrawals(data.withdrawals || []);
    } catch (error) {
      alert('Error creating withdrawal request');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-4">Wallet</h1>
      
      <div className="bg-tg-card p-4 rounded-xl shadow mb-6">
        <div className="text-lg font-bold mb-2">Balance</div>
        <div className="text-3xl font-mono font-bold">{user?.balance ?? 0} <span className="text-base font-normal">USDT</span></div>
      </div>

      <div className="bg-tg-card p-4 rounded-xl shadow mb-6">
        <div className="text-lg font-bold mb-4">Withdraw Funds</div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Amount (USDT)</label>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter amount"
            min="1"
            max={user?.balance || 0}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Wallet Address</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter USDT wallet address"
          />
        </div>
        <button
          className="btn btn-primary w-full"
          onClick={handleWithdraw}
          disabled={withdrawing}
        >
          {withdrawing ? 'Processing...' : 'Create Request'}
        </button>
      </div>

      <div className="bg-tg-card p-4 rounded-xl shadow">
        <div className="text-lg font-bold mb-4">Withdrawal History</div>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : withdrawals.length === 0 ? (
          <div className="text-tg-hint text-sm">No withdrawal requests</div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((withdrawal, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-mono">{withdrawal.amount} USDT</div>
                  <div className="text-xs text-gray-500">{new Date(withdrawal.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`text-sm ${withdrawal.status === 'completed' ? 'text-green-500' : withdrawal.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>
                  {withdrawal.status === 'completed' ? 'Completed' : withdrawal.status === 'pending' ? 'Pending' : 'Rejected'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
