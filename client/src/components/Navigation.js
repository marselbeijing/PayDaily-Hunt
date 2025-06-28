import React from 'react';

const navItems = [
  { label: 'Главная', page: 'home', icon: '🏠' },
  { label: 'Задания', page: 'tasks', icon: '📝' },
  { label: 'Профиль', page: 'profile', icon: '👤' },
  { label: 'Кошелёк', page: 'wallet', icon: '💳' },
  { label: 'Лидерборд', page: 'leaderboard', icon: '🏆' },
];

export default function Navigation({ currentPage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-tg-border flex justify-around py-2 z-50">
      {navItems.map(item => (
        <button
          key={item.page}
          className={`flex flex-col items-center text-xs px-2 ${currentPage === item.page ? 'text-blue-500 font-bold' : 'text-tg-hint'}`}
          onClick={() => onNavigate(item.page)}
        >
          <span className="text-2xl mb-1">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
} 