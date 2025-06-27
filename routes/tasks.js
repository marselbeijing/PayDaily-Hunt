const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');
const { auth, requireVip, userRateLimit } = require('../middleware/auth');
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

// @route GET /api/tasks
// @desc Получить доступные задания
// @access Private
router.get('/', auth, userRateLimit(60000, 30), async (req, res) => {
  try {
    const { 
      category, 
      type, 
      minReward = 0, 
      maxReward = 999999,
      featured,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Построение фильтра
    const filter = {
      status: 'active',
      startDate: { $lte: new Date() },
      $or: [
        { endDate: null },
        { endDate: { $gte: new Date() } }
      ]
    };
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (featured !== undefined) filter.featured = featured === 'true';
    
    filter.baseReward = { $gte: parseInt(minReward), $lte: parseInt(maxReward) };
    
    // Фильтр по VIP уровню
    const levelHierarchy = ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const userLevelIndex = levelHierarchy.indexOf(user.vipLevel);
    const availableLevels = levelHierarchy.slice(0, userLevelIndex + 1);
    filter['requirements.minLevel'] = { $in: availableLevels };
    
    // Фильтр по минимальному количеству заданий
    filter['requirements.minTasksCompleted'] = { $lte: user.tasksCompleted };
    
    // Фильтр по Premium статусу
    if (!user.isPremium) {
      filter['requirements.isPremiumOnly'] = { $ne: true };
    }
    
    // Фильтр по VIP статусу
    if (user.vipLevel === 'none') {
      filter['requirements.isVipOnly'] = { $ne: true };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Получаем задания
    const tasks = await Task.find(filter)
      .sort({ 
        featured: -1, 
        trending: -1, 
        priority: -1, 
        createdAt: -1 
      })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-details.verificationData -partner.trackingParams');
    
    // Получаем уже выполненные задания пользователем
    const completedTaskIds = await TaskCompletion.find({
      user: req.user.id,
      status: { $in: ['completed', 'pending'] }
    }).distinct('task');
    
    // Обогащаем задания данными для пользователя
    const enrichedTasks = tasks.map(task => {
      const taskData = task.toObject();
      const isCompleted = completedTaskIds.some(id => id.toString() === task._id.toString());
      const canComplete = task.canUserComplete(user);
      const calculatedReward = task.calculateReward(user);
      
      return {
        ...taskData,
        isCompleted,
        canComplete: canComplete.canComplete,
        reason: canComplete.reason,
        calculatedReward,
        completionsLeft: task.completionsLeft
      };
    });
    
    const totalTasks = await Task.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        tasks: enrichedTasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTasks / parseInt(limit)),
          totalTasks,
          hasNext: skip + tasks.length < totalTasks,
          hasPrev: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения заданий:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении заданий'
    });
  }
});

// @route GET /api/tasks/:id
// @desc Получить детали задания
// @access Private
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задание не найдено'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Проверяем, может ли пользователь выполнить задание
    const canComplete = task.canUserComplete(user);
    
    // Проверяем, выполнял ли уже пользователь это задание
    const completion = await TaskCompletion.findOne({
      user: req.user.id,
      task: task._id
    });
    
    // Обновляем статистику просмотров
    task.updateStats('view');
    await task.save();
    
    const taskData = task.toObject();
    delete taskData.partner.trackingParams; // Убираем конфиденциальные данные
    
    res.json({
      success: true,
      data: {
        ...taskData,
        canComplete: canComplete.canComplete,
        reason: canComplete.reason,
        calculatedReward: task.calculateReward(user),
        completion: completion ? {
          status: completion.status,
          startedAt: completion.startedAt,
          completedAt: completion.completedAt,
          reward: completion.reward
        } : null
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения задания:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении задания'
    });
  }
});

// @route POST /api/tasks/:id/start
// @desc Начать выполнение задания
// @access Private
router.post('/:id/start', auth, userRateLimit(60000, 10), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задание не найдено'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Проверяем, может ли пользователь выполнить задание
    const canComplete = task.canUserComplete(user);
    if (!canComplete.canComplete) {
      return res.status(400).json({
        success: false,
        error: canComplete.reason
      });
    }
    
    // Проверяем, не выполняет ли уже пользователь это задание
    const existingCompletion = await TaskCompletion.findOne({
      user: req.user.id,
      task: task._id
    });
    
    if (existingCompletion) {
      if (existingCompletion.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Задание уже выполнено'
        });
      }
      
      if (existingCompletion.status === 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Задание ожидает проверки'
        });
      }
      
      // Если статус 'started', позволяем продолжить
      return res.json({
        success: true,
        data: {
          message: 'Продолжайте выполнение задания',
          completion: existingCompletion,
          task: task
        }
      });
    }
    
    // Создаем новое выполнение задания
    const completion = new TaskCompletion({
      user: req.user.id,
      task: task._id,
      reward: task.calculateReward(user),
      currency: task.currency,
      partnerPayout: task.partner.payout || 0,
      verification: {
        method: task.details.verificationMethod
      },
      partner: {
        network: task.partner.network,
        offerId: task.partner.offerId
      },
      antifraud: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        deviceFingerprint: req.body.deviceFingerprint || ''
      }
    });
    
    await completion.save();
    
    // Обновляем статистику задания
    task.updateStats('start');
    await task.save();
    
    res.json({
      success: true,
      data: {
        message: 'Задание успешно начато',
        completion,
        task: {
          id: task._id,
          title: task.title,
          instructions: task.details.instructions,
          url: task.details.url,
          verificationMethod: task.details.verificationMethod
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка начала выполнения задания:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при начале выполнения задания'
    });
  }
});

// @route POST /api/tasks/:id/complete
// @desc Завершить выполнение задания
// @access Private
router.post('/:id/complete', auth, userRateLimit(60000, 5), async (req, res) => {
  try {
    const { screenshots, proofText, verificationData } = req.body;
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задание не найдено'
      });
    }
    
    const completion = await TaskCompletion.findOne({
      user: req.user.id,
      task: task._id,
      status: 'started'
    });
    
    if (!completion) {
      return res.status(400).json({
        success: false,
        error: 'Задание не было начато или уже завершено'
      });
    }
    
    // Сохраняем данные для верификации
    if (screenshots && screenshots.length > 0) {
      completion.verification.screenshots = screenshots.map(url => ({
        url,
        uploadedAt: new Date()
      }));
    }
    
    if (proofText) {
      completion.verification.proofText = proofText;
    }
    
    if (verificationData) {
      completion.verification.data = verificationData;
    }
    
    // Обновляем статус в зависимости от метода верификации
    if (task.details.verificationMethod === 'automatic') {
      completion.status = 'completed';
      completion.completedAt = new Date();
      completion.verification.autoVerified = true;
      
      // Начисляем награду пользователю
      const user = await User.findById(req.user.id);
      user.balance += completion.reward;
      user.totalEarned += completion.reward;
      user.tasksCompleted += 1;
      user.vipPoints += completion.reward;
      
      // Проверяем изменение VIP уровня
      const levelChanged = user.updateVipLevel();
      
      // Обрабатываем реферальную программу
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          const commission = Math.floor(completion.reward * 0.1); // 10% комиссия
          referrer.balance += commission;
          referrer.referralEarnings += commission;
          
          // Обновляем статистику реферала
          const referralIndex = referrer.referrals.findIndex(
            ref => ref.user.toString() === user._id.toString()
          );
          if (referralIndex !== -1) {
            referrer.referrals[referralIndex].totalEarned += completion.reward;
          }
          
          completion.referral.referredBy = referrer._id;
          completion.referral.commission = commission;
          completion.referral.commissionPaid = true;
          
          await referrer.save();
        }
      }
      
      await user.save();
    } else {
      completion.status = 'pending';
    }
    
    await completion.save();
    
    // Обновляем статистику задания
    task.updateStats('complete');
    await task.save();
    
    res.json({
      success: true,
      data: {
        message: completion.status === 'completed' 
          ? 'Задание выполнено и награда начислена!' 
          : 'Задание отправлено на проверку',
        completion: {
          id: completion._id,
          status: completion.status,
          reward: completion.reward,
          completedAt: completion.completedAt
        },
        autoCompleted: completion.status === 'completed'
      }
    });
    
  } catch (error) {
    console.error('Ошибка завершения задания:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при завершении задания'
    });
  }
});

// @route GET /api/tasks/my/history
// @desc Получить историю выполненных заданий пользователя
// @access Private
router.get('/my/history', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user.id };
    if (status) filter.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const completions = await TaskCompletion.find(filter)
      .populate('task', 'title description type category reward media.icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCompletions = await TaskCompletion.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        completions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCompletions / parseInt(limit)),
          totalCompletions,
          hasNext: skip + completions.length < totalCompletions,
          hasPrev: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения истории заданий:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении истории заданий'
    });
  }
});

// @route GET /api/tasks/featured
// @desc Получить рекомендуемые задания
// @access Private
router.get('/featured', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const tasks = await Task.find({
      status: 'active',
      featured: true,
      startDate: { $lte: new Date() },
      $or: [
        { endDate: null },
        { endDate: { $gte: new Date() } }
      ]
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(10)
    .select('-details.verificationData -partner.trackingParams');
    
    const completedTaskIds = await TaskCompletion.find({
      user: req.user.id,
      status: { $in: ['completed', 'pending'] }
    }).distinct('task');
    
    const enrichedTasks = tasks.map(task => {
      const taskData = task.toObject();
      const isCompleted = completedTaskIds.some(id => id.toString() === task._id.toString());
      const canComplete = task.canUserComplete(user);
      
      return {
        ...taskData,
        isCompleted,
        canComplete: canComplete.canComplete,
        calculatedReward: task.calculateReward(user)
      };
    });
    
    res.json({
      success: true,
      data: enrichedTasks
    });
    
  } catch (error) {
    console.error('Ошибка получения рекомендуемых заданий:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении рекомендуемых заданий'
    });
  }
});

// @route GET /api/tasks/categories
// @desc Получить категории заданий
// @access Private
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Task.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgReward: { $avg: '$baseReward' },
          totalReward: { $sum: '$baseReward' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const categoryMap = {
      entertainment: 'Развлечения',
      education: 'Образование',
      finance: 'Финансы',
      crypto: 'Криптовалюты',
      social: 'Социальные сети',
      gaming: 'Игры',
      surveys: 'Опросы',
      apps: 'Приложения',
      referrals: 'Рефералы',
      special: 'Специальные'
    };
    
    const enrichedCategories = categories.map(cat => ({
      id: cat._id,
      name: categoryMap[cat._id] || cat._id,
      count: cat.count,
      avgReward: Math.round(cat.avgReward),
      totalReward: cat.totalReward
    }));
    
    res.json({
      success: true,
      data: enrichedCategories
    });
    
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при получении категорий'
    });
  }
});

// @route POST /api/tasks/rate/:completionId
// @desc Оценить задание
// @access Private
router.post('/rate/:completionId', [
  authenticateToken,
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ max: 500 })
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
    
    const completion = await TaskCompletion.findById(req.params.completionId)
      .populate('task');
    
    if (!completion) {
      return res.status(404).json({
        success: false,
        message: 'Выполнение задания не найдено'
      });
    }
    
    // Проверяем принадлежит ли задание пользователю
    if (completion.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к этому заданию'
      });
    }
    
    // Проверяем было ли задание завершено
    if (completion.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Можно оценивать только завершенные задания'
      });
    }
    
    // Добавляем оценку к заданию
    await completion.task.addRating(req.body.rating);
    
    res.json({
      success: true,
      message: 'Оценка добавлена',
      newAverage: completion.task.stats.averageRating,
      totalRatings: completion.task.stats.totalRatings
    });
    
  } catch (error) {
    console.error('Ошибка добавления оценки:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router; 