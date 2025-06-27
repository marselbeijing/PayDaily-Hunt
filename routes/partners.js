const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');
const router = express.Router();

// Middleware для проверки JWT токена (только для внутренних эндпоинтов)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }
  
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Middleware для проверки webhook подписи
const verifyWebhookSignature = (provider) => {
  return (req, res, next) => {
    const signature = req.headers['x-signature'] || req.headers['signature'];
    const payload = JSON.stringify(req.body);
    
    let expectedSignature = '';
    
    switch (provider) {
      case 'adgem':
        expectedSignature = crypto
          .createHmac('sha256', process.env.ADGEM_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');
        break;
      case 'cpalead':
        expectedSignature = crypto
          .createHash('md5')
          .update(payload + process.env.CPALEAD_WEBHOOK_SECRET)
          .digest('hex');
        break;
      case 'adgate':
        expectedSignature = crypto
          .createHmac('sha1', process.env.ADGATE_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');
        break;
      default:
        return res.status(400).json({ success: false, message: 'Неизвестный провайдер' });
    }
    
    if (signature !== expectedSignature) {
      console.log('Неверная подпись webhook:', { provider, signature, expectedSignature });
      return res.status(401).json({ success: false, message: 'Неверная подпись' });
    }
    
    next();
  };
};

// @route GET /api/partners/offers
// @desc Синхронизация офферов с партнерскими API
// @access Private (Admin only)
router.get('/offers/sync', authenticateToken, async (req, res) => {
  try {
    const syncResults = {
      adgem: { success: 0, errors: 0 },
      cpalead: { success: 0, errors: 0 },
      adgate: { success: 0, errors: 0 },
      cointraffic: { success: 0, errors: 0 }
    };
    
    // Синхронизация с AdGem
    try {
      const adgemOffers = await syncAdGemOffers();
      syncResults.adgem.success = adgemOffers.length;
    } catch (error) {
      console.error('Ошибка синхронизации AdGem:', error);
      syncResults.adgem.errors = 1;
    }
    
    // Синхронизация с CPALead
    try {
      const cpaleadOffers = await syncCPALeadOffers();
      syncResults.cpalead.success = cpaleadOffers.length;
    } catch (error) {
      console.error('Ошибка синхронизации CPALead:', error);
      syncResults.cpalead.errors = 1;
    }
    
    // Синхронизация с AdGate Media
    try {
      const adgateOffers = await syncAdGateOffers();
      syncResults.adgate.success = adgateOffers.length;
    } catch (error) {
      console.error('Ошибка синхронизации AdGate:', error);
      syncResults.adgate.errors = 1;
    }
    
    // Синхронизация с CoinTraffic
    try {
      const cointrafficOffers = await syncCoinTrafficOffers();
      syncResults.cointraffic.success = cointrafficOffers.length;
    } catch (error) {
      console.error('Ошибка синхронизации CoinTraffic:', error);
      syncResults.cointraffic.errors = 1;
    }
    
    res.json({
      success: true,
      message: 'Синхронизация завершена',
      results: syncResults
    });
    
  } catch (error) {
    console.error('Ошибка синхронизации офферов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Функции синхронизации с партнерскими API

async function syncAdGemOffers() {
  const response = await axios.get('https://api.adgem.com/v1/offers', {
    headers: {
      'Authorization': `Bearer ${process.env.ADGEM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    params: {
      app_id: process.env.ADGEM_APP_ID,
      country: 'ALL',
      limit: 100
    }
  });
  
  const offers = response.data.data || [];
  const syncedOffers = [];
  
  for (const offer of offers) {
    try {
      let task = await Task.findOne({
        'partner.apiProvider': 'adgem',
        'partner.externalId': offer.id.toString()
      });
      
      const taskData = {
        title: offer.name,
        description: offer.description || offer.name,
        shortDescription: offer.name.substring(0, 100),
        type: mapAdGemType(offer.category),
        partner: {
          name: 'AdGem',
          logo: offer.icon_url,
          apiProvider: 'adgem',
          offerId: offer.id.toString(),
          externalId: offer.id.toString()
        },
        points: Math.round(offer.payout * 1000), // конвертируем $ в баллы
        originalPoints: Math.round(offer.payout * 1000),
        requirements: {
          countries: offer.countries || [],
          minAge: 18,
          deviceTypes: offer.device_types || ['mobile', 'desktop']
        },
        limits: {
          maxCompletionsPerUser: 1
        },
        estimatedTime: offer.estimated_time || 10,
        instructions: offer.instructions ? [offer.instructions] : [],
        actionUrl: offer.click_url,
        category: mapAdGemCategory(offer.category),
        difficulty: 'easy',
        status: offer.status === 'active' ? 'active' : 'paused',
        tracking: {
          autoVerify: true,
          verificationDelay: 5
        }
      };
      
      if (task) {
        Object.assign(task, taskData);
        await task.save();
      } else {
        task = new Task(taskData);
        await task.save();
      }
      
      syncedOffers.push(task);
    } catch (error) {
      console.error('Ошибка синхронизации оффера AdGem:', offer.id, error);
    }
  }
  
  return syncedOffers;
}

async function syncCPALeadOffers() {
  const response = await axios.get('https://api.cpalead.com/v1/offers.json', {
    params: {
      api_key: process.env.CPALEAD_API_KEY,
      app_id: process.env.CPALEAD_APP_ID,
      format: 'json'
    }
  });
  
  const offers = response.data.offers || [];
  const syncedOffers = [];
  
  for (const offer of offers) {
    try {
      let task = await Task.findOne({
        'partner.apiProvider': 'cpalead',
        'partner.externalId': offer.id.toString()
      });
      
      const taskData = {
        title: offer.name,
        description: offer.description || offer.name,
        shortDescription: offer.name.substring(0, 100),
        type: mapCPALeadType(offer.type),
        partner: {
          name: 'CPALead',
          logo: offer.image,
          apiProvider: 'cpalead',
          offerId: offer.id.toString(),
          externalId: offer.id.toString()
        },
        points: Math.round((offer.payout || 1) * 1000),
        originalPoints: Math.round((offer.payout || 1) * 1000),
        requirements: {
          countries: offer.countries || [],
          minAge: 18
        },
        limits: {
          maxCompletionsPerUser: 1
        },
        estimatedTime: 15,
        actionUrl: offer.link,
        category: mapCPALeadCategory(offer.type),
        difficulty: 'medium',
        status: 'active',
        tracking: {
          autoVerify: false,
          verificationDelay: 10
        }
      };
      
      if (task) {
        Object.assign(task, taskData);
        await task.save();
      } else {
        task = new Task(taskData);
        await task.save();
      }
      
      syncedOffers.push(task);
    } catch (error) {
      console.error('Ошибка синхронизации оффера CPALead:', offer.id, error);
    }
  }
  
  return syncedOffers;
}

async function syncAdGateOffers() {
  const response = await axios.get('https://api.adgatemedia.com/v1/offers', {
    headers: {
      'Authorization': `Bearer ${process.env.ADGATE_API_KEY}`
    },
    params: {
      wall_code: process.env.ADGATE_WALL_ID,
      user_id: 'sync_user',
      format: 'json'
    }
  });
  
  const offers = response.data.offers || [];
  const syncedOffers = [];
  
  for (const offer of offers) {
    try {
      let task = await Task.findOne({
        'partner.apiProvider': 'adgate',
        'partner.externalId': offer.id.toString()
      });
      
      const taskData = {
        title: offer.name,
        description: offer.description || offer.name,
        shortDescription: offer.name.substring(0, 100),
        type: mapAdGateType(offer.category),
        partner: {
          name: 'AdGate Media',
          logo: offer.icon,
          apiProvider: 'adgate',
          offerId: offer.id.toString(),
          externalId: offer.id.toString()
        },
        points: Math.round(offer.points),
        originalPoints: Math.round(offer.points),
        requirements: {
          countries: offer.requirements?.countries || [],
          minAge: offer.requirements?.min_age || 18
        },
        limits: {
          maxCompletionsPerUser: 1
        },
        estimatedTime: offer.time_to_complete || 20,
        instructions: offer.instructions ? [offer.instructions] : [],
        actionUrl: offer.link,
        category: mapAdGateCategory(offer.category),
        difficulty: 'medium',
        status: 'active',
        tracking: {
          autoVerify: false,
          verificationDelay: 15
        }
      };
      
      if (task) {
        Object.assign(task, taskData);
        await task.save();
      } else {
        task = new Task(taskData);
        await task.save();
      }
      
      syncedOffers.push(task);
    } catch (error) {
      console.error('Ошибка синхронизации оффера AdGate:', offer.id, error);
    }
  }
  
  return syncedOffers;
}

async function syncCoinTrafficOffers() {
  const response = await axios.get('https://cointraffic.com/api/offers', {
    headers: {
      'X-API-Key': process.env.COINTRAFFIC_API_KEY
    }
  });
  
  const offers = response.data.offers || [];
  const syncedOffers = [];
  
  for (const offer of offers) {
    try {
      let task = await Task.findOne({
        'partner.apiProvider': 'cointraffic',
        'partner.externalId': offer.id.toString()
      });
      
      const taskData = {
        title: offer.title,
        description: offer.description || offer.title,
        shortDescription: offer.title.substring(0, 100),
        type: 'crypto_signup',
        partner: {
          name: 'CoinTraffic',
          logo: offer.logo,
          apiProvider: 'cointraffic',
          offerId: offer.id.toString(),
          externalId: offer.id.toString()
        },
        points: Math.round(offer.reward * 1000),
        originalPoints: Math.round(offer.reward * 1000),
        requirements: {
          countries: offer.geo || [],
          minAge: 18
        },
        limits: {
          maxCompletionsPerUser: 1
        },
        estimatedTime: 30,
        instructions: offer.instructions ? [offer.instructions] : [],
        actionUrl: offer.url,
        category: 'crypto',
        difficulty: 'medium',
        status: offer.active ? 'active' : 'paused',
        tracking: {
          autoVerify: false,
          verificationDelay: 30
        }
      };
      
      if (task) {
        Object.assign(task, taskData);
        await task.save();
      } else {
        task = new Task(taskData);
        await task.save();
      }
      
      syncedOffers.push(task);
    } catch (error) {
      console.error('Ошибка синхронизации оффера CoinTraffic:', offer.id, error);
    }
  }
  
  return syncedOffers;
}

// Вспомогательные функции для маппинга категорий
function mapAdGemType(category) {
  const typeMap = {
    'survey': 'survey',
    'download': 'app_install',
    'signup': 'registration',
    'video': 'video',
    'social': 'social_media'
  };
  return typeMap[category] || 'registration';
}

function mapAdGemCategory(category) {
  const categoryMap = {
    'entertainment': 'entertainment',
    'finance': 'finance',
    'gaming': 'gaming',
    'social': 'social',
    'shopping': 'shopping'
  };
  return categoryMap[category] || 'entertainment';
}

function mapCPALeadType(type) {
  const typeMap = {
    'survey': 'survey',
    'download': 'app_install',
    'email_submit': 'registration',
    'video': 'video'
  };
  return typeMap[type] || 'registration';
}

function mapCPALeadCategory(type) {
  const categoryMap = {
    'survey': 'education',
    'download': 'gaming',
    'email_submit': 'finance',
    'video': 'entertainment'
  };
  return categoryMap[type] || 'entertainment';
}

function mapAdGateType(category) {
  const typeMap = {
    'survey': 'survey',
    'download': 'app_install',
    'registration': 'registration',
    'video': 'video'
  };
  return typeMap[category] || 'registration';
}

function mapAdGateCategory(category) {
  const categoryMap = {
    'survey': 'education',
    'download': 'gaming',
    'registration': 'finance',
    'video': 'entertainment'
  };
  return categoryMap[category] || 'entertainment';
}

// Webhook endpoints для получения конверсий

// @route POST /api/partners/webhook/adgem
// @desc Webhook для получения конверсий AdGem
// @access Public (с проверкой подписи)
router.post('/webhook/adgem', verifyWebhookSignature('adgem'), async (req, res) => {
  try {
    const { user_id, offer_id, payout, status, transaction_id } = req.body;
    
    if (status !== 'completed') {
      return res.json({ success: true, message: 'Статус не завершен' });
    }
    
    // Находим соответствующее выполнение задания
    const completion = await TaskCompletion.findOne({
      'partnerData.subId': user_id,
      'partnerData.transactionId': transaction_id
    }).populate('task user');
    
    if (!completion) {
      console.error('Выполнение задания не найдено для AdGem webhook:', req.body);
      return res.status(404).json({ success: false, message: 'Выполнение не найдено' });
    }
    
    // Обновляем партнерские данные
    completion.partnerData.postback = {
      url: req.url,
      status: 'received',
      response: JSON.stringify(req.body),
      receivedAt: new Date()
    };
    
    // Верифицируем задание
    if (completion.status === 'pending_verification' || completion.status === 'submitted') {
      await completion.verify();
    }
    
    res.json({ success: true, message: 'Конверсия обработана' });
    
  } catch (error) {
    console.error('Ошибка обработки AdGem webhook:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// @route POST /api/partners/webhook/cpalead
// @desc Webhook для получения конверсий CPALead
// @access Public (с проверкой подписи)
router.post('/webhook/cpalead', verifyWebhookSignature('cpalead'), async (req, res) => {
  try {
    const { subid, offerid, amount, status } = req.body;
    
    if (status !== '1') {
      return res.json({ success: true, message: 'Статус не одобрен' });
    }
    
    const completion = await TaskCompletion.findOne({
      'partnerData.subId': subid
    }).populate('task user');
    
    if (!completion) {
      console.error('Выполнение задания не найдено для CPALead webhook:', req.body);
      return res.status(404).json({ success: false, message: 'Выполнение не найдено' });
    }
    
    completion.partnerData.postback = {
      url: req.url,
      status: 'received',
      response: JSON.stringify(req.body),
      receivedAt: new Date()
    };
    
    if (completion.status === 'pending_verification' || completion.status === 'submitted') {
      await completion.verify();
    }
    
    res.json({ success: true, message: 'Конверсия обработана' });
    
  } catch (error) {
    console.error('Ошибка обработки CPALead webhook:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// @route POST /api/partners/webhook/adgate
// @desc Webhook для получения конверсий AdGate
// @access Public (с проверкой подписи)
router.post('/webhook/adgate', verifyWebhookSignature('adgate'), async (req, res) => {
  try {
    const { user_id, offer_id, points, status } = req.body;
    
    if (status !== 'completed') {
      return res.json({ success: true, message: 'Статус не завершен' });
    }
    
    const completion = await TaskCompletion.findOne({
      'partnerData.subId': user_id
    }).populate('task user');
    
    if (!completion) {
      console.error('Выполнение задания не найдено для AdGate webhook:', req.body);
      return res.status(404).json({ success: false, message: 'Выполнение не найдено' });
    }
    
    completion.partnerData.postback = {
      url: req.url,
      status: 'received',
      response: JSON.stringify(req.body),
      receivedAt: new Date()
    };
    
    if (completion.status === 'pending_verification' || completion.status === 'submitted') {
      await completion.verify();
    }
    
    res.json({ success: true, message: 'Конверсия обработана' });
    
  } catch (error) {
    console.error('Ошибка обработки AdGate webhook:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// @route GET /api/partners/stats
// @desc Статистика по партнерским программам
// @access Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const partnerStats = await Task.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$partner.apiProvider',
          totalOffers: { $sum: 1 },
          totalPoints: { $sum: '$points' },
          avgPoints: { $avg: '$points' },
          categories: { $addToSet: '$category' }
        }
      },
      { $sort: { totalOffers: -1 } }
    ]);
    
    // Статистика конверсий по партнерам
    const conversionStats = await TaskCompletion.aggregate([
      { $match: { status: 'verified' } },
      {
        $lookup: {
          from: 'tasks',
          localField: 'task',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      {
        $group: {
          _id: '$taskInfo.partner.apiProvider',
          totalConversions: { $sum: 1 },
          totalPayout: { $sum: '$pointsEarned' },
          avgPayout: { $avg: '$pointsEarned' }
        }
      }
    ]);
    
    // Объединяем статистику
    const combinedStats = partnerStats.map(partner => {
      const conversion = conversionStats.find(c => c._id === partner._id) || {
        totalConversions: 0,
        totalPayout: 0,
        avgPayout: 0
      };
      
      return {
        provider: partner._id,
        offers: partner.totalOffers,
        totalPoints: partner.totalPoints,
        avgPoints: Math.round(partner.avgPoints),
        categories: partner.categories,
        conversions: conversion.totalConversions,
        totalPayout: conversion.totalPayout,
        avgPayout: Math.round(conversion.avgPayout),
        conversionRate: partner.totalOffers > 0 ? 
          Math.round((conversion.totalConversions / partner.totalOffers) * 100) : 0
      };
    });
    
    res.json({
      success: true,
      stats: combinedStats,
      summary: {
        totalProviders: partnerStats.length,
        totalOffers: partnerStats.reduce((sum, p) => sum + p.totalOffers, 0),
        totalConversions: conversionStats.reduce((sum, c) => sum + c.totalConversions, 0)
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения статистики партнеров:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router; 