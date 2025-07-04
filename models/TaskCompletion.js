const mongoose = require('mongoose');

const taskCompletionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  
  // Статус выполнения
  status: {
    type: String,
    enum: ['started', 'pending', 'completed', 'rejected', 'cancelled'],
    default: 'started'
  },
  
  // Награда и пейаут
  reward: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'points',
    enum: ['points', 'usdt', 'bonus']
  },
  partnerPayout: {
    type: Number,
    default: 0
  },
  
  // Время выполнения
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  
  // Данные для верификации
  verification: {
    method: {
      type: String,
      enum: ['automatic', 'manual', 'screenshot', 'callback', 'time_based'],
      default: 'manual'
    },
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    screenshots: [{
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    proofText: {
      type: String,
      default: ''
    },
    autoVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Партнерские данные
  partner: {
    network: {
      type: String,
      enum: ['cpalead', 'adgate', 'cointraffic', 'custom', 'internal'],
      default: 'internal'
    },
    offerId: {
      type: String,
      default: ''
    },
    transactionId: {
      type: String,
      default: ''
    },
    clickId: {
      type: String,
      default: ''
    },
    postbackReceived: {
      type: Boolean,
      default: false
    },
    postbackData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Антифрод данные
  antifraud: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      default: ''
    },
    deviceFingerprint: {
      type: String,
      default: ''
    },
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    fraudulent: {
      type: Boolean,
      default: false
    },
    fraudReason: {
      type: String,
      default: ''
    }
  },
  
  // Временные метрики
  metrics: {
    timeSpent: {
      type: Number,
      default: 0 // секунды
    },
    attempts: {
      type: Number,
      default: 1
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    completionSpeed: {
      type: String,
      enum: ['very_fast', 'fast', 'normal', 'slow', 'very_slow'],
      default: 'normal'
    }
  },
  
  // Комментарии и заметки
  userComment: {
    type: String,
    default: ''
  },
  adminNotes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  
  // Реферальные данные
  referral: {
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    commission: {
      type: Number,
      default: 0
    },
    commissionPaid: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Составные индексы
taskCompletionSchema.index({ user: 1, task: 1 }, { unique: true });
taskCompletionSchema.index({ user: 1, status: 1, createdAt: -1 });
taskCompletionSchema.index({ task: 1, status: 1 });
taskCompletionSchema.index({ status: 1, createdAt: -1 });
taskCompletionSchema.index({ 'partner.network': 1, 'partner.transactionId': 1 });
taskCompletionSchema.index({ 'antifraud.ipAddress': 1, createdAt: -1 });
taskCompletionSchema.index({ 'antifraud.fraudulent': 1 });

// Виртуальные поля
taskCompletionSchema.virtual('completionTime').get(function() {
  if (this.completedAt && this.startedAt) {
    return Math.floor((this.completedAt - this.startedAt) / 1000); // секунды
  }
  return 0;
});

taskCompletionSchema.virtual('isPending').get(function() {
  return this.status === 'pending' || this.status === 'started';
});

taskCompletionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Методы модели
taskCompletionSchema.methods.calculateRiskScore = function() {
  let riskScore = 0;
  
  // Скорость выполнения
  const completionTime = this.completionTime;
  if (completionTime < 10) riskScore += 30; // Слишком быстро
  if (completionTime < 5) riskScore += 50;  // Подозрительно быстро
  
  // Количество попыток
  if (this.metrics.attempts > 3) riskScore += 20;
  if (this.metrics.attempts > 5) riskScore += 30;
  
  // Проверка IP адреса (базовая)
  if (!this.antifraud.ipAddress) riskScore += 40;
  
  // Отсутствие данных устройства
  if (!this.antifraud.deviceFingerprint) riskScore += 20;
  
  this.antifraud.riskScore = Math.min(100, riskScore);
  
  // Отмечаем как мошенническое если риск слишком высок
  if (this.antifraud.riskScore >= 70) {
    this.antifraud.fraudulent = true;
    this.antifraud.fraudReason = 'Высокий риск мошенничества';
  }
  
  return this.antifraud.riskScore;
};

taskCompletionSchema.methods.markCompleted = function(adminId = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.verifiedAt = new Date();
  
  if (adminId) {
    this.adminNotes = `Проверено администратором ${adminId}`;
  }
  
  // Рассчитываем скорость выполнения
  const completionTime = this.completionTime;
  if (completionTime < 30) this.metrics.completionSpeed = 'very_fast';
  else if (completionTime < 120) this.metrics.completionSpeed = 'fast';
  else if (completionTime < 600) this.metrics.completionSpeed = 'normal';
  else if (completionTime < 1800) this.metrics.completionSpeed = 'slow';
  else this.metrics.completionSpeed = 'very_slow';
  
  this.metrics.timeSpent = completionTime;
};

taskCompletionSchema.methods.markRejected = function(reason, adminId = null) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  this.verifiedAt = new Date();
  
  if (adminId) {
    this.adminNotes = `Отклонено администратором ${adminId}: ${reason}`;
  }
};

taskCompletionSchema.methods.processPostback = function(postbackData) {
  this.partner.postbackReceived = true;
  this.partner.postbackData = postbackData;
  
  // Автоматическое завершение при получении постбэка
  if (this.verification.method === 'callback' && this.status === 'pending') {
    this.verification.autoVerified = true;
    this.markCompleted();
  }
};

// Middleware
taskCompletionSchema.pre('save', function(next) {
  // Обновляем время последней активности
  this.metrics.lastActivity = new Date();
  
  // Рассчитываем риск-скор если не рассчитан
  if (this.antifraud.riskScore === 0 && this.status !== 'started') {
    this.calculateRiskScore();
  }
  
  next();
});

// Статические методы
taskCompletionSchema.statics.getCompletionStats = function(userId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCompletions: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        rejectedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        totalEarned: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$reward', 0] }
        },
        avgCompletionTime: { $avg: '$metrics.timeSpent' }
      }
    }
  ]);
};

module.exports = mongoose.model('TaskCompletion', taskCompletionSchema); 