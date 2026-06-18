'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { SystemHealth, ActivityLog, SystemAlert } from '@/types';
import { Download, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const formatUptime = (uptime: string) => {
    const parts = uptime.split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const s = parseInt(parts[2]);
      return `${h}h ${m}m ${s}s`;
    }
    return uptime;
  };

  return (
    <div className="space-y-6">
      {/* System Health */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <HealthCard title="Status" value={health.status} color={health.status === 'healthy' ? 'green' : 'red'} />
          <HealthCard title="Uptime" value={formatUptime(health.uptime)} color="blue" />
          <HealthCard title="Database" value={health.db_status} color={health.db_status === 'connected' ? 'green' : 'red'} />
          <HealthCard title="API Version" value={health.api_version} color="purple" />
        </div>
      )}

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">System Alerts</h3>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className={`p-3 rounded-lg text-sm flex items-start gap-3 ${
                a.severity === 'critical' ? 'bg-red-50 border border-red-200 text-red-700' :
                a.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                'bg-blue-50 border border-blue-200 text-blue-700'
              }`}>
                <span className="font-bold mt-0.5">•</span>
                <div>
                  <p className="font-semibold">{a.type}</p>
                  <p className="text-xs mt-0.5">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {dashboardMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
          <MetricBox label="Total Members" value={dashboardMetrics.total_members} />
          <MetricBox label="Active Members" value={dashboardMetrics.active_members} />
          <MetricBox label="Total Referrals" value={dashboardMetrics.total_referrals} />
          <MetricBox label="Growth Rate" value={`${dashboardMetrics.growth_rate}%`} />
        </div>
      )}

      {/* Activity Performance */}
      {activities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Activity Timeline
          </h3>
          {/* Simple timeline visualization */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {activities.slice(0, 20).map((a, i) => (
              <div key={a.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  a.type === 'income' ? 'bg-green-500' :
                  a.type === 'member' ? 'bg-blue-500' :
                  a.type === 'referral' ? 'bg-purple-500' :
                  a.type === 'admin' ? 'bg-orange-500' : 'bg-gray-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{a.action}</p>
                  <p className="text-xs text-gray-500">{a.details || 'System action'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">{a.admin_name || 'System'}</p>
                    <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Export Reports</h3>
        <button onClick={handleExportCSV} className="flex items-center gap-2 btn-primary">
          <Download className="w-4 h-4" /> Export Activity Report (CSV)
        </button>
      </div>

      {/* Memory/CPU Stats */}
      {health && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Server Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Memory Usage</p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{ width: `${(health.memory_used / (health.memory_used + health.memory_free)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{health.memory_used}MB / {health.memory_used + health.memory_free}MB</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">CPU Load</p>
              <div className="text-2xl font-bold text-primary">{health.cpu_load}%</div>
              <p className="text-xs text-gray-500 mt-1">{health.cpu_load > 80 ? '⚠️ High load' : health.cpu_load > 50 ? '⚡ Moderate' : '✓ Normal'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-xl font-bold mt-2">{value}</p>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}