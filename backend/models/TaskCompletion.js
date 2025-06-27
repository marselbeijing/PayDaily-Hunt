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
    status: {
        type: String,
        enum: ['started', 'submitted', 'verified', 'approved', 'rejected'],
        default: 'started'
    },
    
    // Данные выполнения
    startedAt: {
        type: Date,
        default: Date.now
    },
    submittedAt: Date,
    completedAt: Date,
    
    // Награда и статистика
    rewardAmount: {
        type: Number,
        required: true
    },
    bonusMultiplier: {
        type: Number,
        default: 1
    },
    
    // Верификация
    verificationData: {
        method: {
            type: String,
            enum: ['automatic', 'manual', 'api_callback', 'screenshot'],
            default: 'automatic'
        },
        proof: String, // URL скриншота или другие доказательства
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verificationNotes: String
    },
    
    // Партнерское отслеживание
    partnerTracking: {
        clickId: String,
        conversionId: String,
        subId: String,
        ip: String,
        userAgent: String,
        referrer: String
    },
    
    // Антифрод проверки
    fraudCheck: {
        ipHash: String,
        deviceFingerprint: String,
        suspicious: { type: Boolean, default: false },
        riskScore: { type: Number, default: 0 },
        flags: [String]
    },
    
    // Рейтинг и отзыв
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: String,
    
    // Дополнительные данные
    metadata: {
        timeSpent: Number, // в секундах
        attempts: { type: Number, default: 1 },
        source: String // откуда пришел пользователь
    }
}, {
    timestamps: true
});

// Индексы
taskCompletionSchema.index({ user: 1, task: 1 }, { unique: true });
taskCompletionSchema.index({ user: 1, status: 1 });
taskCompletionSchema.index({ task: 1, status: 1 });
taskCompletionSchema.index({ completedAt: -1 });
taskCompletionSchema.index({ 'partnerTracking.clickId': 1 });

// Виртуальные поля
taskCompletionSchema.virtual('isCompleted').get(function() {
    return this.status === 'approved';
});

taskCompletionSchema.virtual('isPending').get(function() {
    return ['started', 'submitted', 'verified'].includes(this.status);
});

// Методы
taskCompletionSchema.methods.approve = function() {
    this.status = 'approved';
    this.completedAt = new Date();
    return this.save();
};

taskCompletionSchema.methods.reject = function(reason) {
    this.status = 'rejected';
    this.verificationData.verificationNotes = reason;
    return this.save();
};

taskCompletionSchema.methods.calculateFinalReward = function() {
    return Math.floor(this.rewardAmount * this.bonusMultiplier);
};

// Статические методы
taskCompletionSchema.statics.getUserCompletionCount = function(userId, period = 'today') {
    const query = { user: userId, status: 'approved' };
    
    if (period === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query.completedAt = { $gte: today };
    } else if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query.completedAt = { $gte: weekAgo };
    }
    
    return this.countDocuments(query);
};

taskCompletionSchema.statics.getTopUsers = function(limit = 10, period = 'week') {
    const matchStage = { status: 'approved' };
    
    if (period === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        matchStage.completedAt = { $gte: today };
    } else if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchStage.completedAt = { $gte: weekAgo };
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$user',
                totalReward: { $sum: '$rewardAmount' },
                completionCount: { $sum: 1 }
            }
        },
        { $sort: { totalReward: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' }
    ]);
};

module.exports = mongoose.model('TaskCompletion', taskCompletionSchema); 