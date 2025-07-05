import React from 'react';

const navItems = [
  { label: 'Home', page: 'home', icon: '/home.svg' },
  { label: 'Tasks', page: 'tasks', icon: '/tasks.svg' },
  { label: 'Profile', page: 'profile', icon: '/profile.svg' },
  { label: 'Wallet', page: 'wallet', icon: '/wallet.svg' },
  { label: 'Leaderboard', page: 'leaderboard', icon: '/leaderboard.svg' },
];

export default function Navigation({ currentPage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-tg-border flex justify-between py-2 z-50">
      {navItems.map(item => (
        <button
          key={item.page}
          className={`flex flex-col items-center justify-center flex-1 text-[10px] font-medium ${currentPage === item.page ? 'text-blue-500 font-bold' : 'text-tg-hint'}`}
          style={{ minWidth: 0 }}
          onClick={() => onNavigate(item.page)}
        >
          <img 
            src={item.icon} 
            alt={item.label}
            className={`w-6 h-6 mb-1 ${currentPage === item.page ? 'opacity-100' : 'opacity-60'}`}
            style={{
              filter: currentPage === item.page 
                ? 'brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(1000%) hue-rotate(200deg) brightness(97%) contrast(101%)' 
                : 'brightness(0) saturate(100%) invert(60%)'
            }}
          />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
