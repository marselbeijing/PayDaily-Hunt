const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Функция для верификации данных Telegram WebApp
const verifyTelegramWebAppData = (initData) => {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return { valid: false, error: 'Hash не найден' };
    }
    
    // Удаляем hash из параметров
    urlParams.delete('hash');
    
    // Сортируем параметры
    const sortedParams = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    // Вычисляем hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');
    
    if (calculatedHash !== hash) {
      return { valid: false, error: 'Неверный hash' };
    }
    
    // Проверяем время жизни данных (не более 24 часов)
    const authDate = parseInt(urlParams.get('auth_date'));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (currentTime - authDate > 86400) { // 24 часа
      return { valid: false, error: 'Данные устарели' };
    }
    
    // Извлекаем данные пользователя
    const userData = JSON.parse(urlParams.get('user') || '{}');
    
    return {
      valid: true,
      user: userData,
      authDate: new Date(authDate * 1000)
    };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Валидация данных Telegram WebApp
const validateTelegramWebAppData = (initData) => {
  try {
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
  } catch (error) {
    console.error('Ошибка валидации Telegram данных:', error);
    return false;
  }
};

// @route POST /api/auth/telegram
// @desc Авторизация через Telegram WebApp
// @access Public
router.post('/telegram', [
  body('initData').notEmpty().withMessage('initData обязательно'),
  body('referralCode').optional().isLength({ min: 6, max: 10 })
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
    
    const { initData, referralCode } = req.body;
    
    // Валидация данных в production
    if (process.env.NODE_ENV === 'production') {
      const isValid = validateTelegramWebAppData(initData);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Недействительные данные Telegram'
        });
      }
    }
    
    // Верифицируем данные Telegram
    const verification = verifyTelegramWebAppData(initData);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Неверные данные Telegram',
        error: verification.error
      });
    }
    
    const telegramUser = verification.user;
    
    // Проверяем существует ли пользователь
    let user = await User.findOne({ telegramId: telegramUser.id.toString() });
    
    if (!user) {
      // Создаем нового пользователя
      user = new User({
        telegramId: telegramUser.id.toString(),
        username: telegramUser.username || `user_${telegramUser.id}`,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        languageCode: telegramUser.language_code || 'en',
        isPremium: telegramUser.is_premium || false,
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceFingerprint: req.headers['user-agent'] || ''
      });
      
      // Генерируем реферальный код
      user.generateReferralCode();
      
      // Обрабатываем реферальный код, если предоставлен
      if (referralCode) {
        const referrer = await User.findOne({ referralCode });
        if (referrer && referrer.telegramId !== user.telegramId) {
          user.referredBy = referrer._id;
          referrer.referrals.push({
            user: user._id,
            dateReferred: new Date(),
            totalEarned: 0
          });
          
          // Даем бонус за приглашение
          const referralBonus = 100; // 100 баллов за приглашение
          referrer.addPoints(referralBonus, 'referral_bonus');
          
          await referrer.save();
        }
      }
      
      // Устанавливаем VIP преимущества
      user.updateVipBenefits();
      
      await user.save();
    } else {
      // Обновляем информацию существующего пользователя
      user.username = telegramUser.username || user.username;
      user.firstName = telegramUser.first_name;
      user.lastName = telegramUser.last_name;
      user.languageCode = telegramUser.language_code || user.languageCode;
      
      // Сбрасываем ежедневные счетчики если нужно
      user.resetDailyCounters();
      
      await user.save();
    }
    
    // Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user._id,
        telegramId: user.telegramId,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    // Формируем ответ
    const userData = {
      id: user._id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      points: user.points,
      totalEarned: user.totalEarned,
      vipLevel: user.vipLevel,
      vipPoints: user.vipPoints,
      vipMultiplier: user.vipMultiplier,
      nextVipLevel: user.nextVipLevel,
      pointsToNextVip: user.pointsToNextVip,
      checkinStreak: user.checkinStreak,
      maxCheckinStreak: user.maxCheckinStreak,
      canCheckin: user.canCheckin(),
      tasksCompleted: user.tasksCompleted,
      tasksCompletedToday: user.tasksCompletedToday,
      referralCode: user.referralCode,
      referrals: user.referrals.length,
      referralEarnings: user.referralEarnings,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
    
    res.json({
      success: true,
      message: 'Авторизация успешна',
      token,
      user: userData
    });
    
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route POST /api/auth/checkin
// @desc Ежедневный чек-ин
// @access Private
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Проверяем можно ли делать чек-ин
    if (!user.canCheckin()) {
      const nextCheckinTime = new Date(user.lastCheckin.getTime() + 20 * 60 * 60 * 1000);
      return res.status(400).json({
        success: false,
        message: 'Чек-ин еще недоступен',
        nextCheckinTime
      });
    }
    
    // Выполняем чек-ин
    const checkinResult = user.performCheckin();
    await user.save();
    
    res.json({
      success: true,
      message: 'Чек-ин выполнен успешно',
      reward: checkinResult,
      user: {
        points: user.points,
        totalEarned: user.totalEarned,
        checkinStreak: user.checkinStreak,
        maxCheckinStreak: user.maxCheckinStreak,
        canCheckin: user.canCheckin(),
        lastCheckin: user.lastCheckin,
        vipLevel: user.vipLevel,
        vipPoints: user.vipPoints
      }
    });
    
  } catch (error) {
    console.error('Ошибка чек-ина:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/auth/profile
// @desc Получить профиль пользователя
// @access Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('referrals', 'username firstName lastName totalEarned createdAt')
      .populate('referredBy', 'username firstName lastName');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Сбрасываем ежедневные счетчики если нужно
    user.resetDailyCounters();
    await user.save();
    
    const userData = {
      id: user._id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      points: user.points,
      totalEarned: user.totalEarned,
      vipLevel: user.vipLevel,
      vipPoints: user.vipPoints,
      vipMultiplier: user.vipMultiplier,
      nextVipLevel: user.nextVipLevel,
      pointsToNextVip: user.pointsToNextVip,
      checkinStreak: user.checkinStreak,
      maxCheckinStreak: user.maxCheckinStreak,
      canCheckin: user.canCheckin(),
      lastCheckin: user.lastCheckin,
      tasksCompleted: user.tasksCompleted,
      tasksCompletedToday: user.tasksCompletedToday,
      referralCode: user.referralCode,
      referrals: user.referrals,
      referredBy: user.referredBy,
      referralEarnings: user.referralEarnings,
      isActive: user.isActive,
      isBanned: user.isBanned,
      banReason: user.banReason,
      suspiciousActivity: user.suspiciousActivity,
      notifications: user.notifications,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.json({
      success: true,
      user: userData
    });
    
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route PUT /api/auth/profile
// @desc Обновить профиль пользователя
// @access Private
router.put('/profile', [
  authenticateToken,
  body('notifications.newTasks').optional().isBoolean(),
  body('notifications.rewards').optional().isBoolean(),
  body('notifications.referrals').optional().isBoolean()
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
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Обновляем настройки уведомлений
    if (req.body.notifications) {
      user.notifications = { ...user.notifications, ...req.body.notifications };
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Профиль обновлен успешно',
      user: {
        notifications: user.notifications
      }
    });
    
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route POST /api/auth/refresh
// @desc Обновить токен
// @access Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь неактивен'
      });
    }
    
    // Создаем новый JWT токен
    const token = jwt.sign(
      { 
        userId: user._id,
        telegramId: user.telegramId,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.json({
      success: true,
      message: 'Токен обновлен',
      token
    });
    
  } catch (error) {
    console.error('Ошибка обновления токена:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/auth/checkin-status
// @desc Проверить статус чек-ина
// @access Private
router.get('/checkin-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    const canCheckin = user.canCheckin();
    let nextCheckinTime = null;
    
    if (!canCheckin && user.lastCheckin) {
      nextCheckinTime = new Date(user.lastCheckin.getTime() + 20 * 60 * 60 * 1000);
    }
    
    res.json({
      success: true,
      canCheckin,
      nextCheckinTime,
      streak: user.checkinStreak,
      maxStreak: user.maxCheckinStreak,
      lastCheckin: user.lastCheckin
    });
    
  } catch (error) {
    console.error('Ошибка проверки статуса чек-ина:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Тестовый endpoint для проверки соединения
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend работает!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router; 