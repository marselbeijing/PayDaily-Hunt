const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001',
        'https://d178-82-215-122-254.ngrok-free.app',
        'http://192.168.1.102:3001'
    ],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с одного IP
    message: 'Слишком много запросов, попробуйте позже'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Тестовые данные
const testUsers = {};
let testTasks = [
  {
    id: 1,
    title: 'Просмотр видео на YouTube',
    description: 'Посмотрите видео полностью и лайкните',
    reward: 50,
    category: 'entertainment',
    difficulty: 'easy',
    timeEstimate: 5,
    isActive: true
  },
  {
    id: 2,
    title: 'Подписка на Telegram канал',
    description: 'Подпишитесь на наш канал в Telegram',
    reward: 100,
    category: 'social',
    difficulty: 'easy',
    timeEstimate: 2,
    isActive: true
  }
];

// Тестовые маршруты
app.get('/api/auth/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend работает!',
        timestamp: new Date().toISOString(),
        version: '1.0.0-test'
    });
});

app.post('/api/auth/telegram', (req, res) => {
    try {
        const { initData, referralCode } = req.body;
        
        // Простая имитация парсинга Telegram данных
        const userId = Date.now(); // Генерируем ID
        const user = {
            id: userId,
            telegramId: userId,
            username: 'test_user',
            firstName: 'Test',
            lastName: 'User',
            balance: 1000,
            vipLevel: 'bronze',
            dailyStreak: 1,
            totalTasks: 0,
            referralCode: `ref_${userId}`,
            isActive: true,
            createdAt: new Date()
        };
        
        testUsers[userId] = user;
        
        // Генерируем тестовый токен
        const token = `test_token_${userId}`;
        
        res.json({
            success: true,
            user,
            token,
            message: 'Успешная авторизация (тест)'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Ошибка авторизации: ' + error.message
        });
    }
});

app.post('/api/auth/checkin', (req, res) => {
    const reward = Math.floor(Math.random() * 91) + 10; // 10-100 points
    const streak = Math.floor(Math.random() * 7) + 1;
    
    res.json({
        success: true,
        reward,
        streak,
        nextReward: reward + 10,
        message: 'Ежедневный чекин выполнен!'
    });
});

app.get('/api/tasks', (req, res) => {
    res.json({
        success: true,
        tasks: testTasks,
        total: testTasks.length
    });
});

app.post('/api/tasks/:id/start', (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = testTasks.find(t => t.id === taskId);
    
    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Задача не найдена'
        });
    }
    
    res.json({
        success: true,
        task,
        message: 'Задача начата'
    });
});

app.post('/api/tasks/:id/complete', (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = testTasks.find(t => t.id === taskId);
    
    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Задача не найдена'
        });
    }
    
    res.json({
        success: true,
        reward: task.reward,
        message: 'Задача выполнена!',
        newBalance: 1000 + task.reward
    });
});

// Базовый маршрут
app.get('/', (req, res) => {
    res.json({ 
        message: 'PayDaily Hunt TEST API работает!',
        version: '1.0.0-test',
        timestamp: new Date().toISOString(),
        note: 'Это тестовая версия без MongoDB'
    });
});

// Обработка 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Что-то пошло не так'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Тестовый сервер запущен на порту ${PORT}`);
    console.log(`📱 API доступен по адресу: http://localhost:${PORT}`);
    console.log('⚠️  Это тестовая версия без MongoDB');
}); 