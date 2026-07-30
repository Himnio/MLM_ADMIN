'use client';

import { useEffect, useState } from 'react';
import { Users, Link2, Activity, Shield, UserCheck, Share2, Check, Loader2, Copy, CheckCheck, DollarSign, TrendingUp, Award, ExternalLink, ChevronRight, Calendar, GitBranch } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const STAT_ACCENTS = [
  { from: '#10B981', to: '#059669' },
  { from: '#6366F1', to: '#4F46E5' },
  { from: '#8B5CF6', to: '#7C3AED' },
  { from: '#F59E0B', to: '#D97706' },
];

export default function DistributorDashboardView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    if (!token) return;

    fetch(`${API_BASE}/member/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const d = res.data;
          // Fetch additional info
          Promise.all([
            fetch(`${API_BASE}/member/downline`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
            fetch(`${API_BASE}/member/referral-info`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
          ]).then(([downlineRes, refRes]) => {
            setData({
              ...d,
              downlines: downlineRes.data?.downlines || [],
              referral_used_count: refRes.data?.total_used || d.referral_used || 0,
            });
            setLoading(false);
          });
        } else {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-muted animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-danger-light/20 flex items-center justify-center">
          <Activity size={28} className="text-danger" />
        </div>
        <p className="text-sm font-medium text-danger">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const initials = data.first_name ? data.first_name.charAt(0).toUpperCase() + (data.last_name ? data.last_name.charAt(0).toUpperCase() : '') : 'D';
  const downlineCount = data.downline_count || data.downlines?.length || 0;

  const copyCode = () => {
    if (data.referral_code) {
      navigator.clipboard.writeText(data.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/[0.04] blur-2xl" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white truncate">Welcome, {data.first_name}!</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  data.is_active ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30' : 'bg-white/10 text-white/70 border border-white/10'
                }`}>
                  {data.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-white/70 mt-1">Member ID: {data.member_id} &middot; @{data.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {[
          { label: 'Account Status', value: data.is_active ? 'Active' : 'Inactive', icon: Shield, idx: 0 },
          { label: 'Downline Members', value: downlineCount.toLocaleString(), icon: Users, idx: 1 },
          { label: 'Referral Signups', value: (data.referral_used_count || data.referral_used || '0').toString(), icon: Link2, idx: 2 },
          { label: 'Member ID', value: data.member_id || '—', icon: UserCheck, idx: 3 },
        ].map((s, i) => {
          const Icon = s.icon;
          const accent = STAT_ACCENTS[i % STAT_ACCENTS.length];
          return (
            <div key={s.label} className="stat-card relative overflow-hidden group cursor-default">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }} />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(600px circle at 50% 50%, ${accent.from}12, transparent 40%)` }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-text-muted">{s.label}</span>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent.from}18` }}>
                    <Icon size={15} style={{ color: accent.from }} />
                  </div>
                </div>
                <p className="text-xl sm:text-3xl font-bold text-text-primary tracking-tight">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Account Information */}
        <div className="lg:col-span-2 stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCheck size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Account Information</h3>
              <p className="text-xs text-text-muted">Your profile details at a glance</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Full Name', value: `${data.first_name || ''} ${data.last_name || ''}`.trim() || '—' },
              { label: 'Username', value: data.username ? `@${data.username}` : '—' },
              { label: 'Email', value: data.email || '—' },
              { label: 'Mobile', value: data.mobile || '—' },
              { label: 'Referral Signups', value: `${data.referral_used_count || data.referral_used || 0} people joined using your link` },
              { label: 'Payout Status', value: data.is_active ? 'Eligible for payouts' : 'Currently inactive' },
            ].map((f, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-xl bg-surface-hover/50 border border-border/50">
                <p className="text-[10px] sm:text-xs font-medium text-text-muted mb-1">{f.label}</p>
                <p className="text-xs sm:text-sm font-semibold text-text-primary">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Quick Actions</h3>
              <p className="text-xs text-text-muted">Common tasks</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { icon: Users, label: 'View Your Downline', color: 'text-primary', href: 'downline' },
              { icon: GitBranch, label: 'Explore MLM Tree', color: 'text-purple-500', href: 'tree' },
              { icon: ExternalLink, label: 'Share Referral Link', color: 'text-emerald-500', href: 'referral' },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                      <Icon size={16} className={action.color} />
                    </div>
                    <span className="text-sm font-medium text-text-primary">{action.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Referral Code Card */}
      {data.referral_code && (
        <div className="stat-card !p-0 overflow-hidden border-0">
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 sm:p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <Link2 size={20} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Your Referral Code</h3>
                  <p className="text-xs text-text-muted">Share this to invite new distributors</p>
                </div>
              </div>
              <button onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${data.referral_code}` : `/register?ref=${data.referral_code}`;
                if (navigator.share) {
                  navigator.share({ title: 'Join my network', text: `Join my network using referral code: ${data.referral_code}`, url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url);
                }
                setShared(true);
                setTimeout(() => setShared(false), 2000);
              }} className="btn-secondary btn-sm sm:btn-sm flex-shrink-0">
                {shared ? <Check size={16} /> : <Share2 size={16} />}
                {shared ? 'Shared!' : 'Share Link'}
              </button>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <code className="font-mono text-lg sm:text-xl font-bold text-emerald-500 tracking-wider bg-emerald-500/5 px-4 py-2.5 rounded-xl border border-emerald-500/20 flex-1 truncate">
              {data.referral_code}
            </code>
            <div className="flex items-center gap-2">
              <button onClick={copyCode} className="btn-icon p-2.5 rounded-xl hover:bg-emerald-500/10" title="Copy code">
                {copied ? <CheckCheck size={18} className="text-emerald-500" /> : <Copy size={18} />}
              </button>
              <button onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${data.referral_code}` : `/register?ref=${data.referral_code}`;
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }} className="btn-secondary btn-sm flex-shrink-0">
                <Copy size={14} />
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Downline Members */}
      {data.downlines && data.downlines.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Recent Downline</h3>
                <p className="text-xs text-text-muted">Your newest team members</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {data.downlines.slice(0, 5).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {d.first_name?.charAt(0)}{d.last_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{d.first_name} {d.last_name}</p>
                    <p className="text-xs text-text-muted">{d.member_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-text-muted">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                  {d.is_active ? <span className="badge-success">Active</span> : <span className="badge-default">Inactive</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
