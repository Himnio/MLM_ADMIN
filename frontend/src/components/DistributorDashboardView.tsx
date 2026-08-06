'use client';

import { useEffect, useState } from 'react';
import { Users, Link2, Activity, Shield, UserCheck, Share2, Loader2, Copy, CheckCheck, DollarSign, TrendingUp, Award, ExternalLink, ChevronRight, Calendar, GitBranch } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const STAT_ACCENTS = [
  { from: '#111827', to: '#374151' },
  { from: '#374151', to: '#4B5563' },
  { from: '#4B5563', to: '#6B7280' },
  { from: '#6B7280', to: '#9CA3AF' },
];

export default function DistributorDashboardView({ onNavigate }: { onNavigate?: (section: 'dashboard' | 'downline' | 'referral' | 'tree') => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const getReferralUrl = () => {
    if (!data.referral_code) return '';
    return typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${data.referral_code}` : `/register?ref=${data.referral_code}`;
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Referral Invite Card - Top Priority */}
      {data.referral_code && (
        <div className="stat-card relative overflow-hidden">
          <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
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
                className="btn-secondary btn-sm"
              >
                <Share2 size={15} />
                Share
              </button>
              <button
                onClick={copyReferralLink}
                className="btn-primary btn-sm"
              >
                {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-card p-6 sm:p-8">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary truncate">Welcome, {data.first_name}!</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  data.is_active ? 'badge-success' : 'badge-neutral'
                }`}>
                  {data.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-text-muted mt-1">Member ID: {data.member_id} &middot; @{data.username}</p>
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
              { icon: Users, label: 'View Your Downline', color: 'text-primary', section: 'downline' as const },
              { icon: GitBranch, label: 'Explore Rudra Tree', color: 'text-text-secondary', section: 'tree' as const },
              { icon: ExternalLink, label: 'Share Referral Link', color: 'text-text-secondary', section: 'referral' as const },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => onNavigate?.(action.section)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                      <Icon size={16} className={action.color} />
                    </div>
                    <span className="text-sm font-medium text-text-primary">{action.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
