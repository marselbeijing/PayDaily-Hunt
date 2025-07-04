import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function UnuCreateTask({ onNavigate }) {
  const { user } = useAuth();
  const [tariffs, setTariffs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    descr: '',
    link: '',
    need_for_report: '',
    price: '',
    tarif_id: '',
    folder_id: '',
    need_screen: false,
    anonym_task: false,
    time_for_work: 24,
    time_for_check: 24,
    limit_per_day: '',
    limit_per_hour: '',
    limit_per_user: 1,
    limit_per_ip: 1,
    targeting_gender: '',
    targeting_age_from: '',
    targeting_age_to: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tariffsData, foldersData] = await Promise.all([
        api.unu.tariffs(),
        api.unu.folders()
      ]);
      setTariffs(tariffsData.tariffs || []);
      setFolders(foldersData.folders || []);
      setLoading(false);
    } catch (err) {
      alert('Error loading data');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.descr || !formData.price || !formData.tarif_id) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const taskData = await api.unu.createTask(formData);
      
      if (taskData.task_id) {
        // Устанавливаем начальный лимит
        const limit = prompt('Set initial limit for this task:', '10');
        if (limit && !isNaN(limit)) {
          await api.unu.setTaskLimit(taskData.task_id, parseInt(limit));
        }
        
        alert('Task created successfully!');
        onNavigate('unu-management');
      }
    } catch (err) {
      alert('Error creating task: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-4">Loading create task form...</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <div className="flex items-center mb-4">
        <button onClick={() => onNavigate('profile')} className="mr-3 text-blue-500">← Back</button>
        <h1 className="text-2xl font-bold">Create UNU Task</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-tg-card p-4 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-3">Basic Information</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Task Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
              placeholder="Enter task name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              name="descr"
              value={formData.descr}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg h-24"
              placeholder="Describe what users need to do"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Task URL</label>
            <input
              type="url"
              name="link"
              value={formData.link}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
              placeholder="https://example.com"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Required for Report *</label>
            <textarea
              name="need_for_report"
              value={formData.need_for_report}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg h-20"
              placeholder="What should users provide as proof?"
              required
            />
          </div>
        </div>

        <div className="bg-tg-card p-4 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-3">Payment & Settings</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price (RUB) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tariff *</label>
              <select
                name="tarif_id"
                value={formData.tarif_id}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              >
                <option value="">Select tariff</option>
                {tariffs.map(tariff => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name} (min: {tariff.min_price_rub} RUB)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Folder</label>
            <select
              name="folder_id"
              value={formData.folder_id}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">No folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Work Time (hours)</label>
              <input
                type="number"
                name="time_for_work"
                value={formData.time_for_work}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                min="2"
                max="168"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Check Time (hours)</label>
              <input
                type="number"
                name="time_for_check"
                value={formData.time_for_check}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                min="10"
                max="168"
              />
            </div>
          </div>
        </div>

        <div className="bg-tg-card p-4 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-3">Limits & Targeting</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Daily Limit</label>
              <input
                type="number"
                name="limit_per_day"
                value={formData.limit_per_day}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="No limit"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hourly Limit</label>
              <input
                type="number"
                name="limit_per_hour"
                value={formData.limit_per_hour}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Per User Limit</label>
              <input
                type="number"
                name="limit_per_user"
                value={formData.limit_per_user}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Per IP Limit</label>
              <input
                type="number"
                name="limit_per_ip"
                value={formData.limit_per_ip}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                min="1"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Gender Targeting</label>
            <select
              name="targeting_gender"
              value={formData.targeting_gender}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Any gender</option>
              <option value="1">Female</option>
              <option value="2">Male</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Age From</label>
              <input
                type="number"
                name="targeting_age_from"
                value={formData.targeting_age_from}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                min="18"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Age To</label>
              <input
                type="number"
                name="targeting_age_to"
                value={formData.targeting_age_to}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                min="18"
                max="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="need_screen"
                checked={formData.need_screen}
                onChange={handleInputChange}
                className="mr-2"
              />
              Require screenshot
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="anonym_task"
                checked={formData.anonym_task}
                onChange={handleInputChange}
                className="mr-2"
              />
              Anonymous task
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={creating}
        >
          {creating ? 'Creating Task...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}
