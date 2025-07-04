const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: function(origin, callback) {
        const allowed = [
            process.env.FRONTEND_URL || 'https://pay-daily-hunt.vercel.app',
            'https://pay-daily-hunt.vercel.app',
            'https://www.pay-daily-hunt.vercel.app',
            'https://www.paydailyhunt.site',
            'http://localhost:3000', // For local development
            'http://127.0.0.1:3000'  // Alternative localhost
        ];
        if (!origin || allowed.includes(origin)) {
            console.log('CORS allow:', origin);
            callback(null, true);
        } else {
            console.log('CORS block:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
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

// MongoDB подключение
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/paydaily-hunt', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
    console.error('Проверьте, что MongoDB запущен локально или укажите правильный MONGODB_URI в .env!');
});
db.once('open', () => {
    console.log('✅ Подключение к MongoDB установлено');
});

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const partnerRoutes = require('./routes/partners');
const paymentRoutes = require('./routes/payments');
const ewallRoutes = require('./routes/ewall');
const unuRoutes = require('./routes/unu');

// Использование маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ewall', ewallRoutes);
app.use('/api/unu', unuRoutes);

// Базовый маршрут
app.get('/', (req, res) => {
    res.json({ 
        message: 'PayDaily Hunt API работает!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint для Render
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 API доступен по адресу: http://localhost:${PORT}`);
}); 