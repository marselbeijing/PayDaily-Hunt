const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

// Middleware для проверки авторизации
const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Токен не предоставлен' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
};

// Модель для заявок на вывод
const WithdrawalRequest = require('../models/WithdrawalRequest');

// Получить минимальную сумму для вывода
router.get('/min-amount', (req, res) => {
    res.json({
        success: true,
        minAmount: {
            points: 1000, // минимум 1000 баллов
            usdt: 1.0    // эквивалент 1 USDT
        },
        conversionRate: 1000, // 1000 баллов = 1 USDT
        fee: {
            percentage: 5, // 5% комиссия
            minimum: 0.1  // минимум 0.1 USDT
        }
    });
});

// Запросить вывод средств
router.post('/withdraw', auth, async (req, res) => {
    try {
        const { amount, walletAddress, currency = 'USDT' } = req.body;
        const user = req.user;
        
        // Валидация
        if (!amount || amount < 1000) {
            return res.status(400).json({ 
                error: 'Минимальная сумма для вывода: 1000 баллов' 
            });
        }
        
        if (!walletAddress) {
            return res.status(400).json({ 
                error: 'Укажите адрес кошелька' 
            });
        }
        
        if (user.points < amount) {
            return res.status(400).json({ 
                error: 'Недостаточно баллов для вывода' 
            });
        }
        
        // Проверить лимиты
        const dailyWithdrawals = await WithdrawalRequest.aggregate([
            {
                $match: {
                    user: user._id,
                    createdAt: {
                        $gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        
        const dailyTotal = dailyWithdrawals[0]?.total || 0;
        const dailyLimit = 10000; // 10000 баллов в день
        
        if (dailyTotal + amount > dailyLimit) {
            return res.status(400).json({ 
                error: `Превышен дневной лимит на вывод (${dailyLimit} баллов)` 
            });
        }
        
        // Расчет комиссии
        const conversionRate = 1000; // 1000 баллов = 1 USDT
        const usdtAmount = amount / conversionRate;
        const feePercentage = 0.05; // 5%
        const fee = Math.max(usdtAmount * feePercentage, 0.1); // минимум 0.1 USDT
        const finalAmount = usdtAmount - fee;
        
        if (finalAmount <= 0) {
            return res.status(400).json({ 
                error: 'Сумма после вычета комиссии должна быть больше 0' 
            });
        }
        
        // Создать заявку на вывод
        const withdrawalRequest = new WithdrawalRequest({
            user: user._id,
            amount: amount,
            currency: currency,
            walletAddress: walletAddress,
            usdtAmount: usdtAmount,
            fee: fee,
            finalAmount: finalAmount,
            status: 'pending',
            requestId: generateRequestId()
        });
        
        await withdrawalRequest.save();
        
        // Заморозить баллы
        user.points -= amount;
        user.wallet.balance = user.points;
        await user.save();
        
        res.json({
            success: true,
            withdrawal: {
                id: withdrawalRequest.requestId,
                amount: amount,
                usdtAmount: usdtAmount,
                fee: fee,
                finalAmount: finalAmount,
                status: 'pending',
                estimatedTime: '1-3 рабочих дня'
            }
        });
        
    } catch (error) {
        console.error('Ошибка запроса вывода:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить историю выводов
router.get('/history', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const user = req.user;
        
        const filter = { user: user._id };
        if (status) filter.status = status;
        
        const skip = (page - 1) * limit;
        
        const withdrawals = await WithdrawalRequest.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .select('-user');
        
        const total = await WithdrawalRequest.countDocuments(filter);
        
        res.json({
            success: true,
            withdrawals,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения истории выводов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить статус заявки на вывод
router.get('/withdraw/:requestId', auth, async (req, res) => {
    try {
        const { requestId } = req.params;
        const user = req.user;
        
        const withdrawal = await WithdrawalRequest.findOne({
            requestId: requestId,
            user: user._id
        });
        
        if (!withdrawal) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }
        
        res.json({
            success: true,
            withdrawal
        });
        
    } catch (error) {
        console.error('Ошибка получения статуса вывода:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Отменить заявку на вывод (только pending)
router.delete('/withdraw/:requestId', auth, async (req, res) => {
    try {
        const { requestId } = req.params;
        const user = req.user;
        
        const withdrawal = await WithdrawalRequest.findOne({
            requestId: requestId,
            user: user._id,
            status: 'pending'
        });
        
        if (!withdrawal) {
            return res.status(404).json({ 
                error: 'Заявка не найдена или не может быть отменена' 
            });
        }
        
        // Вернуть баллы пользователю
        user.points += withdrawal.amount;
        user.wallet.balance = user.points;
        await user.save();
        
        // Обновить статус заявки
        withdrawal.status = 'cancelled';
        withdrawal.cancelledAt = new Date();
        await withdrawal.save();
        
        res.json({
            success: true,
            message: 'Заявка на вывод отменена, баллы возвращены'
        });
        
    } catch (error) {
        console.error('Ошибка отмены вывода:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Webhook для обновления статуса платежей (для администраторов)
router.post('/webhook/update', async (req, res) => {
    try {
        const { requestId, status, txHash, error } = req.body;
        
        // Проверка подписи webhook (в production)
        // const signature = req.headers['x-signature'];
        // if (!verifyWebhookSignature(req.body, signature)) {
        //     return res.status(401).json({ error: 'Недействительная подпись' });
        // }
        
        const withdrawal = await WithdrawalRequest.findOne({ requestId });
        
        if (!withdrawal) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }
        
        const oldStatus = withdrawal.status;
        withdrawal.status = status;
        
        if (status === 'completed') {
            withdrawal.completedAt = new Date();
            withdrawal.txHash = txHash;
            
            // Обновить статистику пользователя
            const user = await User.findById(withdrawal.user);
            if (user) {
                user.wallet.totalWithdrawn += withdrawal.finalAmount;
                await user.save();
            }
            
        } else if (status === 'failed') {
            withdrawal.error = error;
            withdrawal.failedAt = new Date();
            
            // Вернуть баллы пользователю
            const user = await User.findById(withdrawal.user);
            if (user) {
                user.points += withdrawal.amount;
                user.wallet.balance = user.points;
                await user.save();
            }
        }
        
        await withdrawal.save();
        
        // Отправить уведомление пользователю
        // await sendTelegramNotification(withdrawal.user.telegramId, 
        //     getWithdrawalStatusMessage(status, withdrawal));
        
        res.json({ success: true, status: 'updated' });
        
    } catch (error) {
        console.error('Ошибка обновления статуса платежа:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить поддерживаемые валюты
router.get('/currencies', (req, res) => {
    res.json({
        success: true,
        currencies: [
            {
                code: 'USDT',
                name: 'Tether USD',
                network: 'TRC20',
                minWithdraw: 1.0,
                fee: 0.1,
                decimals: 2
            }
        ]
    });
});

// Валидация адреса кошелька
router.post('/validate-address', (req, res) => {
    try {
        const { address, currency = 'USDT' } = req.body;
        
        if (!address) {
            return res.status(400).json({ error: 'Адрес не указан' });
        }
        
        let isValid = false;
        
        // Валидация USDT TRC20 адреса
        if (currency === 'USDT') {
            // Простая проверка для TRC20 адресов (начинается с T, длина 34 символа)
            isValid = /^T[A-Za-z0-9]{33}$/.test(address);
        }
        
        res.json({
            success: true,
            valid: isValid,
            currency,
            network: currency === 'USDT' ? 'TRC20' : 'unknown'
        });
        
    } catch (error) {
        console.error('Ошибка валидации адреса:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Утилиты
function generateRequestId() {
    return 'WD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function getWithdrawalStatusMessage(status, withdrawal) {
    switch (status) {
        case 'completed':
            return `✅ Вывод завершен!\n💰 Сумма: ${withdrawal.finalAmount} USDT\n🏦 TxHash: ${withdrawal.txHash}`;
        case 'failed':
            return `❌ Вывод не удался\n💰 Сумма: ${withdrawal.finalAmount} USDT\n🔄 Баллы возвращены на счет`;
        case 'processing':
            return `⏳ Вывод обрабатывается\n💰 Сумма: ${withdrawal.finalAmount} USDT`;
        default:
            return `📋 Статус вывода изменен: ${status}`;
    }
}

module.exports = router;