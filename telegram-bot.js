const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Создаем бот
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || '7572098457:AAFPD0pRhovfJsSzFTnaW1SXpgofR6eZSIk', {
    polling: true
});

console.log('🤖 PayDaily Hunt Bot запущен!');
console.log('Токен:', process.env.TELEGRAM_BOT_TOKEN ? 'Загружен из .env' : 'Использован по умолчанию');

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;
    
    const welcomeMessage = `🎉 Добро пожаловать в PayDaily Hunt, ${firstName}!

💰 Зарабатывайте криптовалюту выполняя простые задания!

🚀 Нажмите кнопку ниже, чтобы открыть приложение:`;

    // Создаем инлайн клавиатуру с кнопкой WebApp
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '🚀 Открыть PayDaily Hunt',
                    web_app: {
                        url: 'http://192.168.1.102:3000' // Локальный IP для тестирования
                    }
                }],
                [{
                    text: '📊 Статистика',
                    callback_data: 'stats'
                }, {
                    text: '❓ Помощь',
                    callback_data: 'help'
                }]
            ]
        }
    };

    bot.sendMessage(chatId, welcomeMessage, options);
});

// Команда /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = `❓ Помощь - PayDaily Hunt

🎯 Как это работает:
1️⃣ Нажмите кнопку "Открыть PayDaily Hunt"
2️⃣ Выберите задание из списка
3️⃣ Выполните задание
4️⃣ Получите награду в криптовалюте

💎 Доступные задания:
• Просмотр видео на YouTube
• Подписка на Telegram каналы
• Установка приложений
• Участие в опросах
• И многое другое!

💰 Вывод средств:
• Минимальная сумма: 1000 точек (1 USDT)
• Комиссия: 5%
• Поддерживаемые сети: BSC, Polygon

🆘 Нужна помощь? Напишите @support`;

    bot.sendMessage(chatId, helpMessage);
});

// Команда /stats
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    
    const statsMessage = `📊 Статистика PayDaily Hunt

👥 Пользователей: 1,234
🎯 Выполнено заданий: 5,678
💰 Выплачено: $12,345
⭐ Средний рейтинг: 4.8/5

🔥 Популярные задания:
1. Просмотр видео - 45%
2. Подписки - 30%
3. Приложения - 15%
4. Опросы - 10%

📈 Рост за последние 7 дней: +23%`;

    bot.sendMessage(chatId, statsMessage);
});

// Обработка callback запросов
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;

    // Убираем индикатор загрузки
    bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
        case 'stats':
            bot.sendMessage(chatId, `📊 Ваша статистика:

💰 Баланс: 1,250 точек
🎯 Выполнено заданий: 45
📈 Заработано всего: $15.50
🏆 VIP статус: Бронзовый
🔥 Дневная серия: 7 дней

🚀 Откройте приложение для получения новых заданий!`);
            break;
            
        case 'help':
            bot.sendMessage(chatId, `❓ Быстрая помощь:

🆘 Проблемы с заданиями? Перезагрузите приложение
💰 Не пришла награда? Подождите до 5 минут
🚫 Задание не засчитывается? Проверьте выполнение всех условий
💳 Проблемы с выводом? Проверьте правильность адреса кошелька

📞 Техподдержка: @paydaily_support
💬 Чат пользователей: @paydaily_chat`);
            break;
    }
});

// Обработка ошибок
bot.on('error', (error) => {
    console.error('Ошибка бота:', error);
});

bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка бота...');
    bot.stopPolling();
    process.exit(0);
});

console.log('✅ Бот готов к работе! Попробуйте команду /start в Telegram');
console.log('🔗 Ссылка на бота: https://t.me/YourBotUsername');
console.log('📱 WebApp URL: http://192.168.1.102:3000');
console.log('\n💡 Для production замените localhost на ваш домен!'); 