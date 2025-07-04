const axios = require('axios');

const UNU_API_URL = 'https://unu.im/api';
const UNU_API_KEY = process.env.UNU_API_KEY;

console.log('🔑 UNU_API_KEY loaded:', UNU_API_KEY ? 'YES' : 'NO');
console.log('🔑 UNU_API_KEY length:', UNU_API_KEY?.length || 0);

async function unuRequest(action, params = {}) {
    try {
        console.log(`🚀 UNU API request: ${action}`, params);
        
        // Формируем данные для POST запроса в формате form-urlencoded
        const postData = new URLSearchParams();
        postData.append('api_key', UNU_API_KEY);
        postData.append('action', action);
        
        // Добавляем дополнительные параметры
        for (const [key, value] of Object.entries(params)) {
            postData.append(key, value);
        }
        
        console.log('📤 POST data:', postData.toString());
        
        const response = await axios.post(UNU_API_URL, postData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 30000
        });
        
        console.log(`✅ UNU API response: ${action}`, response.data);
        
        if (response.data.success !== 1 && response.data.success !== true) {
            throw new Error(response.data.errors || 'Unknown UNU API error');
        }
        return response.data;
    } catch (err) {
        console.error(`❌ UNU API error: ${action}`, err.response?.data || err.message);
        throw new Error(err.response?.data?.errors || err.message);
    }
}

module.exports = {
    getBalance: () => unuRequest('get_balance'),
    getTasks: (params = {}) => unuRequest('get_tasks', params),
    addTask: (params) => unuRequest('add_task', params),
    getReports: (params = {}) => unuRequest('get_reports', params),
    approveReport: (report_id) => unuRequest('approve_report', { report_id }),
    rejectReport: (report_id, comment, reject_type = 2) => unuRequest('reject_report', { report_id, comment, reject_type }),
    getTariffs: () => unuRequest('get_tariffs'),
    taskLimitAdd: (task_id, add_to_limit) => unuRequest('task_limit_add', { task_id, add_to_limit }),
    getExpenses: (params = {}) => unuRequest('get_expenses', params),
    getFolders: () => unuRequest('get_folders'),
    createFolder: (name) => unuRequest('create_folder', { name }),
    delFolder: (folder_id) => unuRequest('del_folder', { folder_id }),
    moveTask: (task_id, folder_id) => unuRequest('move_task', { task_id, folder_id }),
};
