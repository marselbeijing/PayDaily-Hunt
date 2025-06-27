import React from 'react';
import { NavLink } from 'react-router-dom';
import { hapticFeedback } from '../services/api';

const Navigation = () => {
  const handleNavClick = () => {
    hapticFeedback('light');
  };

  const navItems = [
    {
      path: '/',
      icon: '🏠',
      label: 'Главная',
      exact: true
    },
    {
      path: '/tasks',
      icon: '📋',
      label: 'Задания'
    },
    {
      path: '/leaderboard',
      icon: '🏆',
      label: 'Рейтинг'
    },
    {
      path: '/profile',
      icon: '👤',
      label: 'Профиль'
    }
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => 
            `nav-item haptic ${isActive ? 'active' : ''}`
          }
          onClick={handleNavClick}
          end={item.exact}
        >
          <div className="nav-icon">{item.icon}</div>
          <div className="nav-label">{item.label}</div>
        </NavLink>
      ))}
    </nav>
  );
};

export default Navigation; 