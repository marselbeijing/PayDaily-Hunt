const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
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

// @route GET /api/payments/rates
// @desc Получить курсы конвертации
// @access Private
router.get('/rates', authenticateToken, async (req, res) => {
  try {
    const rates = {
      pointsToUSDT: parseInt(process.env.POINTS_TO_USDT_RATE) || 1000,
      feePercent: parseFloat(process.env.WITHDRAWAL_FEE_PERCENT) || 5,
      minWithdrawal: parseInt(process.env.MIN_WITHDRAWAL_POINTS) || 1000,
      supportedWallets: [
        {
          type: 'USDT_TRC20',
          network: 'TRON',
          name: 'USDT (TRC-20)',
          fee: 1, // USDT
          minAmount: 1,
          icon: '💰'
        },
        {
          type: 'USDT_ERC20',
          network: 'ETHEREUM',
          name: 'USDT (ERC-20)',
          fee: 15, // USDT
          minAmount: 20,
          icon: '💰'
        },
        {
          type: 'USDT_BEP20',
          network: 'BSC',
          name: 'USDT (BEP-20)',
          fee: 0.5, // USDT
          minAmount: 1,
          icon: '💰'
        }
      ]
    };
    
    res.json({
      success: true,
      rates
    });
    
  } catch (error) {
    console.error('Ошибка получения курсов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route POST /api/payments/calculate
// @desc Расчет суммы вывода
// @access Private
router.post('/calculate', [
  authenticateToken,
  body('points').isInt({ min: 1 }),
  body('walletType').isIn(['USDT_TRC20', 'USDT_ERC20', 'USDT_BEP20'])
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
    
    const { points, walletType } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Проверяем достаточность баланса
    if (user.points < points) {
      return res.status(400).json({
        success: false,
        message: 'Недостаточно баллов',
        available: user.points,
        requested: points
      });
    }
    
    // Проверяем минимальную сумму
    const minWithdrawal = parseInt(process.env.MIN_WITHDRAWAL_POINTS) || 1000;
    if (points < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Минимальная сумма вывода: ${minWithdrawal} баллов`,
        minWithdrawal
      });
    }
    
    // Расчеты
    const conversionRate = parseInt(process.env.POINTS_TO_USDT_RATE) || 1000;
    const feePercent = parseFloat(process.env.WITHDRAWAL_FEE_PERCENT) || 5;
    
    const baseAmount = points / conversionRate; // USDT
    const processingFee = (baseAmount * feePercent) / 100;
    
    // Сетевые комиссии
    const networkFees = {
      'USDT_TRC20': 1,
      'USDT_ERC20': 15,
      'USDT_BEP20': 0.5
    };
    
    const networkFee = networkFees[walletType] || 1;
    const finalAmount = baseAmount - processingFee - networkFee;
    
    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Сумма после вычета комиссий слишком мала',
        calculation: {
          baseAmount,
          processingFee,
          networkFee,
          finalAmount
        }
      });
    }
    
    res.json({
      success: true,
      calculation: {
        requestedPoints: points,
        baseAmount: Math.round(baseAmount * 100) / 100,
        processingFee: Math.round(processingFee * 100) / 100,
        networkFee,
        finalAmount: Math.round(finalAmount * 100) / 100,
        conversionRate,
        feePercent
      }
    });
    
  } catch (error) {
    console.error('Ошибка расчета вывода:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route POST /api/payments/withdraw
// @desc Создать заявку на вывод
// @access Private
router.post('/withdraw', [
  authenticateToken,
  body('points').isInt({ min: 1 }),
  body('walletAddress').isLength({ min: 20, max: 100 }).trim(),
  body('walletType').isIn(['USDT_TRC20', 'USDT_ERC20', 'USDT_BEP20']),
  body('deviceFingerprint').optional().isString()
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
    
    const { points, walletAddress, walletType, deviceFingerprint } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Проверяем не заблокирован ли пользователь
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Аккаунт заблокирован',
        reason: user.banReason
      });
    }
    
    // Проверяем достаточность баланса
    if (user.points < points) {
      return res.status(400).json({
        success: false,
        message: 'Недостаточно баллов',
        available: user.points,
        requested: points
      });
    }
    
    // Проверяем лимиты на вывод
    const recentWithdrawals = await WithdrawalRequest.find({
      user: user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    if (recentWithdrawals.length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Превышен лимит заявок на вывод (3 в день)'
      });
    }
    
    // Проверяем есть ли незавершенные заявки
    const pendingWithdrawals = await WithdrawalRequest.find({
      user: user._id,
      status: { $in: ['pending', 'processing', 'on_hold'] }
    });
    
    if (pendingWithdrawals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'У вас есть незавершенные заявки на вывод',
        pendingCount: pendingWithdrawals.length
      });
    }
    
    // Расчет сумм
    const conversionRate = parseInt(process.env.POINTS_TO_USDT_RATE) || 1000;
    const feePercent = parseFloat(process.env.WITHDRAWAL_FEE_PERCENT) || 5;
    
    const baseAmount = points / conversionRate;
    const processingFee = (baseAmount * feePercent) / 100;
    
    const networkFees = {
      'USDT_TRC20': 1,
      'USDT_ERC20': 15,
      'USDT_BEP20': 0.5
    };
    
    const networkFee = networkFees[walletType] || 1;
    const finalAmount = baseAmount - processingFee - networkFee;
    
    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Сумма после вычета комиссий слишком мала'
      });
    }
    
    // Определяем сеть
    const networks = {
      'USDT_TRC20': 'TRON',
      'USDT_ERC20': 'ETHEREUM',
      'USDT_BEP20': 'BSC'
    };
    
    // Создаем заявку на вывод
    const withdrawalRequest = new WithdrawalRequest({
      user: user._id,
      amount: baseAmount,
      pointsDeducted: points,
      walletAddress,
      walletType,
      network: networks[walletType],
      conversionRate,
      processingFee,
      networkFee,
      finalAmount,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceFingerprint
      }
    });
    
    // Запускаем проверки безопасности
    await withdrawalRequest.runSecurityChecks();
    
    // Сохраняем заявку
    await withdrawalRequest.save();
    
    // Замораживаем баллы пользователя
    user.points -= points;
    await user.save();
    
    res.json({
      success: true,
      message: 'Заявка на вывод создана',
      withdrawalId: withdrawalRequest._id,
      status: withdrawalRequest.status,
      finalAmount: withdrawalRequest.finalAmount,
      estimatedProcessingTime: '24-48 часов'
    });
    
  } catch (error) {
    console.error('Ошибка создания заявки на вывод:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/payments/withdrawals
// @desc Получить историю выводов
// @access Private
router.get('/withdrawals', [
  authenticateToken,
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'on_hold']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
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
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const options = {
      status: req.query.status,
      limit,
      skip
    };
    
    const withdrawals = await WithdrawalRequest.getUserWithdrawals(req.user.userId, options);
    
    // Статистика выводов
    const stats = await WithdrawalRequest.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId(req.user.userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);
    
    const totalWithdrawn = await WithdrawalRequest.aggregate([
      { 
        $match: { 
          user: require('mongoose').Types.ObjectId(req.user.userId),
          status: 'completed'
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      withdrawals: withdrawals.map(w => ({
        id: w._id,
        amount: w.finalAmount,
        pointsDeducted: w.pointsDeducted,
        walletAddress: w.walletAddress,
        walletType: w.walletType,
        network: w.network,
        status: w.status,
        processingFee: w.processingFee,
        networkFee: w.networkFee,
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
        completedAt: w.completedAt,
        transactionHash: w.blockchain?.transactionHash,
        explorerUrl: w.explorerLink,
        failureReason: w.failureReason,
        canResubmit: w.canResubmit && w.status === 'failed',
        processingTime: w.processingTime
      })),
      pagination: {
        page,
        limit,
        total: withdrawals.length
      },
      stats: {
        byStatus: stats,
        totalWithdrawn: totalWithdrawn[0]?.total || 0
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения выводов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/payments/withdrawal/:id
// @desc Получить детали заявки на вывод
// @access Private
router.get('/withdrawal/:id', authenticateToken, async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id)
      .populate('user', 'username firstName lastName')
      .populate('processedBy', 'name');
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Заявка на вывод не найдена'
      });
    }
    
    // Проверяем принадлежность заявки пользователю
    if (withdrawal.user._id.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к этой заявке'
      });
    }
    
    res.json({
      success: true,
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.finalAmount,
        pointsDeducted: withdrawal.pointsDeducted,
        walletAddress: withdrawal.walletAddress,
        walletType: withdrawal.walletType,
        network: withdrawal.network,
        status: withdrawal.status,
        conversionRate: withdrawal.conversionRate,
        processingFee: withdrawal.processingFee,
        networkFee: withdrawal.networkFee,
        requestedAt: withdrawal.requestedAt,
        processedAt: withdrawal.processedAt,
        completedAt: withdrawal.completedAt,
        processingTime: withdrawal.processingTime,
        blockchain: withdrawal.blockchain,
        explorerUrl: withdrawal.explorerLink,
        failureReason: withdrawal.failureReason,
        failureCategory: withdrawal.failureCategory,
        canResubmit: withdrawal.canResubmit,
        resubmissionDeadline: withdrawal.resubmissionDeadline,
        securityChecks: withdrawal.securityChecks,
        attempts: withdrawal.attempts,
        maxAttempts: withdrawal.maxAttempts,
        notifications: withdrawal.notifications,
        processedBy: withdrawal.processedBy
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// @route POST /api/payments/withdrawal/:id/cancel
// @desc Отменить заявку на вывод
// @access Private
router.post('/withdrawal/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id);
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Заявка на вывод не найдена'
      });
    }
    
    // Проверяем принадлежность заявки пользователю
    if (withdrawal.user.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к этой заявке'
      });
    }
    
    // Проверяем можно ли отменить
    if (!['pending', 'on_hold'].includes(withdrawal.status)) {
      return res.status(400).json({
        success: false,
        message: 'Заявку нельзя отменить в текущем статусе',
        currentStatus: withdrawal.status
      });
    }
    
    // Отменяем заявку
    await withdrawal.cancel('Отменено пользователем');
    
    // Возвращаем баллы пользователю
    const user = await User.findById(req.user.userId);
    if (user) {
      user.points += withdrawal.pointsDeducted;
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Заявка отменена, баллы возвращены на счет',
      returnedPoints: withdrawal.pointsDeducted
    });
    
  } catch (error) {
    console.error('Ошибка отмены заявки:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Внутренняя ошибка сервера'
    });
  }
});

// @route GET /api/payments/stats
// @desc Статистика платежей
// @access Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Статистика выводов по статусам
    const withdrawalStats = await WithdrawalRequest.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' },
          avgAmount: { $avg: '$finalAmount' }
        }
      }
    ]);
    
    // Статистика по сетям
    const networkStats = await WithdrawalRequest.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$network',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);
    
    // Статистика по времени
    const monthlyStats = await WithdrawalRequest.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: {
            year: { $year: '$requestedAt' },
            month: { $month: '$requestedAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    // Общая статистика
    const totalWithdrawn = withdrawalStats
      .filter(s => s._id === 'completed')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    
    const totalPending = withdrawalStats
      .filter(s => ['pending', 'processing', 'on_hold'].includes(s._id))
      .reduce((sum, s) => sum + s.totalAmount, 0);
    
    const avgWithdrawal = withdrawalStats
      .filter(s => s._id === 'completed')
      .reduce((sum, s) => sum + s.avgAmount, 0);
    
    const totalRequests = withdrawalStats.reduce((sum, s) => sum + s.count, 0);
    
    res.json({
      success: true,
      user: {
        currentBalance: user.points,
        totalEarned: user.totalEarned,
        canWithdraw: user.points >= (parseInt(process.env.MIN_WITHDRAWAL_POINTS) || 1000)
      },
      withdrawals: {
        total: totalRequests,
        completed: withdrawalStats.find(s => s._id === 'completed')?.count || 0,
        pending: withdrawalStats.filter(s => ['pending', 'processing', 'on_hold'].includes(s._id))
          .reduce((sum, s) => sum + s.count, 0),
        failed: withdrawalStats.find(s => s._id === 'failed')?.count || 0
      },
      amounts: {
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        avgWithdrawal: Math.round(avgWithdrawal * 100) / 100
      },
      byStatus: withdrawalStats,
      byNetwork: networkStats,
      monthly: monthlyStats
    });
    
  } catch (error) {
    console.error('Ошибка получения статистики платежей:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router; 