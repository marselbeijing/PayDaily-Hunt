const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1000 // минимум 1000 баллов
    },
    currency: {
        type: String,
        required: true,
        enum: ['USDT', 'BTC', 'ETH'],
        default: 'USDT'
    },
    walletAddress: {
        type: String,
        required: true
    },
    network: {
        type: String,
        default: 'TRC20'
    },
    
    // Расчеты
    conversionRate: {
        type: Number,
        default: 1000 // 1000 баллов = 1 USDT
    },
    usdtAmount: {
        type: Number,
        required: true
    },
    fee: {
        type: Number,
        required: true
    },
    finalAmount: {
        type: Number,
        required: true
    },
    
    // Статус
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    
    // Blockchain данные
    txHash: String,
    blockNumber: Number,
    confirmations: {
        type: Number,
        default: 0
    },
    
    // Временные метки
    submittedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    cancelledAt: Date,
    
    // Администрирование
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adminNotes: String,
    
    // Ошибки
    error: String,
    errorCode: String,
    
    // Безопасность
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    
    // Дополнительная информация
    metadata: {
        estimatedTime: String,
        priority: {
            type: String,
            enum: ['low', 'normal', 'high'],
            default: 'normal'
        },
        source: String // web, mobile, api
    }
}, {
    timestamps: true
});

// Индексы
withdrawalRequestSchema.index({ user: 1, status: 1 });
withdrawalRequestSchema.index({ requestId: 1 }, { unique: true });
withdrawalRequestSchema.index({ status: 1, submittedAt: -1 });
withdrawalRequestSchema.index({ txHash: 1 });

// Виртуальные поля
withdrawalRequestSchema.virtual('isPending').get(function() {
    return this.status === 'pending';
});

withdrawalRequestSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed';
});

withdrawalRequestSchema.virtual('canCancel').get(function() {
    return ['pending'].includes(this.status);
});

withdrawalRequestSchema.virtual('processingTime').get(function() {
    if (!this.completedAt) return null;
    return this.completedAt - this.submittedAt;
});

// Методы
withdrawalRequestSchema.methods.cancel = function(reason) {
    if (!this.canCancel) {
        throw new Error('Заявка не может быть отменена');
    }
    
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.adminNotes = reason;
    
    return this.save();
};

withdrawalRequestSchema.methods.markAsProcessing = function(processedBy) {
    this.status = 'processing';
    this.processedAt = new Date();
    this.processedBy = processedBy;
    
    return this.save();
};

withdrawalRequestSchema.methods.markAsCompleted = function(txHash, blockNumber) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.txHash = txHash;
    this.blockNumber = blockNumber;
    
    return this.save();
};

withdrawalRequestSchema.methods.markAsFailed = function(error, errorCode) {
    this.status = 'failed';
    this.failedAt = new Date();
    this.error = error;
    this.errorCode = errorCode;
    
    return this.save();
};

// Статические методы
withdrawalRequestSchema.statics.getPendingRequests = function() {
    return this.find({ status: 'pending' })
        .populate('user', 'displayName telegramId')
        .sort({ submittedAt: 1 });
};

withdrawalRequestSchema.statics.getUserWithdrawals = function(userId, options = {}) {
    const { status, limit = 20, page = 1 } = options;
    const filter = { user: userId };
    
    if (status) filter.status = status;
    
    return this.find(filter)
        .sort({ submittedAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
};

withdrawalRequestSchema.statics.getDailyStats = function(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.aggregate([
        {
            $match: {
                submittedAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                totalUSDT: { $sum: '$finalAmount' }
            }
        }
    ]);
};

withdrawalRequestSchema.statics.getWithdrawalLimits = function(userId, period = 'day') {
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'day':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
        default:
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
    }
    
    return this.aggregate([
        {
            $match: {
                user: userId,
                submittedAt: { $gte: startDate },
                status: { $in: ['pending', 'processing', 'completed'] }
            }
        },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                totalUSDT: { $sum: '$finalAmount' },
                count: { $sum: 1 }
            }
        }
    ]);
};

// Pre-save middleware
withdrawalRequestSchema.pre('save', function(next) {
    // Автоматический расчет финальной суммы
    if (this.isModified('amount') || this.isModified('fee')) {
        this.usdtAmount = this.amount / this.conversionRate;
        this.finalAmount = this.usdtAmount - this.fee;
    }
    
    // Установка приоритета на основе суммы
    if (this.isNew) {
        if (this.finalAmount >= 100) {
            this.metadata.priority = 'high';
        } else if (this.finalAmount >= 10) {
            this.metadata.priority = 'normal';
        } else {
            this.metadata.priority = 'low';
        }
    }
    
    next();
});

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema); 