import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

const SLIDE_DURATION = 3000;
const SLIDE_IMG_WIDTH = 1449;
const SLIDE_IMG_HEIGHT = 768;
const slides = [
  {
    img: '/get-free-crypto.jpg', // Путь к вашей картинке, поместите её в public/
    alt: 'Get Free Crypto',
    label: 'Get Free Crypto',
    onClick: () => window.open('https://freebitco.in/?r=55381223', '_blank'),
  },
  {
    img: 'https://placehold.co/300x120/00BFFF/fff?text=Step+Boom',
    alt: 'Step Boom',
    label: 'Step Boom',
    onClick: (onNavigate) => onNavigate('tasks'),
  },
  {
    img: 'https://placehold.co/300x120/32CD32/fff?text=Best+tasks',
    alt: 'Best tasks',
    label: 'Best tasks',
    onClick: (onNavigate) => onNavigate('tasks'),
  },
];

export default function Home({ onNavigate }) {
  const { user, loading: authLoading, token } = useAuth();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (authLoading || !token) return;
    api.tasks.history()
      .then(data => {
        setHistory(data.history || []);
        setHistoryLoading(false);
      })
      .catch(() => {
        setError('Error loading reward history');
        setHistoryLoading(false);
      });
  }, [authLoading, token]);

  return (
    <div className="p-4 pt-2 pb-20">
      <h1 className="text-2xl font-bold mb-2 text-center">Hello, {user?.firstName || 'Guest'}!</h1>
      <div className="mb-6">
        <Swiper
          spaceBetween={16}
          slidesPerView={1.1}
          centeredSlides={true}
          className="rounded-2xl mx-auto"
          style={{ paddingLeft: '8%', paddingRight: '8%' }}
          autoplay={{ delay: SLIDE_DURATION, disableOnInteraction: false }}
          loop={true}
          modules={[Autoplay]}
          onSlideChange={swiper => setActiveIndex(swiper.realIndex)}
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx}>
              <div
                className="block bg-tg-card rounded-2xl shadow card-hover overflow-hidden h-36 flex flex-col items-center justify-center relative cursor-pointer"
                onClick={() => slide.onClick(onNavigate)}
              >
                <div className="w-full aspect-[1.887] bg-black flex items-center justify-center rounded-2xl overflow-hidden relative">
                  <img 
                    src={slide.img} 
                    alt={slide.alt} 
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 30%' }}
                  />
                  {/* Индикатор автоперехода */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300">
                    <div
                      className="bg-blue-500 h-1 transition-all"
                      style={{ width: activeIndex === idx ? '100%' : '0%', transition: `width ${SLIDE_DURATION}ms linear` }}
                    />
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm mb-4 text-center">
        Complete daily tasks and earn real cryptocurrency rewards!
      </div>
      <div className="mb-2 font-bold text-center">Reward History</div>
      {historyLoading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-tg-hint text-sm">No rewards in recent days.</div>
      ) : (
        <ul className="space-y-2">
          {history.slice(0, 5).map((item, idx) => (
            <li key={idx} className="bg-tg-card p-2 rounded flex justify-between items-center">
              <span className="text-sm">{item.taskTitle || 'Task'}</span>
              <span className="font-mono text-green-500">+{item.reward} USDT</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 