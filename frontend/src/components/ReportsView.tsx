'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { SystemHealth, ActivityLog, SystemAlert } from '@/types';
import { Download, BarChart3, Activity, AlertTriangle, Clock, Server, Database, Cpu, CheckCircle, XCircle } from 'lucide-react';

export default function ReportsView() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get<SystemHealth>('/dashboard/health'),
      api.get<ActivityLog[]>('/dashboard/activity?limit=50'),
      api.get<SystemAlert[]>('/dashboard/alerts'),
      api.get<any>('/dashboard/overview'),
    ]).then(([healthRes, actRes, alertRes, metricsRes]) => {
      if (healthRes.success && healthRes.data) setHealth(healthRes.data);
      if (actRes.success && actRes.data) setActivities(actRes.data);
      if (alertRes.success && alertRes.data) setAlerts(alertRes.data);
      if (metricsRes.success && metricsRes.data) setDashboardMetrics(metricsRes.data);
      setLoading(false);
    });
  }, []);

  const handleExportCSV = () => {
    const headers = ['Date', 'Action', 'Admin', 'Details'];
    const rows = activities.map(a => [
      new Date(a.created_at).toLocaleDateString(),
      a.action,
      a.admin_name,
      a.details || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted animate-pulse">Loading reports...</p>
        </div>
      </div>
    );
  }

  const formatUptime = (uptime: string) => {
    const parts = uptime.split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0]), m = parseInt(parts[1]), s = parseInt(parts[2]);
      return `${h}h ${m}m ${s}s`;
    }
    return uptime;
  };

  const healthIcon = (status: string) =>
    status === 'healthy' || status === 'connected'
      ? <CheckCircle size={18} className="text-emerald-500" />
      : <XCircle size={18} className="text-red-500" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HealthCard icon={<Server size={18} />} title="Status" value={health.status} color={health.status === 'healthy' ? 'emerald' : 'red'} />
          <HealthCard icon={<Clock size={18} />} title="Uptime" value={formatUptime(health.uptime)} color="blue" />
          <HealthCard icon={<Database size={18} />} title="Database" value={health.db_status} color={health.db_status === 'connected' ? 'emerald' : 'red'} />
          <HealthCard icon={<Activity size={18} />} title="API Version" value={health.api_version} color="purple" />
        </div>
      )}

      {alerts.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-lg font-semibold text-text-primary">System Alerts</h3>
          </div>
          <div className="space-y-2">
            {alerts.map(a => {
              const severityClass = a.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                a.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-blue-50 border-blue-200 text-blue-700';
              return (
                <div key={a.id} className={`p-3 rounded-lg text-sm flex items-start gap-3 border ${severityClass}`}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{a.type}</p>
                    <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dashboardMetrics && (
        <div className="stat-card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-text-muted">Total Members</p><p className="text-2xl font-bold text-text-primary mt-1">{dashboardMetrics.total_members}</p></div>
            <div><p className="text-xs text-text-muted">Active Members</p><p className="text-2xl font-bold text-emerald-600 mt-1">{dashboardMetrics.active_members}</p></div>
            <div><p className="text-xs text-text-muted">Total Referrals</p><p className="text-2xl font-bold text-text-primary mt-1">{dashboardMetrics.total_referrals}</p></div>
            <div><p className="text-xs text-text-muted">Growth Rate</p><p className="text-2xl font-bold text-primary mt-1">{dashboardMetrics.growth_rate}%</p></div>
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Activity Timeline</h3>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-hide">
            {activities.slice(0, 20).map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 hover:bg-surface-hover rounded-lg border border-border transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  a.type === 'income' ? 'bg-emerald-400' :
                  a.type === 'member' ? 'bg-blue-400' :
                  a.type === 'referral' ? 'bg-purple-400' :
                  a.type === 'admin' ? 'bg-orange-400' : 'bg-gray-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{a.action}</p>
                  <p className="text-xs text-text-muted">{a.details || 'System action'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-text-muted">{a.admin_name || 'System'}</p>
                    <p className="text-xs text-text-muted">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stat-card">
        <h3 className="text-lg font-semibold text-text-primary mb-1">Export Reports</h3>
        <p className="text-xs text-text-muted mb-4">Download activity data as CSV</p>
        <button onClick={handleExportCSV} className="btn-primary flex items-center gap-2">
          <Download size={16} /> Export Activity Report (CSV)
        </button>
      </div>

      {health && (
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={18} className="text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Server Resources</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-text-secondary mb-2">Memory Usage</p>
              <div className="w-full h-2.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                  style={{ width: `${(health.memory_used / (health.memory_used + health.memory_free)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1">{health.memory_used}MB / {health.memory_used + health.memory_free}MB</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-2">CPU Load</p>
              <p className="text-2xl font-bold text-primary">{health.cpu_load}%</p>
              <p className="text-xs text-text-muted mt-1">
                {health.cpu_load > 80 ? 'High load' : health.cpu_load > 50 ? 'Moderate' : 'Normal'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthCard({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-sm font-medium opacity-80">{title}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
