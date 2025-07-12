const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TaskCompletion = require('../models/TaskCompletion');

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

// Получить профиль пользователя
router.get('/profile', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // Получить статистику пользователя
        const completedTasks = await TaskCompletion.countDocuments({
            user: user._id,
            status: 'approved'
        });
        
        const todayEarnings = await TaskCompletion.aggregate([
            {
                $match: {
                    user: user._id,
                    status: 'approved',
                    completedAt: {
                        $gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$rewardAmount' }
                }
            }
        ]);
        
        // Получить количество рефералов
        const referralsCount = await User.countDocuments({
            referredBy: user._id
        });
        
        res.json({
            success: true,
            user: {
                ...user.toObject(),
                stats: {
                    completedTasks,
                    todayEarnings: todayEarnings[0]?.total || 0
                },
                referrals: referralsCount,
                referralLink: `${process.env.FRONTEND_URL || 'https://t.me/your_bot'}?ref=${user.referralCode}`
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Обновить профиль пользователя
router.put('/profile', auth, async (req, res) => {
    try {
        const { usdtAddress, notifications } = req.body;
        const user = req.user;
        
        if (usdtAddress) {
            user.wallet.usdtAddress = usdtAddress;
        }
        
        if (notifications) {
            user.notifications = { ...user.notifications, ...notifications };
        }
        
        await user.save();
        
        res.json({
            success: true,
            user: user.toObject()
        });
        
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить лидерборд
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const { period = 'week', limit = 50 } = req.query;
        
        let matchCondition = { status: 'approved' };
        
        // Фильтр по периоду
        if (period === 'today') {
            matchCondition.completedAt = {
                $gte: new Date(new Date().setHours(0, 0, 0, 0))
            };
        } else if (period === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchCondition.completedAt = { $gte: weekAgo };
        } else if (period === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            matchCondition.completedAt = { $gte: monthAgo };
        }
        
        const leaderboard = await TaskCompletion.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$user',
                    totalEarnings: { $sum: '$rewardAmount' },
                    tasksCompleted: { $sum: 1 }
                }
            },
            { $sort: { totalEarnings: -1 } },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    displayName: '$userInfo.displayName',
                    vipLevel: '$userInfo.vipLevel',
                    totalEarnings: 1,
                    tasksCompleted: 1,
                    avatar: '$userInfo.avatar'
                }
            }
        ]);
        
        // Найти позицию текущего пользователя
        const userPosition = await TaskCompletion.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$user',
                    totalEarnings: { $sum: '$rewardAmount' }
                }
            },
            { $sort: { totalEarnings: -1 } },
            {
                $group: {
                    _id: null,
                    users: { $push: { userId: '$_id', totalEarnings: '$totalEarnings' } }
                }
            },
            {
                $project: {
                    position: {
                        $indexOfArray: ['$users.userId', req.user._id]
                    }
                }
            }
        ]);
        
        res.json({
            success: true,
            leaderboard,
            userPosition: userPosition[0]?.position + 1 || null,
            period
        });
        
    } catch (error) {
        console.error('Ошибка получения лидерборда:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить рефералов
router.get('/referrals', auth, async (req, res) => {
    try {
        const user = req.user;
        
        const referrals = await User.find({
            referredBy: user._id
        }).select('displayName registrationDate points tasksCompleted totalEarned');
        
        const referralStats = {
            totalReferrals: referrals.length,
            totalEarnings: user.referralEarnings,
            activeReferrals: referrals.filter(r => r.tasksCompleted > 0).length
        };
        
        res.json({
            success: true,
            referrals,
            stats: referralStats,
            referralCode: user.referralCode,
            referralLink: `${process.env.FRONTEND_URL || 'https://t.me/your_bot'}?ref=${user.referralCode}`
        });
        
    } catch (error) {
        console.error('Ошибка получения рефералов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить статистику пользователя
router.get('/stats', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // Статистика по дням
        const dailyStats = await TaskCompletion.aggregate([
            {
                $match: {
                    user: user._id,
                    status: 'approved',
                    completedAt: {
                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 дней
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$completedAt'
                        }
                    },
                    earnings: { $sum: '$rewardAmount' },
                    tasks: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Общая статистика
        const totalStats = await TaskCompletion.aggregate([
            {
                $match: {
                    user: user._id,
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: '$rewardAmount' },
                    totalTasks: { $sum: 1 },
                    avgReward: { $avg: '$rewardAmount' }
                }
            }
        ]);
        
        res.json({
            success: true,
            dailyStats,
            totalStats: totalStats[0] || {
                totalEarnings: 0,
                totalTasks: 0,
                avgReward: 0
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router; 