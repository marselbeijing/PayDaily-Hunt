const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');

const router = express.Router();

// Получить доступные офферы от партнеров
router.get('/offers', async (req, res) => {
    try {
        const { country = 'US', platform = 'mobile' } = req.query;
        
        const offers = [];
        
        // AdGem офферы
        if (process.env.ADGEM_API_KEY) {
            try {
                const adgemOffers = await getAdgemOffers(country, platform);
                offers.push(...adgemOffers);
            } catch (error) {
                console.error('Ошибка получения AdGem офферов:', error);
            }
        }
        
        // CPALead офферы
        if (process.env.CPALEAD_API_KEY) {
            try {
                const cpaleadOffers = await getCPALeadOffers(country, platform);
                offers.push(...cpaleadOffers);
            } catch (error) {
                console.error('Ошибка получения CPALead офферов:', error);
            }
        }
        
        // AdGate Media офферы
        if (process.env.ADGATE_API_KEY) {
            try {
                const adgateOffers = await getAdGateOffers(country, platform);
                offers.push(...adgateOffers);
            } catch (error) {
                console.error('Ошибка получения AdGate офферов:', error);
            }
        }
        
        // Конвертация офферов в формат заданий
        const tasks = offers.map(offer => convertOfferToTask(offer));
        
        res.json({
            success: true,
            offers: tasks,
            total: tasks.length
        });
        
    } catch (error) {
        console.error('Ошибка получения офферов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Отслеживание кликов партнеров
router.post('/track', async (req, res) => {
    try {
        const { 
            userId, 
            offerId, 
            partner, 
            clickId, 
            userAgent, 
            ip 
        } = req.body;
        
        // Создать запись отслеживания
        const trackingData = {
            userId,
            offerId,
            partner,
            clickId,
            userAgent,
            ip,
            timestamp: new Date()
        };
        
        // Сохранить в базе данных для аналитики
        // await TrackingEvent.create(trackingData);
        
        // Отправить данные партнеру
        let trackingUrl = '';
        
        switch (partner) {
            case 'adgem':
                trackingUrl = `https://adgem.com/api/track?click_id=${clickId}&offer_id=${offerId}`;
                break;
            case 'cpalead':
                trackingUrl = `https://cpalead.com/api/track?click_id=${clickId}&offer_id=${offerId}`;
                break;
            case 'adgate':
                trackingUrl = `https://adgatemedia.com/api/track?click_id=${clickId}&offer_id=${offerId}`;
                break;
        }
        
        if (trackingUrl) {
            await axios.post(trackingUrl, trackingData);
        }
        
        res.json({
            success: true,
            tracked: true
        });
        
    } catch (error) {
        console.error('Ошибка отслеживания:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Webhook для получения конверсий от партнеров
router.post('/callback/:partner', async (req, res) => {
    try {
        const { partner } = req.params;
        const callbackData = req.body;
        
        let completionId, status, rewardAmount;
        
        // Обработка разных форматов callback'ов
        switch (partner) {
            case 'adgem':
                completionId = callbackData.click_id;
                status = callbackData.status === 'approved' ? 'approved' : 'rejected';
                rewardAmount = parseFloat(callbackData.payout || 0);
                break;
                
            case 'cpalead':
                completionId = callbackData.subid;
                status = callbackData.status === '1' ? 'approved' : 'rejected';
                rewardAmount = parseFloat(callbackData.payout || 0);
                break;
                
            case 'adgate':
                completionId = callbackData.user_id;
                status = callbackData.status === 'credited' ? 'approved' : 'rejected';
                rewardAmount = parseFloat(callbackData.points || 0);
                break;
                
            default:
                return res.status(400).json({ error: 'Неизвестный партнер' });
        }
        
        // Найти выполнение задания по tracking ID
        const completion = await TaskCompletion.findOne({
            'partnerTracking.clickId': completionId
        }).populate('user task');
        
        if (!completion) {
            return res.status(404).json({ error: 'Выполнение задания не найдено' });
        }
        
        // Обновить статус
        completion.status = status;
        completion.verificationData.method = 'api_callback';
        completion.verificationData.verificationNotes = `Callback от ${partner}`;
        
        if (status === 'approved') {
            completion.completedAt = new Date();
            
            // Начислить награду пользователю
            const user = completion.user;
            user.points += completion.rewardAmount;
            user.totalEarned += completion.rewardAmount;
            user.tasksCompleted += 1;
            user.updateVipLevel();
            
            await user.save();
            
            // Бонус рефереру (если есть)
            if (user.referredBy) {
                const referrer = await User.findById(user.referredBy);
                if (referrer) {
                    const referralBonus = Math.floor(completion.rewardAmount * 0.1); // 10%
                    referrer.points += referralBonus;
                    referrer.referralEarnings += referralBonus;
                    await referrer.save();
                }
            }
        }
        
        await completion.save();
        
        // Отправить уведомление пользователю через Telegram Bot
        if (status === 'approved') {
            // await sendTelegramNotification(completion.user.telegramId, 
            //     `🎉 Задание завершено! Получено ${completion.rewardAmount} баллов.`);
        }
        
        res.json({ success: true, status: 'processed' });
        
    } catch (error) {
        console.error('Ошибка обработки callback:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Синхронизация заданий с партнерами
router.post('/sync', async (req, res) => {
    try {
        const { partner, country = 'US' } = req.body;
        
        let offers = [];
        
        switch (partner) {
            case 'adgem':
                offers = await getAdgemOffers(country);
                break;
            case 'cpalead':
                offers = await getCPALeadOffers(country);
                break;
            case 'adgate':
                offers = await getAdGateOffers(country);
                break;
            default:
                return res.status(400).json({ error: 'Неизвестный партнер' });
        }
        
        let created = 0, updated = 0;
        
        for (const offer of offers) {
            const taskData = convertOfferToTask(offer);
            
            const existingTask = await Task.findOne({
                'partner.trackingId': offer.id,
                'partner.name': partner
            });
            
            if (existingTask) {
                await Task.updateOne({ _id: existingTask._id }, taskData);
                updated++;
            } else {
                await Task.create(taskData);
                created++;
            }
        }
        
        res.json({
            success: true,
            created,
            updated,
            total: offers.length
        });
        
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Функции для работы с различными партнерами

async function getAdgemOffers(country = 'US', platform = 'mobile') {
    try {
        const response = await axios.get('https://adgem.com/api/offers', {
            params: {
                api_key: process.env.ADGEM_API_KEY,
                country,
                platform,
                format: 'json'
            }
        });
        
        return response.data.offers || [];
    } catch (error) {
        console.error('AdGem API error:', error);
        return [];
    }
}

async function getCPALeadOffers(country = 'US', platform = 'mobile') {
    try {
        const response = await axios.get('https://cpalead.com/api/offers', {
            params: {
                api_key: process.env.CPALEAD_API_KEY,
                country,
                platform,
                format: 'json'
            }
        });
        
        return response.data.offers || [];
    } catch (error) {
        console.error('CPALead API error:', error);
        return [];
    }
}

async function getAdGateOffers(country = 'US', platform = 'mobile') {
    try {
        const response = await axios.get('https://adgatemedia.com/api/offers', {
            params: {
                api_key: process.env.ADGATE_API_KEY,
                country,
                platform,
                format: 'json'
            }
        });
        
        return response.data.offers || [];
    } catch (error) {
        console.error('AdGate API error:', error);
        return [];
    }
}

function convertOfferToTask(offer) {
    // Определить тип задания
    let type = 'registration';
    if (offer.name.toLowerCase().includes('video')) type = 'video';
    if (offer.name.toLowerCase().includes('survey')) type = 'survey';
    if (offer.name.toLowerCase().includes('install')) type = 'app_install';
    if (offer.name.toLowerCase().includes('follow') || offer.name.toLowerCase().includes('like')) type = 'social';
    
    // Определить сложность
    let difficulty = 'easy';
    if (offer.payout > 1) difficulty = 'medium';
    if (offer.payout > 5) difficulty = 'hard';
    
    return {
        title: offer.name,
        description: offer.description || offer.name,
        type,
        reward: Math.floor(offer.payout * 100), // Конвертация в баллы
        difficulty,
        estimatedTime: offer.estimated_time || 5,
        actionUrl: offer.url,
        imageUrl: offer.image_url,
        partner: {
            name: offer.partner || 'unknown',
            apiEndpoint: offer.api_endpoint,
            trackingId: offer.id.toString(),
            conversionGoal: offer.conversion_goal
        },
        requirements: {
            countries: offer.countries || ['US'],
            deviceTypes: offer.device_types || ['mobile', 'desktop']
        },
        isActive: true,
        isPremium: offer.payout > 2,
        category: getCategoryFromOffer(offer)
    };
}

function getCategoryFromOffer(offer) {
    const name = offer.name.toLowerCase();
    if (name.includes('crypto') || name.includes('bitcoin')) return 'crypto';
    if (name.includes('game') || name.includes('play')) return 'gaming';
    if (name.includes('shop') || name.includes('buy')) return 'shopping';
    if (name.includes('learn') || name.includes('course')) return 'education';
    if (name.includes('watch') || name.includes('video')) return 'entertainment';
    return 'finance';
}

module.exports = router;