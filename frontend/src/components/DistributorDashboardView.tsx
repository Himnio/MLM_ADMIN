'use client';

import { useEffect, useState } from 'react';
import { Users, Link2, Activity, Shield, UserCheck, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function DistributorDashboardView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    if (!token) return;

    fetch(`${API_BASE}/member/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        else setError(res.message || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return <div className="py-16 text-center text-red-500">{error}</div>;
  if (!data) return null;

  const stats = [
    { label: 'Payout Status', value: data.is_active ? 'On' : 'Off', icon: Shield, color: data.is_active ? 'from-emerald-500 to-green-500' : 'from-gray-400 to-gray-500' },
    { label: 'Downline Members', value: data.downline_count, icon: Users, color: 'from-blue-500 to-indigo-500' },
    { label: 'Referral Used', value: data.referral_used, icon: Link2, color: 'from-purple-500 to-pink-500' },
    { label: 'Member ID', value: data.member_id, icon: UserCheck, color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`stat-card bg-gradient-to-br ${s.color} text-white border-0`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/80">{s.label}</p>
                <div className="p-2 bg-white/15 rounded-lg"><Icon size={18} /></div>
              </div>
              <p className="text-2xl font-bold mt-2">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Welcome, {data.first_name} {data.last_name}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-surface rounded-xl">
            <p className="text-xs text-text-muted">Username</p>
            <p className="text-sm font-medium text-text-primary mt-0.5">@{data.username}</p>
          </div>
          <div className="p-4 bg-surface rounded-xl">
            <p className="text-xs text-text-muted">Mobile</p>
            <p className="text-sm font-medium text-text-primary mt-0.5">{data.mobile || '—'}</p>
          </div>
          <div className="p-4 bg-surface rounded-xl">
            <p className="text-xs text-text-muted">Email</p>
            <p className="text-sm font-medium text-text-primary mt-0.5">{data.email || '—'}</p>
          </div>
          <div className="p-4 bg-surface rounded-xl">
            <p className="text-xs text-text-muted">Referral Registrations</p>
            <p className="text-sm font-medium text-text-primary mt-0.5">{data.referral_used} people joined using your link</p>
          </div>
        </div>
      </div>
    </div>
  );
}
