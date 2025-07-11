# 💰 PayDaily Hunt - Telegram Mini App

> Зарабатывайте криптовалюту выполняя простые задания в Telegram

## 🚀 Особенности

- **Telegram WebApp интеграция** - Полная интеграция с Telegram API
- **VIP система** - 5 уровней с мультипликаторами наград
- **Реферальная программа** - 10% комиссия с рефералов
- **Крипто выплаты** - Вывод в USDT на BSC/Polygon
- **Анти-фрод система** - Защита от накрутки

## 🛠 Технологии

### Frontend
- React 18
- Tailwind CSS
- Telegram WebApp SDK
- Axios

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT авторизация
- Rate limiting

### Продакшн
- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas
- **Code:** GitHub

## 📦 Структура проекта

```
PayDaily Hunt/
├── client/          # React frontend
├── backend/         # Node.js backend
├── models/          # MongoDB модели
├── routes/          # API маршруты
├── middleware/      # Middleware
└── telegram-bot.js  # Telegram бот
```

## 🔧 Локальная разработка

### Установка зависимостей
```bash
# Backend
cd backend && npm install

# Frontend
cd client && npm install
```

### Запуск
```bash
# Backend (тестовый сервер)
cd backend && node test-server.js

# Frontend
cd client && npm start

# Telegram бот
node telegram-bot.js
```

## 🌐 Продакшн развертывание

### 1. MongoDB Atlas
- Создайте кластер на [MongoDB Atlas](https://www.mongodb.com/atlas)
- Получите connection string

### 2. Render (Backend)
- Подключите GitHub репозиторий
- Установите переменные окружения
- Автодеплой при push в main

### 3. Vercel (Frontend)
- Подключите GitHub репозиторий
- Настройте build команды
- Автодеплой при push в main

## 🔐 Переменные окружения

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
NODE_ENV=production
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_ENV=production
```

## 🤖 Telegram бот

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен
3. Настройте WebApp URL
4. Добавьте команды и меню

## 💡 API Endpoints

### Авторизация
- `POST /api/auth/telegram` - Telegram авторизация
- `POST /api/auth/checkin` - Ежедневный чекин

### Задания
- `GET /api/tasks` - Список заданий
- `POST /api/tasks/:id/start` - Начать задание
- `POST /api/tasks/:id/complete` - Завершить задание

### Пользователи
- `GET /api/users/profile` - Профиль пользователя
- `GET /api/users/leaderboard` - Таблица лидеров

### Выплаты
- `POST /api/payments/withdraw` - Заявка на вывод
- `GET /api/payments/history` - История выплат

## 📱 Мобильная оптимизация

- Responsive дизайн
- Touch-friendly интерфейс
- Haptic feedback
- Telegram тема

## 🔒 Безопасность

- JWT токены
- Rate limiting
- CORS настройки
- Валидация данных
- Анти-фрод система

## 📊 Мониторинг

- Логирование ошибок
- Метрики производительности
- Аналитика пользователей

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature ветку
3. Commit изменения
4. Push в ветку
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл

## 📞 Поддержка

- Telegram: [@paydaily_support](https://t.me/paydaily_support)
- Email: support@paydaily.com
- Документация: [docs.paydaily.com](https://docs.paydaily.com)

---

⭐ **Поставьте звезду если проект был полезен!** 