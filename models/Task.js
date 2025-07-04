const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    default: ''
  },
  
  // Тип и категория задания
  type: {
    type: String,
    required: true,
    enum: [
      'video_watch',      // Просмотр видео
      'survey',           // Опрос
      'app_install',      // Установка приложения
      'registration',     // Регистрация на сайте
      'social_follow',    // Подписка в соцсетях
      'crypto_exchange',  // Регистрация на бирже
      'game_play',        // Игра в мини-игру
      'referral',         // Реферальное задание
      'quiz',             // Викторина
      'content_create',   // Создание контента
      'nft_task',         // NFT задание
      'defi_task'         // DeFi задание
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      'entertainment',  // Развлечения
      'education',      // Образование
      'finance',        // Финансы
      'crypto',         // Криптовалюты
      'social',         // Социальные сети
      'gaming',         // Игры
      'surveys',        // Опросы
      'apps',           // Приложения
      'referrals',      // Рефералы
      'special'         // Специальные
    ]
  },
  
  // Награда и условия
  reward: {
    type: Number,
    required: true,
    min: 1
  },
  baseReward: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'points',
    enum: ['points', 'usdt', 'bonus']
  },
  
  // Требования к пользователю
  requirements: {
    minLevel: {
      type: String,
      enum: ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'none'
    },
    minTasksCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    isPremiumOnly: {
      type: Boolean,
      default: false
    },
    isVipOnly: {
      type: Boolean,
      default: false
    },
    regions: [{
      type: String,
      default: []
    }],
    languages: [{
      type: String,
      default: []
    }]
  },
  
  // Лимиты и ограничения
  limits: {
    maxCompletions: {
      type: Number,
      default: -1 // -1 = неограничено
    },
    maxCompletionsPerUser: {
      type: Number,
      default: 1
    },
    maxCompletionsPerDay: {
      type: Number,
      default: -1
    },
    cooldownMinutes: {
      type: Number,
      default: 0
    }
  },
  
  // Статус и время жизни
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'expired'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  
  // Партнерские данные
  partner: {
    name: {
      type: String,
      default: ''
    },
    network: {
      type: String,
      enum: ['cpalead', 'cointraffic', 'custom', 'internal'],
      default: 'internal'
    },
    offerId: {
      type: String,
      default: ''
    },
    payout: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    callbackUrl: {
      type: String,
      default: ''
    },
    trackingParams: {
      type: Map,
      of: String,
      default: {}
    }
  },
  
  // Детали задания
  details: {
    url: {
      type: String,
      default: ''
    },
    videoUrl: {
      type: String,
      default: ''
    },
    videoDuration: {
      type: Number,
      default: 0 // секунды
    },
    appStoreUrl: {
      type: String,
      default: ''
    },
    playStoreUrl: {
      type: String,
      default: ''
    },
    instructions: [{
      step: Number,
      text: String,
      image: String
    }],
    verificationMethod: {
      type: String,
      enum: ['automatic', 'manual', 'screenshot', 'callback', 'time_based'],
      default: 'manual'
    },
    verificationData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Медиа контент
  media: {
    icon: {
      type: String,
      default: ''
    },
    banner: {
      type: String,
      default: ''
    },
    screenshots: [{
      type: String
    }],
    video: {
      type: String,
      default: ''
    }
  },
  
  // Статистика
  stats: {
    totalCompletions: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    totalStarts: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    avgCompletionTime: {
      type: Number,
      default: 0
    },
    totalPayout: {
      type: Number,
      default: 0
    }
  },
  
  // Приоритет и сортировка
  priority: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  trending: {
    type: Boolean,
    default: false
  },
  
  // Теги и поиск
  tags: [{
    type: String,
    trim: true
  }],
  searchKeywords: [{
    type: String,
    trim: true
  }],
  
  // Настройки уведомлений
  notifications: {
    sendToAll: {
      type: Boolean,
      default: false
    },
    sendToVip: {
      type: Boolean,
      default: false
    },
    customMessage: {
      type: String,
      default: ''
    }
  },
  
  // Метаданные
  createdBy: {
    type: String,
    default: 'system'
  },
  updatedBy: {
    type: String,
    default: 'system'
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Индексы для оптимизации
taskSchema.index({ status: 1, startDate: 1, endDate: 1 });
taskSchema.index({ type: 1, category: 1 });
taskSchema.index({ 'requirements.minLevel': 1 });
taskSchema.index({ priority: -1, featured: -1 });
taskSchema.index({ 'partner.network': 1, 'partner.offerId': 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ trending: -1, 'stats.totalViews': -1 });

// Виртуальные поля
taskSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         (!this.endDate || this.endDate >= now);
});

taskSchema.virtual('isExpired').get(function() {
  const now = new Date();
  return this.endDate && this.endDate < now;
});

taskSchema.virtual('completionsLeft').get(function() {
  if (this.limits.maxCompletions === -1) return -1;
  return Math.max(0, this.limits.maxCompletions - this.stats.totalCompletions);
});

// Методы модели
taskSchema.methods.canUserComplete = function(user) {
  // Проверка статуса задания
  if (!this.isActive) {
    return { canComplete: false, reason: 'Задание неактивно' };
  }
  
  // Проверка VIP уровня
  if (this.requirements.minLevel !== 'none') {
    const levelHierarchy = ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const userLevelIndex = levelHierarchy.indexOf(user.vipLevel);
    const requiredLevelIndex = levelHierarchy.indexOf(this.requirements.minLevel);
    
    if (userLevelIndex < requiredLevelIndex) {
      return { 
        canComplete: false, 
        reason: `Требуется VIP уровень ${this.requirements.minLevel}` 
      };
    }
  }
  
  // Проверка количества выполненных заданий
  if (user.tasksCompleted < this.requirements.minTasksCompleted) {
    return { 
      canComplete: false, 
      reason: `Требуется выполнить ${this.requirements.minTasksCompleted} заданий` 
    };
  }
  
  // Проверка Premium статуса
  if (this.requirements.isPremiumOnly && !user.isPremium) {
    return { canComplete: false, reason: 'Только для Telegram Premium' };
  }
  
  // Проверка VIP статуса
  if (this.requirements.isVipOnly && user.vipLevel === 'none') {
    return { canComplete: false, reason: 'Только для VIP пользователей' };
  }
  
  // Проверка лимитов
  if (this.limits.maxCompletions !== -1 && 
      this.stats.totalCompletions >= this.limits.maxCompletions) {
    return { canComplete: false, reason: 'Лимит выполнений исчерпан' };
  }
  
  return { canComplete: true };
};

taskSchema.methods.calculateReward = function(user) {
  let reward = this.baseReward;
  
  // Применяем VIP множитель
  if (user.vipBenefits && user.vipBenefits.bonusMultiplier) {
    reward *= user.vipBenefits.bonusMultiplier;
  }
  
  // Бонус для trending заданий
  if (this.trending) {
    reward *= 1.2;
  }
  
  // Бонус для featured заданий
  if (this.featured) {
    reward *= 1.1;
  }
  
  return Math.floor(reward);
};

taskSchema.methods.updateStats = function(action) {
  switch (action) {
    case 'view':
      this.stats.totalViews += 1;
      break;
    case 'start':
      this.stats.totalStarts += 1;
      break;
    case 'complete':
      this.stats.totalCompletions += 1;
      this.stats.conversionRate = this.stats.totalStarts > 0 
        ? (this.stats.totalCompletions / this.stats.totalStarts) * 100 
        : 0;
      break;
  }
};

// Middleware
taskSchema.pre('save', function(next) {
  // Обновляем trending статус на основе активности
  if (this.stats.totalViews > 100 && this.stats.conversionRate > 20) {
    this.trending = true;
  }
  
  // Проверяем истечение срока
  if (this.endDate && this.endDate < new Date()) {
    this.status = 'expired';
  }
  
  next();
});

module.exports = mongoose.model('Task', taskSchema); 