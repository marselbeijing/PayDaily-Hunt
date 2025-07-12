// Тестовый файл для проверки реферальной системы
// Запуск: node test-referral-system.js

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Тестовые данные
const testUsers = [
    {
        telegramId: '123456789',
        username: 'test_user_1',
        firstName: 'Test',
        lastName: 'User 1'
    },
    {
        telegramId: '987654321',
        username: 'test_user_2',
        firstName: 'Test',
        lastName: 'User 2'
    }
];

// Функция для создания тестового пользователя
async function createTestUser(userData) {
    try {
        const initData = `user=${JSON.stringify(userData)}&auth_date=${Date.now()}&hash=test_hash`;
        
        const response = await axios.post(`${API_BASE_URL}/auth/telegram`, {
            initData,
            referralCode: null
        });
        
        console.log(`✅ Пользователь ${userData.username} создан:`, response.data.user.referralCode);
        return response.data.token;
    } catch (error) {
        console.error(`❌ Ошибка создания пользователя ${userData.username}:`, error.response?.data || error.message);
        return null;
    }
}

// Функция для создания реферала
async function createReferral(userData, referralCode, token) {
    try {
        const initData = `user=${JSON.stringify(userData)}&auth_date=${Date.now()}&hash=test_hash`;
        
        const response = await axios.post(`${API_BASE_URL}/auth/telegram`, {
            initData,
            referralCode
        });
        
        console.log(`✅ Реферал ${userData.username} создан с кодом ${referralCode}`);
        return response.data.token;
    } catch (error) {
        console.error(`❌ Ошибка создания реферала ${userData.username}:`, error.response?.data || error.message);
        return null;
    }
}

// Функция для получения профиля пользователя
async function getProfile(token) {
    try {
        const response = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        return response.data.user;
    } catch (error) {
        console.error('❌ Ошибка получения профиля:', error.response?.data || error.message);
        return null;
    }
}

// Функция для получения рефералов
async function getReferrals(token) {
    try {
        const response = await axios.get(`${API_BASE_URL}/users/referrals`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        return response.data;
    } catch (error) {
        console.error('❌ Ошибка получения рефералов:', error.response?.data || error.message);
        return null;
    }
}

// Основная функция тестирования
async function testReferralSystem() {
    console.log('🚀 Начинаем тестирование реферальной системы...\n');
    
    // 1. Создаем первого пользователя (реферера)
    console.log('📝 Шаг 1: Создание реферера');
    const referrerToken = await createTestUser(testUsers[0]);
    if (!referrerToken) {
        console.log('❌ Не удалось создать реферера, прерываем тест');
        return;
    }
    
    // 2. Получаем профиль реферера
    console.log('\n📊 Шаг 2: Получение профиля реферера');
    const referrerProfile = await getProfile(referrerToken);
    if (!referrerProfile) {
        console.log('❌ Не удалось получить профиль реферера');
        return;
    }
    
    console.log('📋 Профиль реферера:');
    console.log(`   - Реферальный код: ${referrerProfile.referralCode}`);
    console.log(`   - Количество рефералов: ${referrerProfile.referrals || 0}`);
    console.log(`   - Заработок с рефералов: ${referrerProfile.referralEarnings || 0}`);
    
    // 3. Получаем рефералы реферера
    console.log('\n👥 Шаг 3: Получение рефералов реферера');
    const referralsData = await getReferrals(referrerToken);
    if (!referralsData) {
        console.log('❌ Не удалось получить рефералы');
        return;
    }
    
    console.log('📊 Статистика рефералов:');
    console.log(`   - Всего рефералов: ${referralsData.stats.totalReferrals}`);
    console.log(`   - Активных рефералов: ${referralsData.stats.activeReferrals}`);
    console.log(`   - Заработано: ${referralsData.stats.totalEarnings}`);
    
    // 4. Создаем реферала
    console.log('\n👤 Шаг 4: Создание реферала');
    const referralToken = await createReferral(testUsers[1], referrerProfile.referralCode, referrerToken);
    if (!referralToken) {
        console.log('❌ Не удалось создать реферала');
        return;
    }
    
    // 5. Проверяем обновленную статистику реферера
    console.log('\n🔄 Шаг 5: Проверка обновленной статистики');
    const updatedReferralsData = await getReferrals(referrerToken);
    if (updatedReferralsData) {
        console.log('📊 Обновленная статистика рефералов:');
        console.log(`   - Всего рефералов: ${updatedReferralsData.stats.totalReferrals}`);
        console.log(`   - Активных рефералов: ${updatedReferralsData.stats.activeReferrals}`);
        console.log(`   - Заработано: ${updatedReferralsData.stats.totalEarnings}`);
        
        if (updatedReferralsData.referrals.length > 0) {
            console.log('👥 Список рефералов:');
            updatedReferralsData.referrals.forEach((referral, index) => {
                console.log(`   ${index + 1}. ${referral.displayName} - Заданий: ${referral.tasksCompleted}, Баллы: ${referral.points}`);
            });
        }
    }
    
    // 6. Проверяем профиль реферала
    console.log('\n👤 Шаг 6: Проверка профиля реферала');
    const referralProfile = await getProfile(referralToken);
    if (referralProfile) {
        console.log('📋 Профиль реферала:');
        console.log(`   - Реферальный код: ${referralProfile.referralCode}`);
        console.log(`   - Приглашен пользователем: ${referralProfile.referredBy ? 'Да' : 'Нет'}`);
        console.log(`   - Баллы: ${referralProfile.points}`);
    }
    
    console.log('\n✅ Тестирование реферальной системы завершено!');
}

// Запуск теста
if (require.main === module) {
    testReferralSystem().catch(console.error);
}

module.exports = {
    testReferralSystem,
    createTestUser,
    createReferral,
    getProfile,
    getReferrals
};