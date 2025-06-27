import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-tg-bg">
      <div className="text-center">
        {/* Логотип */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">PayDaily Hunt</h1>
          <p className="text-sm text-muted">Зарабатывайте криптовалюту</p>
        </div>

        {/* Анимированный спиннер */}
        <div className="relative">
          <div className="loading-spinner mx-auto mb-6"></div>
          <div className="animate-pulse">
            <p className="text-sm text-muted">Загрузка приложения...</p>
          </div>
        </div>

        {/* Прогресс бар (анимированный) */}
        <div className="w-64 mx-auto mt-8">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Дополнительная информация */}
      <div className="mt-12 text-center">
        <p className="text-xs text-muted">
          Инициализация Telegram WebApp...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen; 