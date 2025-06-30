const express = require('express');
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');

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

// Получить историю выполненных заданий
router.get('/user/history', auth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const user = req.user;
        
        const filter = { user: user._id };
        if (status) filter.status = status;
        
        const skip = (page - 1) * limit;
        
        const completions = await TaskCompletion.find(filter)
            .populate('task', 'title type reward imageUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        
        res.json({
            success: true,
            completions: completions.map(c => ({
                id: c._id,
                task: c.task,
                status: c.status,
                rewardAmount: c.rewardAmount,
                startedAt: c.startedAt,
                completedAt: c.completedAt,
                timeSpent: c.metadata?.timeSpent
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                hasMore: completions.length === Number(limit)
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить детали задания
router.get('/:taskId', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const user = req.user;
        
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }
        
        // Проверить доступность задания
        if (!task.canUserComplete(user)) {
            return res.status(403).json({ error: 'Задание недоступно для вашего уровня' });
        }
        
        // Проверить, выполнял ли пользователь это задание
        const completion = await TaskCompletion.findOne({
            user: user._id,
            task: taskId
        });
        
        res.json({
            success: true,
            task: {
                ...task.toObject(),
                userReward: task.getRewardForUser(user),
                completion: completion ? {
                    status: completion.status,
                    startedAt: completion.startedAt,
                    submittedAt: completion.submittedAt
                } : null
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения задания:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить список доступных заданий
router.get('/', auth, async (req, res) => {
    try {
        const { category, type, difficulty, page = 1, limit = 20 } = req.query;
        const user = req.user;
        
        // Базовый фильтр
        const filter = {
            isActive: true,
            'requirements.minLevel': { $lte: user.level }
        };
        
        // Дополнительные фильтры
        if (category) filter.category = category;
        if (type) filter.type = type;
        if (difficulty) filter.difficulty = difficulty;
        
        // Проверка VIP уровня
        const vipLevels = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const userVipIndex = vipLevels.indexOf(user.vipLevel);
        filter['requirements.vipLevelRequired'] = {
            $in: vipLevels.slice(0, userVipIndex + 1)
        };
        
        const skip = (page - 1) * limit;
        
        const tasks = await Task.find(filter)
            .sort({ isSponsored: -1, isPremium: -1, reward: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        
        // Получить завершенные задания пользователя
        const completedTaskIds = await TaskCompletion.find({
            user: user._id,
            status: { $in: ['approved', 'submitted', 'verified'] }
        }).distinct('task');
        
        // Обогатить данные заданий
        const enrichedTasks = tasks.map(task => ({
            ...task,
            userReward: Task.prototype.getRewardForUser.call(task, user),
            isCompleted: completedTaskIds.includes(task._id),
            canComplete: Task.prototype.canUserComplete.call(task, user)
        }));
        
        res.json({
            success: true,
            tasks: enrichedTasks,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                hasMore: tasks.length === Number(limit)
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Начать выполнение задания
router.post('/:taskId/start', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const user = req.user;
        
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }
        
        if (!task.canUserComplete(user)) {
            return res.status(403).json({ error: 'Задание недоступно' });
        }
        
        // Проверить, не выполняется ли уже задание
        const existingCompletion = await TaskCompletion.findOne({
            user: user._id,
            task: taskId
        });
        
        if (existingCompletion) {
            return res.status(400).json({ 
                error: 'Задание уже выполняется или завершено',
                completion: existingCompletion
            });
        }
        
        // Создать запись о начале выполнения
        const completion = new TaskCompletion({
            user: user._id,
            task: taskId,
            rewardAmount: task.getRewardForUser(user),
            partnerTracking: {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                clickId: `${user._id}_${taskId}_${Date.now()}`
            }
        });
        
        await completion.save();
        
        // Обновить статистику задания
        await Task.findByIdAndUpdate(taskId, {
            $inc: { 'stats.totalCompletions': 1 }
        });
        
        res.json({
            success: true,
            completion: {
                id: completion._id,
                status: completion.status,
                startedAt: completion.startedAt,
                rewardAmount: completion.rewardAmount
            },
            actionUrl: task.actionUrl,
            trackingId: completion.partnerTracking.clickId
        });
        
    } catch (error) {
        console.error('Ошибка начала задания:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Отправить задание на проверку
router.post('/:taskId/submit', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { proof, timeSpent } = req.body;
        const user = req.user;
        
        const completion = await TaskCompletion.findOne({
            user: user._id,
            task: taskId,
            status: 'started'
        });
        
        if (!completion) {
            return res.status(404).json({ error: 'Выполнение задания не найдено' });
        }
        
        // Обновить статус
        completion.status = 'submitted';
        completion.submittedAt = new Date();
        completion.verificationData.proof = proof;
        completion.metadata.timeSpent = timeSpent;
        
        // Автоматическое одобрение для простых заданий
        const task = await Task.findById(taskId);
        if (task.type === 'video' || task.type === 'visit_site') {
            completion.status = 'approved';
            completion.completedAt = new Date();
            
            // Начислить награду пользователю
            user.points += completion.rewardAmount;
            user.tasksCompleted += 1;
            user.totalEarned += completion.rewardAmount;
            user.updateVipLevel();
            
            await user.save();
        }
        
        await completion.save();
        
        res.json({
            success: true,
            completion: {
                status: completion.status,
                submittedAt: completion.submittedAt,
                rewardAmount: completion.rewardAmount
            },
            user: {
                points: user.points,
                level: user.level,
                vipLevel: user.vipLevel
            }
        });
        
    } catch (error) {
        console.error('Ошибка отправки задания:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить категории заданий
router.get('/meta/categories', (req, res) => {
    res.json({
        success: true,
        categories: [
            { id: 'crypto', name: 'Криптовалюты', icon: '₿' },
            { id: 'gaming', name: 'Игры', icon: '🎮' },
            { id: 'shopping', name: 'Покупки', icon: '🛒' },
            { id: 'education', name: 'Образование', icon: '📚' },
            { id: 'entertainment', name: 'Развлечения', icon: '🎬' },
            { id: 'finance', name: 'Финансы', icon: '💰' }
        ]
    });
});

module.exports = router;