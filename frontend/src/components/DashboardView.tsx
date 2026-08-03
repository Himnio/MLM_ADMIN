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
  Users, DollarSign, GitBranch, TrendingUp, AlertTriangle, Award, Share2, CheckCheck, Copy,
} from 'lucide-react';

const GRADIENT_ACCENTS = [
  { from: '#6366F1', to: '#4F46E5', light: 'rgba(99,102,241,0.12)' },
  { from: '#10B981', to: '#059669', light: 'rgba(16,185,129,0.12)' },
  { from: '#F59E0B', to: '#D97706', light: 'rgba(245,158,11,0.12)' },
  { from: '#EC4899', to: '#DB2777', light: 'rgba(236,72,153,0.12)' },
];

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function DashboardView() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [incomeChart, setIncomeChart] = useState<IncomeChartData | null>(null);
  const [growthChart, setGrowthChart] = useState<MemberGrowthChart | null>(null);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [levelDist, setLevelDist] = useState<LevelDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    api.get<any>('/admin/referral-codes').then(res => {
      if (res.success && res.data?.codes?.length > 0) {
        setMyReferralCode(res.data.codes[0].referral_code);
      }
    }).catch(() => {});
  }, []);

  const getReferralUrl = () => {
    if (!myReferralCode) return '';
    return typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${myReferralCode}` : `/register?ref=${myReferralCode}`;
  };

  const copyReferralLink = () => {
    const url = getReferralUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    const url = getReferralUrl();
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join My Rudra Network',
          text: 'Join my network and grow with me on Rudra!',
          url,
        });
      } catch (err) {
        // User cancelled share dialog - fall back to copy
        if ((err as Error).name !== 'AbortError') {
          copyReferralLink();
        }
      }
    } else {
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
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

  const incomeData = incomeChart?.labels.map((l, i) => ({
    name: l,
    ...Object.fromEntries(incomeChart.datasets.map((d) => [d.label, d.data[i] || 0])),
  })) || [];

  const growthData = growthChart?.labels.map((l, i) => ({
    name: l, members: growthChart.members[i], growth: growthChart.growth[i],
  })) || [];

  const levelData = levelDist?.levels.map((l, i) => ({
    name: `Level ${l}`, value: levelDist.counts[i],
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-modal rounded-xl shadow-modal border border-border p-3.5 text-sm animate-scale-in">
        <p className="font-semibold text-text-primary mb-1.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value?.toLocaleString()}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Referral Invite Card - Top Priority */}
      {myReferralCode && (
        <div className="stat-card relative overflow-hidden border-0">
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #6366F1, #4F46E5, #7C3AED)' }} />
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(600px circle at 85% 50%, rgba(99,102,241,0.08), transparent 45%)' }} />
          <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
                <Share2 size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-text-primary truncate">Invite Your Network</h3>
                <p className="text-xs text-text-muted truncate">Grow your team — share your referral link</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={shareReferralLink}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-all duration-200 shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Share2 size={16} />
                Share
              </button>
              <button
                onClick={copyReferralLink}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 active:scale-95"
              >
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#7C3AED] p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Dashboard Overview</h2>
              <p className="text-sm text-white/70 mt-1">Track your Rudra network performance at a glance</p>
            </div>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium backdrop-blur-sm border border-white/10 w-fit">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
              {[
                { label: 'Members', value: overview.total_members.toLocaleString() },
                { label: 'Revenue', value: formatCurrency(overview.total_income) },
                { label: 'Referrals', value: overview.total_referrals.toLocaleString() },
                { label: 'Growth', value: `${overview.growth_rate}%` },
              ].map((s, i) => (
                <div key={i} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-3.5 sm:p-4">
                  <p className="text-[10px] sm:text-xs font-medium text-white/60 uppercase tracking-wider">{s.label}</p>
                  <p className="text-base sm:text-lg font-bold text-white mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((a) => (
            <div key={a.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
              a.severity === 'critical' ? 'bg-danger-light/20 border-danger/30 text-danger' :
              a.severity === 'warning' ? 'bg-warning-light/20 border-warning/30 text-warning' :
              'bg-info-light/20 border-info/30 text-info'
            }`}>
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="font-semibold">{a.type}:</span> {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Stat Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            const accent = GRADIENT_ACCENTS[i];
            return (
              <div key={card.title} className="stat-card relative overflow-hidden group cursor-default">
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${accent.light}, transparent 40%)` }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{card.title}</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent.light }}>
                      <Icon size={17} style={{ color: accent.from }} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{card.value}</p>
                  <p className="text-xs sm:text-sm text-text-muted mt-1.5">{card.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Income Chart */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-text-primary">Income Overview</h3>
            <span className="text-xs text-text-muted">Monthly</span>
          </div>
          <p className="text-xs text-text-muted mb-5">Revenue distribution across income sources</p>
          {incomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-surface-hover)' }} />
                {incomeChart?.datasets.map((d, i) => (
                  <Bar key={d.label} dataKey={d.label} fill={d.color || COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-text-muted text-sm">No income data available</div>
          )}
        </div>

        {/* Member Growth */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-text-primary">Member Growth</h3>
            <span className="text-xs text-text-muted">Monthly</span>
          </div>
          <p className="text-xs text-text-muted mb-5">New member registrations over time</p>
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="members" stroke="#6366F1" strokeWidth={2.5} fill="url(#memberGrad)" name="Members" dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="growth" stroke="#10B981" strokeWidth={2.5} fill="url(#growthGrad)" name="Growth %" dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-text-muted text-sm">No growth data available</div>
          )}
        </div>
      </div>

      {/* Bottom 3-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Level Distribution */}
        <div className="stat-card">
          <h3 className="text-base font-semibold text-text-primary mb-1">Level Distribution</h3>
          <p className="text-xs text-text-muted mb-4">Members by Rudra hierarchy level</p>
          {levelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={levelData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="value">
                  {levelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
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
            <div className="flex items-center justify-center h-[280px] text-text-muted text-sm">No level data</div>
          )}
        </div>

        {/* Top Earners */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-amber-500" />
            <h3 className="text-base font-semibold text-text-primary">Top Earners</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">Highest earning distributors</p>
          {topEarners.length > 0 ? (
            <div className="space-y-1">
              {topEarners.map((e, i) => (
                <div key={e.member_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                      i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm' :
                      i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                      i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                      'bg-surface-hover text-text-muted'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{e.member_name}</p>
                      <p className="text-xs text-text-muted">{e.direct_count} direct referrals</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2">{formatCurrency(e.total_income)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-text-muted text-sm">No earner data</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="stat-card">
          <h3 className="text-base font-semibold text-text-primary mb-1">Recent Activity</h3>
          <p className="text-xs text-text-muted mb-4">Latest actions in the system</p>
          {activities.length > 0 ? (
            <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-hide -mx-1">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                    a.type === 'income' ? 'bg-emerald-500' :
                    a.type === 'member' ? 'bg-blue-500' :
                    a.type === 'referral' ? 'bg-purple-500' : 'bg-gray-400'
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
            <div className="flex items-center justify-center h-[280px] text-text-muted text-sm">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}
