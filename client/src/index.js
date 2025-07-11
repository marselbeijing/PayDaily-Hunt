import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
          borderRadius: '12px',
          fontSize: '14px',
          padding: '12px 16px'
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: 'white'
          }
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: 'white'
          }
        }
      }}
    />
  </React.StrictMode>
);

// Устанавливаем тёмную тему по умолчанию для локального запуска
if (typeof document !== 'undefined') {
  document.body.setAttribute('data-theme', 'dark');
} 