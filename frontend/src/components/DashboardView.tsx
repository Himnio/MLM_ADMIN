'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  DashboardOverview,
  IncomeChartData,
  MemberGrowthChart,
  TopEarner,
  ActivityLog,
  SystemAlert,
  LevelDistribution,
} from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  Users, DollarSign, GitBranch, TrendingUp, AlertTriangle, Award, Clock,
} from 'lucide-react';

const GRADIENTS = [
  ['#4F46E5', '#7C3AED'],
  ['#10B981', '#059669'],
  ['#F59E0B', '#D97706'],
  ['#EC4899', '#DB2777'],
];

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function DashboardView() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [incomeChart, setIncomeChart] = useState<IncomeChartData | null>(null);
  const [growthChart, setGrowthChart] = useState<MemberGrowthChart | null>(null);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [levelDist, setLevelDist] = useState<LevelDistribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardOverview>('/dashboard/overview'),
      api.get<IncomeChartData>('/dashboard/charts/income?period=monthly'),
      api.get<MemberGrowthChart>('/dashboard/charts/growth?period=monthly'),
      api.get<TopEarner[]>('/dashboard/top-earners?limit=5'),
      api.get<ActivityLog[]>('/dashboard/activity?limit=10'),
      api.get<SystemAlert[]>('/dashboard/alerts'),
      api.get<LevelDistribution>('/dashboard/levels'),
    ]).then(([ov, ic, gc, te, act, al, ld]) => {
      if (ov.success && ov.data) setOverview(ov.data);
      if (ic.success && ic.data) setIncomeChart(ic.data);
      if (gc.success && gc.data) setGrowthChart(gc.data);
      if (te.success && te.data) setTopEarners(te.data);
      if (act.success && act.data) setActivities(act.data);
      if (al.success && al.data) setAlerts(al.data);
      if (ld.success && ld.data) setLevelDist(ld.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);

  const statCards = overview ? [
    { title: 'Total Members', value: overview.total_members.toLocaleString(), sub: `${overview.active_members} active`, icon: Users, idx: 0 },
    { title: 'Total Income', value: formatCurrency(overview.total_income), sub: `${formatCurrency(overview.pending_income)} pending`, icon: DollarSign, idx: 1 },
    { title: 'Total Referrals', value: overview.total_referrals.toLocaleString(), sub: `${overview.commission_rate}% commission`, icon: GitBranch, idx: 2 },
    { title: 'Growth Rate', value: `${overview.growth_rate}%`, sub: `${overview.new_members_today} new today`, icon: TrendingUp, idx: 3 },
  ] : [];

  const alertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />;
      default: return <Clock size={16} className="text-blue-500 flex-shrink-0" />;
    }
  };

  const alertBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-700';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  /** Process income chart data */
  const incomeData = incomeChart?.labels.map((l, i) => ({
    name: l,
    ...Object.fromEntries(incomeChart.datasets.map((d) => [d.label, d.data[i] || 0])),
  })) || [];

  /** Process growth chart data */
  const growthData = growthChart?.labels.map((l, i) => ({
    name: l, members: growthChart.members[i], growth: growthChart.growth[i],
  })) || [];

  /** Process level distribution for pie */
  const levelData = levelDist?.levels.map((l, i) => ({
    name: `Level ${l}`, value: levelDist.counts[i],
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-lg shadow-card border border-border p-3 text-sm animate-scale-in">
        <p className="font-semibold text-text-primary mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value?.toLocaleString()}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((a) => (
            <div key={a.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm border ${alertBg(a.severity)}`}>
              {alertIcon(a.severity)}
              <span className="font-semibold">{a.type}:</span> {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="relative overflow-hidden rounded-xl p-5 text-white animate-slide-up"
                style={{ animationDelay: `${i * 80}ms`, background: `linear-gradient(135deg, ${GRADIENTS[i][0]}, ${GRADIENTS[i][1]})` }}
              >
                {/* Decorative circle */}
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{card.title}</span>
                    <Icon size={20} className="text-white/70" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-xs text-white/70 mt-1">{card.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Income Chart */}
        <div className="stat-card animate-slide-up">
          <h3 className="text-base font-semibold text-text-primary mb-1">Income Overview</h3>
          <p className="text-xs text-text-muted mb-4">Monthly income distribution</p>
          {incomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                {incomeChart?.datasets.map((d, i) => (
                  <Bar key={d.label} dataKey={d.label} fill={d.color || COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-text-muted text-sm">No income data</div>
          )}
        </div>

        {/* Member Growth */}
        <div className="stat-card animate-slide-up">
          <h3 className="text-base font-semibold text-text-primary mb-1">Member Growth</h3>
          <p className="text-xs text-text-muted mb-4">New members over time</p>
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="members" stroke="#4F46E5" strokeWidth={2} fill="url(#memberGrad)" name="Members" dot={{ r: 3, fill: '#4F46E5' }} />
                <Area type="monotone" dataKey="growth" stroke="#10B981" strokeWidth={2} fill="url(#growthGrad)" name="Growth %" dot={{ r: 3, fill: '#10B981' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-text-muted text-sm">No growth data</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Level Distribution */}
        <div className="stat-card animate-slide-up">
          <h3 className="text-base font-semibold text-text-primary mb-1">Level Distribution</h3>
          <p className="text-xs text-text-muted mb-4">Members by MLM level</p>
          {levelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={levelData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                  {levelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value: string) => <span className="text-text-secondary">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-text-muted text-sm">No level data</div>
          )}
        </div>

        {/* Top Earners */}
        <div className="stat-card animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-amber-500" />
            <h3 className="text-base font-semibold text-text-primary">Top Earners</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Highest income members</p>
          {topEarners.length > 0 ? (
            <div className="space-y-2">
              {topEarners.map((e, i) => (
                <div key={e.member_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                      i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm' :
                      i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                      i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{e.member_name}</p>
                      <p className="text-xs text-text-muted">{e.direct_count} direct referrals</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 flex-shrink-0 ml-2">{formatCurrency(e.total_income)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-text-muted text-sm">No earners data</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="stat-card animate-slide-up">
          <h3 className="text-base font-semibold text-text-primary mb-1">Recent Activity</h3>
          <p className="text-xs text-text-muted mb-4">Latest system actions</p>
          {activities.length > 0 ? (
            <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide -mx-1">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-hover transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                    a.type === 'income' ? 'bg-emerald-400' :
                    a.type === 'member' ? 'bg-blue-400' :
                    a.type === 'referral' ? 'bg-purple-400' : 'bg-gray-400'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary truncate">{a.details || a.action}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {a.admin_name} &middot; {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-text-muted text-sm">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}
