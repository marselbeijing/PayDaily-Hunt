const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TelegramBot = require('node-telegram-bot-api');

const router = express.Router();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Валидация данных Telegram WebApp
function validateTelegramWebAppData(initData) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(process.env.TELEGRAM_BOT_TOKEN)
        .digest();
    
    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    
    return calculatedHash === hash;
}

// Авторизация через Telegram WebApp
router.post('/telegram', async (req, res) => {
    try {
        const { initData, referralCode } = req.body;
        
        if (!initData) {
            return res.status(400).json({ error: 'Отсутствуют данные авторизации' });
        }
        
        // Валидация данных (в production должна быть включена)
        // if (!validateTelegramWebAppData(initData)) {
        //     return res.status(401).json({ error: 'Недействительные данные авторизации' });
        // }
        
        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get('user');
        
        if (!userParam) {
            return res.status(400).json({ error: 'Отсутствуют данные пользователя' });
        }
        
        const userData = JSON.parse(userParam);
        const telegramId = userData.id.toString();
        
        // Поиск или создание пользователя
        let user = await User.findOne({ telegramId });
        
        if (!user) {
            // Создание нового пользователя
            user = new User({
                telegramId,
                username: userData.username || '',
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                languageCode: userData.language_code || 'ru',
                ipAddress: req.ip,
                referralCode: User.prototype.generateReferralCode.call({ telegramId })
            });
            
            // Обработка реферального кода
            if (referralCode && referralCode !== user.referralCode) {
                const referrer = await User.findOne({ referralCode });
                if (referrer) {
                    user.referredBy = referrer._id;
                    // Бонус рефереру
                    referrer.points += 500;
                    referrer.referralEarnings += 500;
                    await referrer.save();
                }
            }
            
            await user.save();
            
            // Приветственный бонус
            user.points += 100;
            await user.save();
        } else {
            // Обновление последней активности
            user.lastActivity = new Date();
            await user.save();
        }
        
        // Генерация JWT токена
        const token = jwt.sign(
            { 
                userId: user._id,
                telegramId: user.telegramId 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '30d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                telegramId: user.telegramId,
                displayName: user.displayName,
                points: user.points,
                level: user.level,
                vipLevel: user.vipLevel,
                dailyStreak: user.dailyStreak,
                referralCode: user.referralCode,
                canCheckIn: user.canCheckIn(),
                wallet: user.wallet
            }
        });
        
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Проверка токена
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Токен не предоставлен' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                telegramId: user.telegramId,
                displayName: user.displayName,
                points: user.points,
                level: user.level,
                vipLevel: user.vipLevel,
                dailyStreak: user.dailyStreak,
                referralCode: user.referralCode,
                canCheckIn: user.canCheckIn(),
                wallet: user.wallet
            }
        });
        
    } catch (error) {
        console.error('Ошибка верификации токена:', error);
        res.status(401).json({ error: 'Недействительный токен' });
    }
});

// Ежедневный чек-ин
router.post('/checkin', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        if (!user.canCheckIn()) {
            return res.status(400).json({ error: 'Вы уже получили награду сегодня' });
        }
        
        // Расчет наград по дням
        const checkInRewards = {
            1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35, 7: 100
        };
        
        // Проверка на сброс streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const lastCheckIn = user.lastCheckIn ? new Date(user.lastCheckIn) : null;
        
        if (!lastCheckIn || lastCheckIn < yesterday) {
            user.dailyStreak = 1;
        } else {
            user.dailyStreak = Math.min(user.dailyStreak + 1, 7);
        }
        
        const reward = checkInRewards[user.dailyStreak] || 10;
        user.points += reward;
        user.lastCheckIn = new Date();
        
        await user.save();
        
        res.json({
            success: true,
            reward,
            newStreak: user.dailyStreak,
            newPoints: user.points,
            nextReward: checkInRewards[user.dailyStreak + 1] || 10
        });
        
    } catch (error) {
        console.error('Ошибка чек-ина:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Проверка подписки пользователя на канал
router.get('/check-telegram-sub', async (req, res) => {
  try {
    const { telegramId } = req.query;
    if (!telegramId) return res.status(400).json({ error: 'No telegramId' });
    const channel = '@PayDailyHunt';
    const member = await bot.getChatMember(channel, telegramId);
    const isMember = ['member', 'administrator', 'creator'].includes(member.status);
    res.json({ success: true, isMember });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check subscription', details: e.message });
  }
});

module.exports = router; 