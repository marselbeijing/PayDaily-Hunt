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
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('✅ Подключение к MongoDB установлено');
});

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const partnerRoutes = require('./routes/partners');
const paymentRoutes = require('./routes/payments');
const adgemRoutes = require('./routes/adgem');
const ewallRoutes = require('./routes/ewall');
const unuRoutes = require('./routes/unu');

// Использование маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/adgem', adgemRoutes);
app.use('/api/ewall', ewallRoutes);
app.use('/api/unu', unuRoutes);

// === AdGem Postback Handler ===
app.get('/api/adgem/postback', async (req, res) => {
    const { user_id, amount, offer_id, transaction_id, key } = req.query;
    const POSTBACK_KEY = '9d3ban3jhjbcegg93hjfl6k8'; // из AdGem

    // Валидация ключа
    if (key !== POSTBACK_KEY) {
        console.log('❌ Неверный postback key:', key);
        return res.status(403).json({ error: 'Invalid postback key' });
    }

    // Логируем все входящие запросы (для теста)
    console.log('AdGem postback:', req.query);

    if (!user_id || !amount || !offer_id || !transaction_id) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const User = require('./models/User');
        const Task = require('./models/Task');
        const TaskCompletion = require('./models/TaskCompletion');
        // Находим пользователя
        const user = await User.findOne({ telegramId: user_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Начисляем награду на user.wallet.balance
        user.wallet.balance = (user.wallet.balance || 0) + Number(amount);
        await user.save();
        // Пробуем найти задание по offer_id
        const task = await Task.findOne({ 'partner.trackingId': offer_id });
        if (task) {
            // Создаём запись о выполнении задания, если её ещё нет
            const existing = await TaskCompletion.findOne({ user: user._id, task: task._id });
            if (!existing) {
                await TaskCompletion.create({
                    user: user._id,
                    task: task._id,
                    status: 'approved',
                    rewardAmount: Number(amount),
                    partnerTracking: {
                        conversionId: transaction_id,
                        subId: offer_id
                    }
                });
            }
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('Ошибка при обработке postback:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

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