const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен, доступ запрещен'
      });
    }
    
    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Находим пользователя
    const user = await User.findById(decoded.user.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Проверяем, не заблокирован ли пользователь
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: `Аккаунт заблокирован: ${user.banReason}`
      });
    }
    
    // Добавляем пользователя в запрос
    req.user = decoded.user;
    req.userDoc = user;
    
    next();
    
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Недействительный токен'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Токен истек'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при авторизации'
    });
  }
};

// Middleware для проверки VIP статуса
const requireVip = (minLevel = 'bronze') => {
  return async (req, res, next) => {
    try {
      const user = req.userDoc || await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      
      const levelHierarchy = ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
      const userLevelIndex = levelHierarchy.indexOf(user.vipLevel);
      const requiredLevelIndex = levelHierarchy.indexOf(minLevel);
      
      if (userLevelIndex < requiredLevelIndex) {
        return res.status(403).json({
          success: false,
          error: `Требуется VIP уровень ${minLevel} или выше`
        });
      }
      
      req.userDoc = user;
      next();
      
    } catch (error) {
      console.error('Ошибка проверки VIP статуса:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при проверке VIP статуса'
      });
    }
  };
};

// Middleware для проверки Telegram Premium
const requirePremium = async (req, res, next) => {
  try {
    const user = req.userDoc || await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    if (!user.isPremium) {
      return res.status(403).json({
        success: false,
        error: 'Требуется Telegram Premium'
      });
    }
    
    req.userDoc = user;
    next();
    
  } catch (error) {
    console.error('Ошибка проверки Premium статуса:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при проверке Premium статуса'
    });
  }
};

// Middleware для проверки минимального количества выполненных заданий
const requireMinTasks = (minTasks) => {
  return async (req, res, next) => {
    try {
      const user = req.userDoc || await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      
      if (user.tasksCompleted < minTasks) {
        return res.status(403).json({
          success: false,
          error: `Требуется выполнить минимум ${minTasks} заданий`
        });
      }
      
      req.userDoc = user;
      next();
      
    } catch (error) {
      console.error('Ошибка проверки количества заданий:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при проверке количества заданий'
      });
    }
  };
};

// Middleware для проверки административных прав
const requireAdmin = async (req, res, next) => {
  try {
    const user = req.userDoc || await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Проверяем, является ли пользователь администратором
    // В реальном приложении это должно быть в модели User
    const adminTelegramIds = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];
    
    if (!adminTelegramIds.includes(user.telegramId)) {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа'
      });
    }
    
    req.userDoc = user;
    next();
    
  } catch (error) {
    console.error('Ошибка проверки административных прав:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при проверке прав доступа'
    });
  }
};

// Middleware для ограничения частоты запросов на пользователя
const userRateLimit = (windowMs = 60000, maxRequests = 60) => {
  const userRequests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Получаем или создаем запись для пользователя
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }
    
    const requests = userRequests.get(userId);
    
    // Удаляем старые запросы
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    userRequests.set(userId, recentRequests);
    
    // Проверяем лимит
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Превышен лимит запросов. Попробуйте позже.'
      });
    }
    
    // Добавляем текущий запрос
    recentRequests.push(now);
    
    next();
  };
};

// Middleware для логирования активности пользователя
const logUserActivity = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      // Обновляем время последней активности
      await User.findByIdAndUpdate(req.user.id, {
        lastLogin: new Date()
      });
    }
    next();
  } catch (error) {
    // Не прерываем запрос из-за ошибки логирования
    console.error('Ошибка логирования активности:', error);
    next();
  }
};

module.exports = {
  auth,
  requireVip,
  requirePremium,
  requireMinTasks,
  requireAdmin,
  userRateLimit,
  logUserActivity
}; 