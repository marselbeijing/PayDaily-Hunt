const axios = require('axios');

const UNU_API_URL = 'https://unu.im/api';
const UNU_API_KEY = process.env.UNU_API_KEY || 'ke0e3b9qsaa9s2n5um8v0wxethaygjagnhbwebk3bi4uf92o0di3t04lpvrjpr4r';

console.log('🔑 UNU_API_KEY loaded:', UNU_API_KEY ? 'YES' : 'NO');
console.log('🔑 UNU_API_KEY length:', UNU_API_KEY?.length || 0);

async function unuRequest(action, params = {}) {
    try {
        console.log(`🚀 UNU API request: ${action}`, params);
        const { data } = await axios.post(UNU_API_URL, {
            api_key: UNU_API_KEY,
            action,
            ...params
        });
        console.log(`✅ UNU API response: ${action}`, data);
        if (data.success !== 1) {
            throw new Error(data.errors || 'Unknown UNU API error');
        }
        return data;
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
    // Можно добавить остальные методы по мере необходимости
}; 