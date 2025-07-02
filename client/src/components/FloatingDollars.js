import React, { useEffect, useState } from 'react';

const FloatingDollars = () => {
  const [dollars, setDollars] = useState([]);

  useEffect(() => {
    // Создаем только 6 долларов для ненавязчивости
    const newDollars = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // позиция в процентах
      y: Math.random() * 100,
      size: Math.random() * 6 + 8, // размер от 8 до 14px
      opacity: Math.random() * 0.02 + 0.01, // очень низкая прозрачность 0.01-0.03
      duration: Math.random() * 25 + 35, // медленная анимация 35-60 секунд
      delay: Math.random() * 15, // случайная задержка
      direction: Math.random() > 0.5 ? 1 : -1,
    }));
    setDollars(newDollars);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {dollars.map((dollar) => (
        <div
          key={dollar.id}
          className="absolute text-green-400 select-none font-bold"
          style={{
            left: `${dollar.x}%`,
            top: `${dollar.y}%`,
            fontSize: `${dollar.size}px`,
            opacity: dollar.opacity,
            transform: 'translateZ(0)', // для лучшей производительности
            animation: `floatDollar${dollar.id} ${dollar.duration}s ease-in-out infinite alternate`,
            animationDelay: `${dollar.delay}s`,
          }}
        >
          $
        </div>
      ))}
    </div>
  );
};

export default FloatingDollars;
