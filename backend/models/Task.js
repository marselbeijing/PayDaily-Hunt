const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['video', 'survey', 'registration', 'social', 'app_install', 'visit_site', 'quiz'],
        required: true
    },
    // Настройки задания
    reward: {
        type: Number,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    estimatedTime: {
        type: Number, // в минутах
        default: 5
    },
    // Партнерские настройки
    partner: {
        name: String,
        apiEndpoint: String,
        trackingId: String,
        conversionGoal: String
    },
    // URL и контент
    actionUrl: {
        type: String,
        required: true
    },
    imageUrl: String,
    iconUrl: String,
    
    // Требования
    requirements: {
        minLevel: { type: Number, default: 1 },
        vipLevelRequired: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
            default: 'bronze'
        },
        countries: [String], // ISO коды стран
        languages: [String], // ISO коды языков
        deviceTypes: [String] // mobile, desktop, tablet
    },
    
    // Лимиты
    limits: {
        daily: { type: Number, default: 1 },
        total: { type: Number, default: 1 },
        globalDaily: { type: Number, default: 1000 }
    },
    
    // Статистика
    stats: {
        totalCompletions: { type: Number, default: 0 },
        todayCompletions: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 }
    },
    
    // Статус и видимость
    isActive: {
        type: Boolean,
        default: true
    },
    isSponsored: {
        type: Boolean,
        default: false
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    
    // Планирование
    scheduledStart: Date,
    scheduledEnd: Date,
    
    // Дополнительные настройки для социальных заданий
    socialConfig: {
        platform: {
            type: String,
            enum: ['telegram', 'twitter', 'youtube', 'instagram', 'tiktok']
        },
        action: {
            type: String,
            enum: ['subscribe', 'like', 'share', 'comment', 'follow', 'join']
        },
        targetUrl: String,
        verificationMethod: {
            type: String,
            enum: ['manual', 'api', 'screenshot'],
            default: 'manual'
        }
    },
    
    // Теги для категоризации
    tags: [String],
    category: {
        type: String,
        enum: ['crypto', 'gaming', 'shopping', 'education', 'entertainment', 'finance'],
        default: 'crypto'
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Индексы
taskSchema.index({ type: 1, isActive: 1 });
taskSchema.index({ 'requirements.minLevel': 1 });
taskSchema.index({ reward: -1 });
taskSchema.index({ category: 1 });
taskSchema.index({ isSponsored: 1, isPremium: 1 });

// Виртуальные поля
taskSchema.virtual('isAvailable').get(function() {
    const now = new Date();
    if (this.scheduledStart && now < this.scheduledStart) return false;
    if (this.scheduledEnd && now > this.scheduledEnd) return false;
    return this.isActive;
});

// Методы
taskSchema.methods.canUserComplete = function(user) {
    if (!this.isAvailable) return false;
    if (user.level < this.requirements.minLevel) return false;
    
    const vipLevels = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const requiredIndex = vipLevels.indexOf(this.requirements.vipLevelRequired);
    const userIndex = vipLevels.indexOf(user.vipLevel);
    
    return userIndex >= requiredIndex;
};

taskSchema.methods.getRewardForUser = function(user) {
    let reward = this.reward;
    
    // Бонус за VIP статус
    const vipMultipliers = {
        bronze: 1,
        silver: 1.1,
        gold: 1.2,
        platinum: 1.3,
        diamond: 1.5
    };
    
    reward *= vipMultipliers[user.vipLevel] || 1;
    
    // Премиум задания дают больше наград
    if (this.isPremium) {
        reward *= 1.5;
    }
    
    return Math.floor(reward);
};

module.exports = mongoose.model('Task', taskSchema); 