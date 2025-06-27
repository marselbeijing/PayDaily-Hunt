import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-tg-bg">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-6"></div>
      <h2 className="text-xl font-semibold mb-2">Загрузка...</h2>
      <p className="text-tg-hint">Пожалуйста, подождите</p>
    </div>
  );
} 