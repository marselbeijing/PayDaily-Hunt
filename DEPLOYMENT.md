# 🚀 Руководство по развертыванию PayDaily Hunt

## 📋 Пошаговое развертывание

### 1. 🗄️ MongoDB Atlas (База данных)

1. Перейдите на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Создайте аккаунт или войдите
3. Создайте новый кластер (выберите FREE tier)
4. Настройте доступ:
   - **Database Access**: Создайте пользователя с правами `readWrite`
   - **Network Access**: Добавьте `0.0.0.0/0` (для Render)
5. Получите Connection String:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/paydaily_hunt
   ```

### 2. 🖥️ Render (Backend)

1. Перейдите на [Render](https://render.com)
2. Подключите GitHub аккаунт
3. Создайте новый **Web Service**:
   - **Repository**: Выберите `paydaily-hunt`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. Настройте переменные окружения:
   ```env
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/paydaily_hunt
   JWT_SECRET=your-super-secret-jwt-key-generate-random
   TELEGRAM_BOT_TOKEN=7572098457:AAFPD0pRhovfJsSzFTnaW1SXpgofR6eZSIk
   FRONTEND_URL=https://paydaily-hunt.vercel.app
   ```

5. Нажмите **Create Web Service**
6. После деплоя получите URL: `https://paydaily-hunt-backend.onrender.com`

### 3. 🌐 Vercel (Frontend)

1. Перейдите на [Vercel](https://vercel.com)
2. Подключите GitHub аккаунт
3. Импортируйте проект `paydaily-hunt`
4. Настройте проект:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. Настройте переменные окружения:
   ```env
   REACT_APP_API_URL=https://paydaily-hunt-backend.onrender.com/api
   REACT_APP_ENV=production
   ```

6. Нажмите **Deploy**
7. После деплоя получите URL: `https://paydaily-hunt.vercel.app`

### 4. 🤖 Telegram Bot (Обновление)

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Найдите своего бота или создайте новый:
   ```
   /newbot
   PayDaily Hunt Bot
   PayDailyHunt_bot
   ```

3. Обновите WebApp URL:
   ```
   /setmenubutton
   @PayDailyHunt_bot
   ```
   - **Button Text**: `💰 Открыть PayDaily Hunt`
   - **Web App URL**: `https://paydaily-hunt.vercel.app`

4. Настройте команды:
   ```
   /setcommands
   @PayDailyHunt_bot
   start - 🚀 Запустить приложение
   help - ❓ Помощь и FAQ
   stats - 📊 Статистика проекта
   ```

### 5. 🔄 Автодеплой (GitHub Actions)

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy PayDaily Hunt

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}
```

## 🔐 Переменные окружения

### Backend (Render)
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=random-secret-key
TELEGRAM_BOT_TOKEN=bot-token
FRONTEND_URL=https://paydaily-hunt.vercel.app
```

### Frontend (Vercel)
```env
REACT_APP_API_URL=https://paydaily-hunt-backend.onrender.com/api
REACT_APP_ENV=production
```

### Telegram Bot
```env
TELEGRAM_BOT_TOKEN=7572098457:AAFPD0pRhovfJsSzFTnaW1SXpgofR6eZSIk
WEBAPP_URL=https://paydaily-hunt.vercel.app
```

## 🧪 Тестирование продакшн

### 1. Backend API
```bash
curl https://paydaily-hunt-backend.onrender.com/api/health
```

### 2. Frontend
Откройте: `https://paydaily-hunt.vercel.app`

### 3. Telegram Bot
1. Найдите `@PayDailyHunt_bot`
2. Напишите `/start`
3. Нажмите "💰 Открыть PayDaily Hunt"

## 🔧 Troubleshooting

### Backend не запускается
- Проверьте логи в Render Dashboard
- Убедитесь что MongoDB URI корректный
- Проверьте все переменные окружения

### Frontend не загружается
- Проверьте Build Logs в Vercel
- Убедитесь что API URL правильный
- Проверьте CORS настройки в backend

### Telegram Bot не работает
- Проверьте токен бота
- Убедитесь что WebApp URL правильный
- Проверьте что приложение доступно публично

## 📊 Мониторинг

### Render
- Логи: Render Dashboard → Service → Logs
- Метрики: CPU, Memory, Response Time
- Health Check: `/api/health`

### Vercel
- Analytics: Vercel Dashboard → Analytics
- Function Logs: Dashboard → Functions
- Performance: Core Web Vitals

### MongoDB Atlas
- Metrics: Atlas Dashboard → Metrics
- Performance Advisor
- Real-time Performance Panel

## 🔄 Обновления

### Автоматические (через Git)
```bash
git add .
git commit -m "Update: описание изменений"
git push origin main
```

### Ручные (через Dashboard)
- **Render**: Manual Deploy
- **Vercel**: Redeploy

## 💡 Советы по оптимизации

### Backend
- Используйте connection pooling для MongoDB
- Настройте rate limiting
- Добавьте логирование ошибок
- Используйте compression middleware

### Frontend
- Минимизируйте bundle size
- Используйте lazy loading
- Оптимизируйте изображения
- Настройте Service Worker для PWA

### Database
- Создайте индексы для часто используемых запросов
- Используйте aggregation pipeline
- Настройте TTL для временных данных
- Мониторьте производительность запросов

---

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте логи сервисов
2. Убедитесь что все переменные окружения настроены
3. Проверьте статус сервисов (Render, Vercel, MongoDB)
4. Создайте Issue в GitHub репозитории

**Готово! Ваше приложение теперь работает в продакшн!** 🎉 