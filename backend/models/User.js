const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true
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
        default: 'ru'
    },
    // Игровая система
    points: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    // VIP статус
    vipLevel: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
        default: 'bronze'
    },
    // Календарь активности
    dailyStreak: {
        type: Number,
        default: 0
    },
    lastCheckIn: {
        type: Date,
        default: null
    },
    // Реферальная система
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referralEarnings: {
        type: Number,
        default: 0
    },
    referrals: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        totalEarned: {
            type: Number,
            default: 0
        },
        tasksCompleted: {
            type: Number,
            default: 0
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Статистика
    tasksCompleted: {
        type: Number,
        default: 0
    },
    socialTasksCompleted: {
        type: Number,
        default: 0
    },
    // Безопасность
    ipAddress: String,
    registrationDate: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    // Настройки уведомлений
    notifications: {
        dailyTasks: { type: Boolean, default: true },
        newTasks: { type: Boolean, default: true },
        bonuses: { type: Boolean, default: true }
    },
    // Кошелек
    wallet: {
        balance: { type: Number, default: 0 },
        totalWithdrawn: { type: Number, default: 0 },
        usdtAddress: { type: String, default: '' }
    }
}, {
    timestamps: true
});

// Индексы для оптимизации
userSchema.index({ telegramId: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ points: -1 });
userSchema.index({ level: -1 });

// Виртуальные поля
userSchema.virtual('displayName').get(function() {
    return this.firstName || this.username || `User${this.telegramId}`;
});

// Методы
userSchema.methods.generateReferralCode = function() {
    return `PDH${this.telegramId.slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
};

userSchema.methods.canCheckIn = function() {
    if (!this.lastCheckIn) return true;
    const today = new Date();
    const lastCheckIn = new Date(this.lastCheckIn);
    return today.toDateString() !== lastCheckIn.toDateString();
};

userSchema.methods.updateVipLevel = function() {
    if (this.points >= 100000) this.vipLevel = 'diamond';
    else if (this.points >= 50000) this.vipLevel = 'platinum';
    else if (this.points >= 20000) this.vipLevel = 'gold';
    else if (this.points >= 5000) this.vipLevel = 'silver';
    else this.vipLevel = 'bronze';
};

module.exports = mongoose.model('User', userSchema); 