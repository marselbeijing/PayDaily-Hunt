const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Сумма и валюта
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  amountInPoints: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    required: true,
    enum: ['USDT', 'BTC', 'ETH', 'TRX'],
    default: 'USDT'
  },
  network: {
    type: String,
    required: true,
    enum: ['TRC20', 'ERC20', 'BEP20', 'Bitcoin', 'Ethereum'],
    default: 'TRC20'
  },
  
  // Адрес кошелька
  walletAddress: {
    type: String,
    required: true,
    trim: true
  },
  walletMemo: {
    type: String,
    default: ''
  },
  
  // Статус заявки
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // Комиссии
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionPercent: {
    type: Number,
    default: 5,
    min: 0,
    max: 50
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Блокчейн данные
  blockchain: {
    txHash: {
      type: String,
      default: ''
    },
    blockNumber: {
      type: Number,
      default: 0
    },
    gasUsed: {
      type: Number,
      default: 0
    },
    gasFee: {
      type: Number,
      default: 0
    },
    confirmations: {
      type: Number,
      default: 0
    },
    explorerUrl: {
      type: String,
      default: ''
    }
  },
  
  // Времена обработки
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  estimatedCompletionTime: {
    type: Date,
    default: null
  },
  
  // Проверки и валидация
  validation: {
    addressValid: {
      type: Boolean,
      default: false
    },
    addressCheckedAt: {
      type: Date,
      default: null
    },
    balanceChecked: {
      type: Boolean,
      default: false
    },
    antifraudPassed: {
      type: Boolean,
      default: false
    },
    manualReviewRequired: {
      type: Boolean,
      default: false
    }
  },
  
  // Антифрод проверки
  antifraud: {
    ipAddress: {
      type: String,
      required: true
    },
    deviceFingerprint: {
      type: String,
      default: ''
    },
    location: {
      country: String,
      region: String,
      city: String
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    flags: [{
      type: String,
      reason: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    previousWithdrawals: {
      count: {
        type: Number,
        default: 0
      },
      totalAmount: {
        type: Number,
        default: 0
      },
      lastWithdrawal: {
        type: Date,
        default: null
      }
    }
  },
  
  // Административные данные
  admin: {
    processedBy: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    tags: [{
      type: String
    }]
  },
  
  // Причины отклонения
  rejection: {
    reason: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    },
    rejectedBy: {
      type: String,
      default: ''
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    canRetry: {
      type: Boolean,
      default: true
    }
  },
  
  // Уведомления
  notifications: {
    userNotified: {
      type: Boolean,
      default: false
    },
    notificationsSent: [{
      type: {
        type: String,
        enum: ['email', 'telegram', 'push']
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      successful: {
        type: Boolean,
        default: false
      }
    }]
  },
  
  // Связанные документы
  references: {
    originalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WithdrawalRequest',
      default: null
    },
    retryOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WithdrawalRequest',
      default: null
    },
    batchId: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

// Индексы
withdrawalRequestSchema.index({ user: 1, status: 1, createdAt: -1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });
withdrawalRequestSchema.index({ walletAddress: 1 });
withdrawalRequestSchema.index({ 'blockchain.txHash': 1 });
withdrawalRequestSchema.index({ 'antifraud.ipAddress': 1, createdAt: -1 });
withdrawalRequestSchema.index({ 'admin.priority': 1, status: 1 });
withdrawalRequestSchema.index({ currency: 1, network: 1 });

// Виртуальные поля
withdrawalRequestSchema.virtual('processingTime').get(function() {
  if (this.completedAt && this.requestedAt) {
    return Math.floor((this.completedAt - this.requestedAt) / (1000 * 60)); // минуты
  }
  return 0;
});

withdrawalRequestSchema.virtual('isExpired').get(function() {
  const now = new Date();
  const expirationTime = new Date(this.requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 дней
  return now > expirationTime && this.status === 'pending';
});

withdrawalRequestSchema.virtual('canCancel').get(function() {
  return ['pending', 'processing'].includes(this.status);
});

// Методы модели
withdrawalRequestSchema.methods.calculateCommission = function() {
  this.commission = Math.floor(this.amount * (this.commissionPercent / 100));
  this.netAmount = this.amount - this.commission;
  return this.commission;
};

withdrawalRequestSchema.methods.validateWalletAddress = function() {
  // Базовая валидация адресов кошельков
  const validators = {
    TRC20: (address) => /^T[A-Za-z1-9]{33}$/.test(address),
    ERC20: (address) => /^0x[a-fA-F0-9]{40}$/.test(address),
    BEP20: (address) => /^0x[a-fA-F0-9]{40}$/.test(address),
    Bitcoin: (address) => /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address)
  };
  
  const validator = validators[this.network];
  this.validation.addressValid = validator ? validator(this.walletAddress) : false;
  this.validation.addressCheckedAt = new Date();
  
  return this.validation.addressValid;
};

withdrawalRequestSchema.methods.calculateRiskScore = function(user) {
  let riskScore = 0;
  
  // Новый пользователь
  if (user.tasksCompleted < 10) riskScore += 20;
  if (user.registrationDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) riskScore += 30;
  
  // Большая сумма для нового пользователя
  if (this.amount > 100 && user.totalEarned < 500) riskScore += 40;
  
  // Частые выводы
  if (this.antifraud.previousWithdrawals.count > 5) {
    const daysSinceLastWithdrawal = this.antifraud.previousWithdrawals.lastWithdrawal
      ? (Date.now() - this.antifraud.previousWithdrawals.lastWithdrawal.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    
    if (daysSinceLastWithdrawal < 1) riskScore += 50;
    else if (daysSinceLastWithdrawal < 7) riskScore += 25;
  }
  
  // Подозрительная активность пользователя
  if (user.suspiciousActivity) riskScore += 60;
  
  // Недействительный адрес кошелька
  if (!this.validation.addressValid) riskScore += 30;
  
  this.antifraud.riskScore = Math.min(100, riskScore);
  
  // Требуется ручная проверка при высоком риске
  if (this.antifraud.riskScore >= 50) {
    this.validation.manualReviewRequired = true;
  }
  
  return this.antifraud.riskScore;
};

withdrawalRequestSchema.methods.approve = function(adminId) {
  this.status = 'processing';
  this.processedAt = new Date();
  this.admin.processedBy = adminId;
  this.validation.antifraudPassed = true;
  
  // Устанавливаем приблизительное время завершения
  this.estimatedCompletionTime = new Date(Date.now() + 30 * 60 * 1000); // 30 минут
};

withdrawalRequestSchema.methods.reject = function(reason, adminId, canRetry = false) {
  this.status = 'rejected';
  this.rejection.reason = reason;
  this.rejection.rejectedBy = adminId;
  this.rejection.rejectedAt = new Date();
  this.rejection.canRetry = canRetry;
  this.processedAt = new Date();
};

withdrawalRequestSchema.methods.complete = function(txHash, blockNumber = 0) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.blockchain.txHash = txHash;
  this.blockchain.blockNumber = blockNumber;
  
  // Генерируем URL для просмотра транзакции
  if (this.network === 'TRC20') {
    this.blockchain.explorerUrl = `https://tronscan.org/#/transaction/${txHash}`;
  } else if (this.network === 'ERC20') {
    this.blockchain.explorerUrl = `https://etherscan.io/tx/${txHash}`;
  }
};

withdrawalRequestSchema.methods.cancel = function(reason = 'Отменено пользователем') {
  if (!this.canCancel) {
    throw new Error('Невозможно отменить заявку в текущем статусе');
  }
  
  this.status = 'cancelled';
  this.rejection.reason = reason;
  this.rejection.rejectedAt = new Date();
  this.processedAt = new Date();
};

// Middleware
withdrawalRequestSchema.pre('save', function(next) {
  // Рассчитываем комиссию если не рассчитана
  if (this.commission === 0 && this.amount > 0) {
    this.calculateCommission();
  }
  
  // Валидируем адрес кошелька при создании
  if (this.isNew && !this.validation.addressCheckedAt) {
    this.validateWalletAddress();
  }
  
  next();
});

// Статические методы
withdrawalRequestSchema.statics.getWithdrawalStats = function(timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalCommission: { $sum: '$commission' }
      }
    }
  ]);
};

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema); 