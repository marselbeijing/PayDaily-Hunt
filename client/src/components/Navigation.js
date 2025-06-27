import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Главная', path: '/', icon: '🏠' },
  { label: 'Задания', path: '/tasks', icon: '📝' },
  { label: 'Профиль', path: '/profile', icon: '👤' },
  { label: 'Кошелёк', path: '/wallet', icon: '💳' },
  { label: 'Лидерборд', path: '/leaderboard', icon: '🏆' },
];

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-tg-border flex justify-around py-2 z-50">
      {navItems.map(item => (
        <button
          key={item.path}
          className={`flex flex-col items-center text-xs px-2 ${location.pathname === item.path ? 'text-blue-500 font-bold' : 'text-tg-hint'}`}
          onClick={() => navigate(item.path)}
        >
          <span className="text-2xl mb-1">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
} 