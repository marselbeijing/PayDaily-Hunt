import React, { useEffect, useState } from 'react';
import { api, formatPriceInUsd } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function UnuManagement({ onNavigate }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, reportsData, foldersData] = await Promise.all([
        api.unu.tasks(),
        api.unu.reports(),
        api.unu.folders()
      ]);
      setTasks(tasksData.tasks || []);
      setReports(reportsData.reports || []);
      setFolders(foldersData.folders || []);
      setLoading(false);
    } catch (err) {
      setError('Error loading UNU data');
      setLoading(false);
    }
  };

  const handleSetLimit = async (taskId) => {
    const limit = prompt('Enter additional limit for this task:');
    if (!limit || isNaN(limit)) return;

    try {
      await api.unu.setTaskLimit(taskId, parseInt(limit));
      alert('Task limit updated successfully');
      loadData();
    } catch (err) {
      alert('Error updating task limit');
    }
  };

  const handleApproveReport = async (reportId) => {
    try {
      await api.unu.approveReport(reportId);
      alert('Report approved successfully');
      loadData();
    } catch (err) {
      alert('Error approving report');
    }
  };

  const handleRejectReport = async (reportId) => {
    const comment = prompt('Enter rejection reason:');
    if (!comment) return;

    try {
      await api.unu.rejectReport(reportId, comment, 2);
      alert('Report rejected successfully');
      loadData();
    } catch (err) {
      alert('Error rejecting report');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 4: return 'text-green-500';
      case 3: return 'text-red-500';
      case 6: return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 4: return 'Active';
      case 3: return 'Stopped';
      case 6: return 'Under Review';
      default: return 'Inactive';
    }
  };

  const getReportStatusText = (status) => {
    switch (status) {
      case 1: return 'Approved';
      case 2: return 'Pending';
      case 3: return 'Rejected';
      default: return 'Unknown';
    }
  };

  if (loading) return <div className="p-4">Loading UNU management...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 pt-2 pb-20">
      <div className="flex items-center mb-4">
        <button onClick={() => onNavigate('profile')} className="mr-3 text-blue-500">← Back</button>
        <h1 className="text-2xl font-bold">UNU Management</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">My UNU Tasks</h2>
        {tasks.length === 0 ? (
          <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm">
            No UNU tasks found
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="bg-tg-card p-4 rounded-xl shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{task.name}</h3>
                    <p className="text-sm text-tg-hint mb-2">{task.descr}</p>
                  </div>
                  <div className={`text-sm font-bold ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-tg-hint">Price:</span>
                    <div className="font-bold">{formatPriceInUsd(task.price_rub)}</div>
                  </div>
                  <div>
                    <span className="text-tg-hint">Limit:</span>
                    <div className="font-bold">{task.limit_total}</div>
                  </div>
                  <div>
                    <span className="text-tg-hint">Tariff:</span>
                    <div className="font-bold">{task.tarif_id}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleSetLimit(task.id)}
                  >
                    Set Limit
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => setSelectedTask(task.id)}
                  >
                    View Reports
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTask && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Reports for Task #{selectedTask}</h2>
          <div className="space-y-3">
            {reports.filter(r => r.task_id === selectedTask).map(report => (
              <div key={report.id} className="bg-tg-card p-4 rounded-xl shadow border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold">Report #{report.id}</div>
                    <div className="text-sm text-tg-hint">Worker: {report.worker_id}</div>
                    <div className="text-sm text-tg-hint">IP: {report.IP}</div>
                  </div>
                  <div className="text-sm font-bold">
                    {getReportStatusText(report.status)}
                  </div>
                </div>
                
                <div className="text-sm mb-3">
                  <span className="text-tg-hint">Price:</span> {formatPriceInUsd(report.price_rub)}
                </div>

                {report.status === 2 && (
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleApproveReport(report.id)}
                    >
                      Approve
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleRejectReport(report.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Folders</h2>
        {folders.length === 0 ? (
          <div className="bg-tg-card p-4 rounded-xl shadow text-tg-hint text-sm">
            No folders found
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map(folder => (
              <div key={folder.id} className="bg-tg-card p-3 rounded-xl shadow">
                <div className="font-bold">{folder.name}</div>
                <div className="text-sm text-tg-hint">ID: {folder.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
