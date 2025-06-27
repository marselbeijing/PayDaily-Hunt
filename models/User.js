const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    default: ''
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  languageCode: {
    type: String,
    default: 'en'
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  
  // Баланс и кошелек
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  },
  cryptoWallet: {
    type: String,
    default: ''
  },
  
  // VIP система
  vipLevel: {
    type: String,
    enum: ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'none'
  },
  vipPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  vipBenefits: {
    bonusMultiplier: {
      type: Number,
      default: 1.0
    },
    dailyBonus: {
      type: Number,
      default: 10
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    exclusiveTasks: {
      type: Boolean,
      default: false
    }
  },
  
  // Активность и статистика
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastCheckIn: {
    type: Date,
    default: null
  },
  checkInStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  maxCheckInStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  tasksCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  tasksCompletedToday: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Реферальная система
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referrals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dateReferred: {
      type: Date,
      default: Date.now
    },
    totalEarned: {
      type: Number,
      default: 0
    }
  }],
  referralEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Настройки и предпочтения
  settings: {
    notifications: {
      newTasks: {
        type: Boolean,
        default: true
      },
      payouts: {
        type: Boolean,
        default: true
      },
      promotions: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      default: 'ru'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Безопасность и антифрод
  ipAddress: {
    type: String,
    default: ''
  },
  deviceFingerprint: {
    type: String,
    default: ''
  },
  suspiciousActivity: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: ''
  },
  
  // Достижения и NFT
  achievements: [{
    type: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    dateEarned: {
      type: Date,
      default: Date.now
    },
    nftTokenId: String
  }],
  
  // Метаданные
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
userSchema.index({ referralCode: 1 });
userSchema.index({ vipLevel: 1, vipPoints: -1 });
userSchema.index({ balance: -1 });
userSchema.index({ tasksCompleted: -1 });
userSchema.index({ registrationDate: -1 });

// Методы для работы с VIP уровнями
userSchema.methods.updateVipLevel = function() {
  const vipLevels = {
    diamond: 100000,
    platinum: 50000,
    gold: 15000,
    silver: 5000,
    bronze: 1000,
    none: 0
  };
  
  let newLevel = 'none';
  for (const [level, requiredPoints] of Object.entries(vipLevels)) {
    if (this.vipPoints >= requiredPoints) {
      newLevel = level;
      break;
    }
  }
  
  if (this.vipLevel !== newLevel) {
    this.vipLevel = newLevel;
    this.updateVipBenefits();
    return true; // Уровень изменился
  }
  
  return false;
};

userSchema.methods.updateVipBenefits = function() {
  const benefits = {
    none: { bonusMultiplier: 1.0, dailyBonus: 10, prioritySupport: false, exclusiveTasks: false },
    bronze: { bonusMultiplier: 1.1, dailyBonus: 15, prioritySupport: false, exclusiveTasks: false },
    silver: { bonusMultiplier: 1.2, dailyBonus: 25, prioritySupport: false, exclusiveTasks: true },
    gold: { bonusMultiplier: 1.3, dailyBonus: 40, prioritySupport: true, exclusiveTasks: true },
    platinum: { bonusMultiplier: 1.5, dailyBonus: 60, prioritySupport: true, exclusiveTasks: true },
    diamond: { bonusMultiplier: 2.0, dailyBonus: 100, prioritySupport: true, exclusiveTasks: true }
  };
  
  this.vipBenefits = benefits[this.vipLevel] || benefits.none;
};

// Метод для генерации реферального кода
userSchema.methods.generateReferralCode = function() {
  if (!this.referralCode) {
    this.referralCode = `REF${this.telegramId}${Date.now().toString(36).toUpperCase()}`;
  }
  return this.referralCode;
};

// Метод для ежедневного чек-ина
userSchema.methods.performDailyCheckIn = function() {
  const now = new Date();
  const lastCheckIn = this.lastCheckIn;
  
  // Проверяем, был ли уже чек-ин сегодня
  if (lastCheckIn && 
      lastCheckIn.toDateString() === now.toDateString()) {
    return { success: false, message: 'Уже выполнен чек-ин сегодня' };
  }
  
  // Проверяем, продолжается ли streak
  let isStreak = false;
  if (lastCheckIn) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    isStreak = lastCheckIn.toDateString() === yesterday.toDateString();
  }
  
  // Обновляем streak
  if (isStreak) {
    this.checkInStreak += 1;
  } else {
    this.checkInStreak = 1;
  }
  
  if (this.checkInStreak > this.maxCheckInStreak) {
    this.maxCheckInStreak = this.checkInStreak;
  }
  
  // Вычисляем бонус
  let bonus = this.vipBenefits.dailyBonus;
  
  // Streak бонусы
  if (this.checkInStreak >= 7) bonus *= 1.5;
  if (this.checkInStreak >= 30) bonus *= 2;
  
  // Добавляем баланс
  this.balance += Math.floor(bonus);
  this.totalEarned += Math.floor(bonus);
  this.lastCheckIn = now;
  
  return {
    success: true,
    bonus: Math.floor(bonus),
    streak: this.checkInStreak,
    message: `Получено ${Math.floor(bonus)} баллов! Streak: ${this.checkInStreak} дней`
  };
};

// Middleware для обновления lastUpdated
userSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema); 