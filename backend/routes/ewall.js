const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TaskCompletion = require('../models/TaskCompletion');
const Task = require('../models/Task');

const router = express.Router();

// Middleware для проверки авторизации
const auth = async (req, res, next) => {
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
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
};

// Получить URL офферволла Ewall для пользователя
router.get('/offerwall', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // Параметры для Ewall
        const ewallParams = {
            pub_id: process.env.EWALL_PUBLISHER_ID,
            user_id: user._id.toString(),
            username: user.firstName || user.username,
            // Дополнительные параметры для персонализации
            level: user.level,
            vip: user.vipLevel,
            // Подпись для безопасности (если требуется)
            signature: generateEwallSignature(user._id.toString())
        };
        
        // Формируем URL офферволла
        const ewallUrl = `${process.env.EWALL_OFFERWALL_URL}?` + 
            Object.entries(ewallParams)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');
        
        res.json({
            success: true,
            offerwallUrl: ewallUrl,
            userInfo: {
                id: user._id,
                level: user.level,
                vipLevel: user.vipLevel
            }
        });
        
    } catch (error) {
        console.error('Ошибка генерации Ewall URL:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Webhook для получения уведомлений о завершении заданий от Ewall
router.post('/callback', async (req, res) => {
    try {
        const { user_id, offer_id, amount, currency, status, signature } = req.body;
        
        // Проверка подписи (если используется)
        if (!verifyEwallSignature(req.body, signature)) {
            return res.status(400).json({ error: 'Неверная подпись' });
        }
        
        // Находим пользователя
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Создаем или находим задание Ewall
        let task = await Task.findOne({ 
            type: 'ewall',
            externalId: offer_id 
        });
        
        if (!task) {
            // Создаем новое задание для этого оффера
            task = new Task({
                title: `Ewall Offer #${offer_id}`,
                description: 'Задание с платформы Ewall',
                type: 'ewall',
                category: 'external',
                reward: parseFloat(amount),
                externalId: offer_id,
                externalPlatform: 'ewall',
                isActive: true,
                requirements: {
                    minLevel: 1,
                    vipLevelRequired: 'none'
                }
            });
            await task.save();
        }
        
        // Проверяем, не было ли уже завершения этого задания
        const existingCompletion = await TaskCompletion.findOne({
            user: user._id,
            task: task._id,
            externalOfferId: offer_id
        });
        
        if (existingCompletion && existingCompletion.status === 'approved') {
            return res.json({ success: true, message: 'Задание уже завершено' });
        }
        
        // Создаем новое завершение или обновляем существующее
        const completion = existingCompletion || new TaskCompletion({
            user: user._id,
            task: task._id,
            externalOfferId: offer_id,
            externalPlatform: 'ewall'
        });
        
        completion.status = status === 'completed' ? 'approved' : 'pending';
        completion.rewardAmount = parseFloat(amount);
        completion.completedAt = new Date();
        completion.metadata = {
            ...completion.metadata,
            ewallData: {
                offer_id,
                currency,
                originalAmount: amount
            }
        };
        
        await completion.save();
        
        // Если задание завершено успешно, начисляем награду
        if (completion.status === 'approved') {
            user.balance += completion.rewardAmount;
            user.totalEarned += completion.rewardAmount;
            user.tasksCompleted += 1;
            
            // Обновляем уровень пользователя
            user.updateLevel();
            await user.save();
            
            console.log(`Пользователь ${user._id} получил ${completion.rewardAmount} USDT за Ewall задание ${offer_id}`);
        }
        
        res.json({ 
            success: true, 
            message: 'Задание обработано',
            reward: completion.rewardAmount,
            status: completion.status
        });
        
    } catch (error) {
        console.error('Ошибка обработки Ewall callback:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить статистику заданий Ewall для пользователя
router.get('/stats', auth, async (req, res) => {
    try {
        const user = req.user;
        
        const ewallCompletions = await TaskCompletion.find({
            user: user._id,
            externalPlatform: 'ewall'
        }).populate('task');
        
        const stats = {
            totalCompleted: ewallCompletions.filter(c => c.status === 'approved').length,
            totalEarned: ewallCompletions
                .filter(c => c.status === 'approved')
                .reduce((sum, c) => sum + c.rewardAmount, 0),
            pending: ewallCompletions.filter(c => c.status === 'pending').length,
            recentCompletions: ewallCompletions
                .sort((a, b) => b.completedAt - a.completedAt)
                .slice(0, 10)
                .map(c => ({
                    id: c._id,
                    taskTitle: c.task?.title || `Offer #${c.externalOfferId}`,
                    reward: c.rewardAmount,
                    status: c.status,
                    completedAt: c.completedAt
                }))
        };
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('Ошибка получения статистики Ewall:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Функция для генерации подписи Ewall (если требуется)
function generateEwallSignature(userId) {
    if (!process.env.EWALL_SECRET_KEY) return '';
    
    const crypto = require('crypto');
    const data = `${userId}${process.env.EWALL_PUBLISHER_ID}${process.env.EWALL_SECRET_KEY}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

// Функция для проверки подписи от Ewall
function verifyEwallSignature(data, signature) {
    if (!process.env.EWALL_SECRET_KEY || !signature) return true; // Если подпись не используется
    
    const crypto = require('crypto');
    const expectedSignature = crypto
        .createHash('md5')
        .update(`${data.user_id}${data.offer_id}${data.amount}${process.env.EWALL_SECRET_KEY}`)
        .digest('hex');
    
    return expectedSignature === signature;
}

module.exports = router; 