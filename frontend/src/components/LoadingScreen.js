import React from 'react';

const LoadingScreen = ({ message = 'Загрузка...' }) => {
  return (
    <div className="app">
      <div 
        className="container flex flex-column items-center justify-center" 
        style={{ 
          height: '100vh', 
          textAlign: 'center',
          padding: '40px 20px'
        }}
      >
        <div className="mb-4">
          <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</h1>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            PayDaily Hunt
          </h2>
          <p style={{ 
            color: 'var(--tg-theme-hint-color)', 
            fontSize: '16px',
            marginBottom: '32px'
          }}>
            Зарабатывайте деньги выполняя простые задания
          </p>
        </div>
        
        <div className="mb-3">
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
        
        <p style={{ 
          color: 'var(--tg-theme-hint-color)', 
          fontSize: '14px' 
        }}>
          {message}
        </p>
        
        <div className="mt-4" style={{ opacity: 0.6 }}>
          <div className="flex items-center justify-center gap-2">
            <div 
              className="rounded-full" 
              style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: 'var(--tg-theme-button-color)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            ></div>
            <div 
              className="rounded-full" 
              style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: 'var(--tg-theme-button-color)',
                animation: 'pulse 1.5s ease-in-out 0.2s infinite'
              }}
            ></div>
            <div 
              className="rounded-full" 
              style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: 'var(--tg-theme-button-color)',
                animation: 'pulse 1.5s ease-in-out 0.4s infinite'
              }}
            ></div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes pulse {
            0%, 80%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            40% {
              opacity: 1;
              transform: scale(1.2);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoadingScreen; 