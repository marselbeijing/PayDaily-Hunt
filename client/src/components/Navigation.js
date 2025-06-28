import React from 'react';

const navItems = [
  { label: 'Home', page: 'home', icon: '🏠' },
  { label: 'Tasks', page: 'tasks', icon: '📝' },
  { label: 'Profile', page: 'profile', icon: '👤' },
  { label: 'Wallet', page: 'wallet', icon: '💳' },
  { label: 'Leaderboard', page: 'leaderboard', icon: '🏆' },
];

export default function Navigation({ currentPage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-tg-border flex justify-between py-2 z-50">
      {navItems.map(item => (
        <button
          key={item.page}
          className={`flex flex-col items-center justify-center flex-1 text-xs ${currentPage === item.page ? 'text-blue-500 font-bold' : 'text-tg-hint'}`}
          style={{ minWidth: 0 }}
          onClick={() => onNavigate(item.page)}
        >
          <span className="text-2xl mb-1">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
} 