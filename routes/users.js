const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const TaskCompletion = require('../models/TaskCompletion');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const router = express.Router();

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }
  
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// @route GET /api/users/leaderboard
// @desc Получить лидерборд пользователей
// @access Private
router.get('/leaderboard', [
  authenticateToken,
  query('type').optional().isIn(['points', 'earned', 'tasks', 'streak']),
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'all']),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors: errors.array()
      });
    }
    
    const type = req.query.type || 'points';
    const period = req.query.period || 'all';
    const limit = parseInt(req.query.limit) || 50;
    
    let sortField = 'points';
    let matchStage = { isActive: true, isBanned: false };
    
    switch (type) {
      case 'earned':
        sortField = 'totalEarned';
        break;
      case 'tasks':
        sortField = 'tasksCompleted';
        break;
      case 'streak':
        sortField = 'maxCheckinStreak';
        break;
      default:
        sortField = 'points';
    }
    
    // Фильтрация по периоду
    if (period !== 'all') {
      let dateFilter = new Date();
      switch (period) {
        case 'daily':
          dateFilter.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'monthly':
          dateFilter.setMonth(dateFilter.getMonth() - 1);
          break;
      }
      
      if (period === 'daily') {
        // Для ежедневного рейтинга используем tasksCompletedToday
        sortField = 'tasksCompletedToday';
      } else {
        // Для недельного/месячного используем updatedAt
        matchStage.updatedAt = { $gte: dateFilter };
      }
    }
    
    const pipeline = [
      { $match: matchStage },
      { $sort: { [sortField]: -1 } },
      { $limit: limit },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          points: 1,
          totalEarned: 1,
          tasksCompleted: 1,
          tasksCompletedToday: 1,
          vipLevel: 1,
          checkinStreak: 1,
          maxCheckinStreak: 1,
          createdAt: 1,
          value: `$${sortField}`
        }
      }
    ];
    
    const users = await User.aggregate(pipeline);
    
    // Найти позицию текущего пользователя
    const currentUserRank = await User.aggregate([
      { $match: matchStage },
      { $sort: { [sortField]: -1 } },
      {
        $group: {
          _id: null,
          users: { $push: '$_id' }
        }
      },
      {
        $project: {
          rank: { $indexOfArray: ['$users', require('mongoose').Types.ObjectId(req.user.userId)] }
        }
      }
    ]);
    
    const currentUser = await User.findById(req.user.userId);
    
    res.json({
      success: true,
      leaderboard: users.map((user, index) => ({
        rank: index + 1,
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        vipLevel: user.vipLevel,
        value: user.value,
        createdAt: user.createdAt
      })),
      currentUser: {
        rank: currentUserRank[0] ? currentUserRank[0].rank + 1 : null,
        value: currentUser ? currentUser[sortField] : 0
      },
      filter: {
        type,
        period,
        limit
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения лидерборда:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/users/referrals
// @desc Получить информацию о рефералах
// @access Private
router.get('/referrals', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('referrals', 'username firstName lastName totalEarned tasksCompleted vipLevel createdAt')
      .populate('referredBy', 'username firstName lastName');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Статистика рефералов
    const referralStats = await User.aggregate([
      { $match: { referredBy: user._id } },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          totalEarned: { $sum: '$totalEarned' },
          totalTasks: { $sum: '$tasksCompleted' },
          activeReferrals: {
            $sum: {
              $cond: [
                { $gte: ['$updatedAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    const stats = referralStats[0] || {
      totalReferrals: 0,
      totalEarned: 0,
      totalTasks: 0,
      activeReferrals: 0
    };
    
    // Рассчитываем потенциальный доход от рефералов
    const referralBonusPercent = parseFloat(process.env.REFERRAL_BONUS_PERCENT) || 10;
    const potentialEarnings = (stats.totalEarned * referralBonusPercent) / 100;
    
    res.json({
      success: true,
      referralCode: user.referralCode,
      referralLink: `${process.env.FRONTEND_URL}?ref=${user.referralCode}`,
      referrals: user.referrals.map(ref => ({
        id: ref._id,
        username: ref.username,
        firstName: ref.firstName,
        lastName: ref.lastName,
        totalEarned: ref.totalEarned,
        tasksCompleted: ref.tasksCompleted,
        vipLevel: ref.vipLevel,
        joinedAt: ref.createdAt,
        isActive: ref.updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      })),
      referredBy: user.referredBy,
      stats: {
        ...stats,
        potentialEarnings,
        currentEarnings: user.referralEarnings,
        bonusPercent: referralBonusPercent
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения рефералов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/users/stats
// @desc Получить статистику пользователя
// @access Private
router.get('/stats', [
  authenticateToken,
  query('period').optional().isIn(['daily', 'weekly', 'monthly', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors: errors.array()
      });
    }
    
    const period = req.query.period || 'all';
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Определяем временной фильтр
    let dateFilter = {};
    if (period !== 'all') {
      let startDate = new Date();
      switch (period) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }
      dateFilter = { createdAt: { $gte: startDate } };
    }
    
    // Статистика выполнения заданий
    const taskStats = await TaskCompletion.aggregate([
      { 
        $match: { 
          user: user._id,
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPoints: { $sum: '$pointsEarned' }
        }
      }
    ]);
    
    // Статистика по категориям
    const categoryStats = await TaskCompletion.aggregate([
      {
        $match: {
          user: user._id,
          status: 'verified',
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      {
        $group: {
          _id: '$taskInfo.category',
          count: { $sum: 1 },
          totalPoints: { $sum: '$pointsEarned' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Статистика по дням (для графика)
    const dailyStats = await TaskCompletion.aggregate([
      {
        $match: {
          user: user._id,
          status: 'verified',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          points: { $sum: '$pointsEarned' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Статистика выводов
    const withdrawalStats = await WithdrawalRequest.aggregate([
      {
        $match: {
          user: user._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);
    
    // Среднее время выполнения заданий
    const avgCompletionTime = await TaskCompletion.aggregate([
      {
        $match: {
          user: user._id,
          status: 'verified',
          'timeMetrics.timeToComplete': { $exists: true },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$timeMetrics.timeToComplete' }
        }
      }
    ]);
    
    // Формируем статистику по статусам заданий
    const statusStats = {};
    taskStats.forEach(stat => {
      statusStats[stat._id] = {
        count: stat.count,
        totalPoints: stat.totalPoints
      };
    });
    
    // Общая статистика
    const totalCompleted = statusStats.verified?.count || 0;
    const totalEarned = statusStats.verified?.totalPoints || 0;
    const totalPending = (statusStats.submitted?.count || 0) + 
                        (statusStats.pending_verification?.count || 0);
    const totalRejected = statusStats.rejected?.count || 0;
    
    // Коэффициент успеха
    const totalAttempts = Object.values(statusStats).reduce((sum, stat) => sum + stat.count, 0);
    const successRate = totalAttempts > 0 ? (totalCompleted / totalAttempts) * 100 : 0;
    
    res.json({
      success: true,
      period,
      user: {
        id: user._id,
        username: user.username,
        vipLevel: user.vipLevel,
        vipMultiplier: user.vipMultiplier,
        checkinStreak: user.checkinStreak,
        maxCheckinStreak: user.maxCheckinStreak
      },
      stats: {
        tasks: {
          completed: totalCompleted,
          pending: totalPending,
          rejected: totalRejected,
          total: totalAttempts,
          successRate: Math.round(successRate * 100) / 100
        },
        earnings: {
          total: totalEarned,
          current: user.points,
          referral: user.referralEarnings,
          avgPerTask: totalCompleted > 0 ? Math.round(totalEarned / totalCompleted) : 0
        },
        time: {
          avgCompletionTime: avgCompletionTime[0]?.avgTime || 0,
          memberSince: user.createdAt
        },
        categories: categoryStats,
        daily: dailyStats,
        withdrawals: withdrawalStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
          };
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/users/achievements
// @desc Получить достижения пользователя
// @access Private
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Получаем статистику для расчета достижений
    const taskStats = await TaskCompletion.aggregate([
      { $match: { user: user._id, status: 'verified' } },
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      {
        $group: {
          _id: '$taskInfo.category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const categoryStats = {};
    taskStats.forEach(stat => {
      categoryStats[stat._id] = stat.count;
    });
    
    // Определяем достижения
    const achievements = [
      {
        id: 'first_task',
        name: 'Первые шаги',
        description: 'Выполните первое задание',
        icon: '🎯',
        unlocked: user.tasksCompleted >= 1,
        progress: Math.min(user.tasksCompleted, 1),
        maxProgress: 1,
        points: 50
      },
      {
        id: 'task_master_10',
        name: 'Мастер заданий',
        description: 'Выполните 10 заданий',
        icon: '🏆',
        unlocked: user.tasksCompleted >= 10,
        progress: Math.min(user.tasksCompleted, 10),
        maxProgress: 10,
        points: 200
      },
      {
        id: 'task_master_50',
        name: 'Профессионал',
        description: 'Выполните 50 заданий',
        icon: '🎖️',
        unlocked: user.tasksCompleted >= 50,
        progress: Math.min(user.tasksCompleted, 50),
        maxProgress: 50,
        points: 500
      },
      {
        id: 'task_master_100',
        name: 'Эксперт',
        description: 'Выполните 100 заданий',
        icon: '👑',
        unlocked: user.tasksCompleted >= 100,
        progress: Math.min(user.tasksCompleted, 100),
        maxProgress: 100,
        points: 1000
      },
      {
        id: 'streak_3',
        name: 'Постоянство',
        description: 'Поддерживайте серию чек-инов 3 дня',
        icon: '🔥',
        unlocked: user.maxCheckinStreak >= 3,
        progress: Math.min(user.maxCheckinStreak, 3),
        maxProgress: 3,
        points: 100
      },
      {
        id: 'streak_7',
        name: 'Недельный воин',
        description: 'Поддерживайте серию чек-инов 7 дней',
        icon: '⚡',
        unlocked: user.maxCheckinStreak >= 7,
        progress: Math.min(user.maxCheckinStreak, 7),
        maxProgress: 7,
        points: 300
      },
      {
        id: 'streak_30',
        name: 'Месячный чемпион',
        description: 'Поддерживайте серию чек-инов 30 дней',
        icon: '💎',
        unlocked: user.maxCheckinStreak >= 30,
        progress: Math.min(user.maxCheckinStreak, 30),
        maxProgress: 30,
        points: 1500
      },
      {
        id: 'vip_bronze',
        name: 'Бронзовый статус',
        description: 'Достигните бронзового VIP уровня',
        icon: '🥉',
        unlocked: ['bronze', 'silver', 'gold', 'platinum', 'diamond'].includes(user.vipLevel),
        progress: user.vipLevel !== 'none' ? 1 : 0,
        maxProgress: 1,
        points: 250
      },
      {
        id: 'vip_silver',
        name: 'Серебряный статус',
        description: 'Достигните серебряного VIP уровня',
        icon: '🥈',
        unlocked: ['silver', 'gold', 'platinum', 'diamond'].includes(user.vipLevel),
        progress: ['silver', 'gold', 'platinum', 'diamond'].includes(user.vipLevel) ? 1 : 0,
        maxProgress: 1,
        points: 500
      },
      {
        id: 'vip_gold',
        name: 'Золотой статус',
        description: 'Достигните золотого VIP уровня',
        icon: '🥇',
        unlocked: ['gold', 'platinum', 'diamond'].includes(user.vipLevel),
        progress: ['gold', 'platinum', 'diamond'].includes(user.vipLevel) ? 1 : 0,
        maxProgress: 1,
        points: 1000
      },
      {
        id: 'referral_1',
        name: 'Пригласи друга',
        description: 'Пригласите одного реферала',
        icon: '👥',
        unlocked: user.referrals.length >= 1,
        progress: Math.min(user.referrals.length, 1),
        maxProgress: 1,
        points: 200
      },
      {
        id: 'referral_5',
        name: 'Командный игрок',
        description: 'Пригласите 5 рефералов',
        icon: '👨‍👩‍👧‍👦',
        unlocked: user.referrals.length >= 5,
        progress: Math.min(user.referrals.length, 5),
        maxProgress: 5,
        points: 750
      },
      {
        id: 'earner_1000',
        name: 'Тысячник',
        description: 'Заработайте 1000 баллов',
        icon: '💰',
        unlocked: user.totalEarned >= 1000,
        progress: Math.min(user.totalEarned, 1000),
        maxProgress: 1000,
        points: 100
      },
      {
        id: 'earner_10000',
        name: 'Богач',
        description: 'Заработайте 10000 баллов',
        icon: '💎',
        unlocked: user.totalEarned >= 10000,
        progress: Math.min(user.totalEarned, 10000),
        maxProgress: 10000,
        points: 500
      }
    ];
    
    // Добавляем достижения по категориям
    const categories = ['entertainment', 'finance', 'gaming', 'social', 'crypto', 'shopping', 'education'];
    categories.forEach(category => {
      const count = categoryStats[category] || 0;
      achievements.push({
        id: `category_${category}`,
        name: `Специалист ${category}`,
        description: `Выполните 10 заданий в категории ${category}`,
        icon: '📈',
        unlocked: count >= 10,
        progress: Math.min(count, 10),
        maxProgress: 10,
        points: 300
      });
    });
    
    // Подсчитываем статистику достижений
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);
    
    res.json({
      success: true,
      achievements,
      summary: {
        unlocked: unlockedCount,
        total: achievements.length,
        completion: Math.round((unlockedCount / achievements.length) * 100),
        totalPoints
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения достижений:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/users/profile/:userId
// @desc Получить публичный профиль пользователя
// @access Private
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username firstName lastName vipLevel totalEarned tasksCompleted maxCheckinStreak createdAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Публичная статистика
    const taskStats = await TaskCompletion.aggregate([
      { $match: { user: user._id, status: 'verified' } },
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      {
        $group: {
          _id: '$taskInfo.category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        vipLevel: user.vipLevel,
        totalEarned: user.totalEarned,
        tasksCompleted: user.tasksCompleted,
        maxCheckinStreak: user.maxCheckinStreak,
        memberSince: user.createdAt,
        categories: taskStats
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router; 