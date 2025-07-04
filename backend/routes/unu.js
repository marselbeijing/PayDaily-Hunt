const express = require('express');
const unu = require('../services/unuService');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware для проверки авторизации
const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Токен не предоставлен' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
};

// Получить список UNU-заданий
router.get('/tasks', auth, async (req, res) => {
    try {
        const { folder_id, status, offset } = req.query;
        const params = {};
        if (folder_id) params.folder_id = folder_id;
        if (status) params.status = status;
        if (offset) params.offset = offset;
        const data = await unu.getTasks(params);
        res.json({ success: true, tasks: data.tasks || data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить детали UNU-задания
router.get('/tasks/:taskId', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const data = await unu.getTasks({ task_id: taskId });
        if (!data.tasks || !data.tasks.length) return res.status(404).json({ error: 'Задание не найдено' });
        res.json({ success: true, task: data.tasks[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить тарифы UNU
router.get('/tariffs', auth, async (req, res) => {
    try {
        const data = await unu.getTariffs();
        res.json({ success: true, tariffs: data.tariffs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить отчёты по UNU-заданиям (можно фильтровать по task_id)
router.get('/reports', auth, async (req, res) => {
    try {
        const { task_id } = req.query;
        const params = {};
        if (task_id) params.task_id = task_id;
        const data = await unu.getReports(params);
        res.json({ success: true, reports: data.reports || data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Одобрить отчёт по UNU-заданию
router.post('/reports/:reportId/approve', auth, async (req, res) => {
    try {
        const { reportId } = req.params;
        await unu.approveReport(reportId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Отклонить отчёт по UNU-заданию
router.post('/reports/:reportId/reject', auth, async (req, res) => {
    try {
        const { reportId } = req.params;
        const { comment, reject_type } = req.body;
        await unu.rejectReport(reportId, comment, reject_type || 2);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить баланс UNU
router.get('/balance', auth, async (req, res) => {
    try {
        const data = await unu.getBalance();
        res.json({ success: true, balance: data.balance, blocked_money: data.blocked_money });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить расходы UNU (можно фильтровать по task_id, folder_id, дате)
router.get('/expenses', auth, async (req, res) => {
    try {
        const { task_id, folder_id, date_from, date_to } = req.query;
        const params = {};
        if (task_id) params.task_id = task_id;
        if (folder_id) params.folder_id = folder_id;
        if (date_from) params.date_from = date_from;
        if (date_to) params.date_to = date_to;
        const data = await unu.getExpenses(params);
        res.json({ success: true, expenses: data.expenses, expenses_in_rub: data.expenses_in_rub, group_by_days: data.group_by_days });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать UNU-задание
router.post('/tasks', auth, async (req, res) => {
    try {
        const params = req.body;
        const data = await unu.addTask(params);
        res.json({ success: true, task_id: data.task_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Установить лимит выполнений для UNU-задания
router.post('/tasks/:taskId/limit', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { add_to_limit } = req.body;
        await unu.taskLimitAdd(taskId, add_to_limit);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить папки UNU
router.get('/folders', auth, async (req, res) => {
    try {
        const data = await unu.getFolders();
        res.json({ success: true, folders: data.folders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать папку UNU
router.post('/folders', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const data = await unu.createFolder(name);
        res.json({ success: true, folder_id: data.folder_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Удалить папку UNU
router.delete('/folders/:folderId', auth, async (req, res) => {
    try {
        const { folderId } = req.params;
        await unu.delFolder(folderId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Переместить задание в папку
router.post('/tasks/:taskId/move', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { folder_id } = req.body;
        await unu.moveTask(taskId, folder_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 