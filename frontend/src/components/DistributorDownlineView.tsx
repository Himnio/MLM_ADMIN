'use client';

import { useEffect, useState } from 'react';
import { Users, User, Mail, Phone, Calendar, Loader2, ChevronRight, Shield } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface DownlineMember {
  id: string;
  member_id: string;
  username: string;
  first_name: string;
  last_name: string;
  mobile: string;
  gender: string;
  dob: string;
  email: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  sponsor_name: string;
  downline_count: number;
  level: number;
}

export default function DistributorDownlineView() {
  const [downlines, setDownlines] = useState<DownlineMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DownlineMember | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    if (!token) return;

    fetch(`${API_BASE}/member/downline`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) setDownlines(res.data?.downlines || []);
        else setError(res.message || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return <div className="py-16 text-center text-red-500">{error}</div>;

  if (downlines.length === 0) {
    return (
      <div className="stat-card py-16">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Users size={40} />
          <p className="text-sm">No downline members yet</p>
          <p className="text-xs">Share your referral link to grow your network</p>
        </div>
      </div>
    );
  }

  const fieldRow = (label: string, value: string | undefined) => (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm text-text-primary">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users size={20} className="text-primary" />
        <h2 className="text-lg font-semibold text-text-primary">My Downline ({downlines.length})</h2>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {downlines.map(d => (
          <div key={d.id} className="stat-card cursor-pointer" onClick={() => setSelected(d)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {d.first_name?.charAt(0)}{d.last_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{d.first_name} {d.last_name}</p>
                  <p className="text-xs text-text-muted font-mono">{d.member_id}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {d.is_active ? (
                <span className="badge-success">Payout On</span>
              ) : (
                <span className="badge-default">Payout Off</span>
              )}
              <span className="text-xs text-text-muted">{d.downline_count} downline</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block stat-card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Member ID</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Payout</th>
              <th>Downline</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {downlines.map(d => (
              <tr key={d.id} className="cursor-pointer hover:bg-surface-hover" onClick={() => setSelected(d)}>
                <td className="font-medium text-text-primary">{d.first_name} {d.last_name}</td>
                <td className="font-mono text-sm text-text-secondary">{d.member_id}</td>
                <td className="text-sm text-text-secondary">{d.mobile}</td>
                <td className="text-sm text-text-muted truncate max-w-[150px]">{d.email || '—'}</td>
                <td>{d.is_active ? <span className="badge-success">Payout On</span> : <span className="badge-default">Payout Off</span>}</td>
                <td className="text-sm text-text-secondary">{d.downline_count}</td>
                <td>
                  <button onClick={(e) => { e.stopPropagation(); setSelected(d); }} className="btn-icon border border-border">
                    <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="bg-modal rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-modal border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">{selected.first_name} {selected.last_name}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-primary">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Shield size={16} className={selected.is_active ? 'text-emerald-500' : 'text-gray-400'} />
                <span className={selected.is_active ? 'badge-success' : 'badge-default'}>
                  {selected.is_active ? 'Payout On' : 'Payout Off'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Member ID</p>
                  <p className="font-mono text-sm text-text-primary">{selected.member_id}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Username</p>
                  <p className="text-sm text-text-primary">@{selected.username}</p>
                </div>
              </div>

              <div className="space-y-1">
                {fieldRow('Full Name', `${selected.first_name} ${selected.last_name}`)}
                {fieldRow('Mobile', selected.mobile)}
                {fieldRow('Email', selected.email)}
                {fieldRow('Gender', selected.gender)}
                {fieldRow('DOB', selected.dob)}
                {fieldRow('Downline Count', String(selected.downline_count))}
                {fieldRow('Joined', new Date(selected.created_at).toLocaleDateString())}
              </div>

              <p className="text-xs text-text-muted italic mt-4">
                Sensitive details (PAN, Aadhaar, bank info) are not visible at this level.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
