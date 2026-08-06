'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, Users, ArrowLeft, TrendingUp, UserCheck, UserX, ChevronDown, ChevronUp, Crown,
} from 'lucide-react';

interface DistributorLevelEntry {
  id: string;
  level: number;
  member_id: string;
  username: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  downline_count: number;
  total_income: number;
}

interface DistributorLevelGroup {
  level: number;
  count: number;
  filled_seats: number;
  seat_capacity: number;
  income_amount: number;
  commission_percentage: number;
  distributors: DistributorLevelEntry[];
}

interface DistributorsByLevelResponse {
  levels: DistributorLevelGroup[];
}

const LEVEL_ACCENT = 'bg-primary';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

export default function DistributorLevelsView() {
  const [levels, setLevels] = useState<DistributorLevelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await api.get<DistributorsByLevelResponse>('/dashboard/distributors-by-level');
    if (res.success && res.data) {
      setLevels(res.data.levels || []);
    } else {
      setError(res.message || res.error || 'Failed to load levels');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const totalDistributors = levels.reduce((sum, l) => sum + l.count, 0);
  const maxCount = Math.max(1, ...levels.map(l => l.count));
  const selected = selectedLevel !== null ? levels.find(l => l.level === selectedLevel) : null;

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading && levels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-text-muted">Loading levels...</p>
      </div>
    );
  }

  if (error && levels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-danger mb-3">{error}</p>
        <button onClick={fetchLevels} className="px-4 py-2 rounded-lg bg-primary-light text-primary text-sm hover:bg-primary/20 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  // Detail panel: distributors at the selected level
  if (selected) {
    const distributors = selected.distributors || [];
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedLevel(null)}
            className="p-2 rounded-lg bg-card border border-border hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Level {selected.level} Distributors
            </h2>
            <p className="text-sm text-text-muted">
              {selected.count} distributor{selected.count === 1 ? '' : 's'} at this level
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted mb-1">Distributors</p>
            <p className="text-xl font-bold text-text-primary">{selected.count}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted mb-1">Active</p>
            <p className="text-xl font-bold text-success">
              {distributors.filter(d => d.is_active).length}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted mb-1">Inactive</p>
            <p className="text-xl font-bold text-danger">
              {distributors.filter(d => !d.is_active).length}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted mb-1">Seats Filled</p>
            <p className="text-xl font-bold text-text-primary">
              {selected.filled_seats}<span className="text-sm text-text-muted font-normal"> / {selected.seat_capacity}</span>
            </p>
          </div>
        </div>

        {/* Distributors list */}
        {distributors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-border">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center mb-3">
              <Users size={24} className="text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-primary">No distributors at Level {selected.level}</p>
            <p className="text-xs text-text-muted mt-1">Distributors will appear here once they join this level.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Distributor</th>
                    <th>Member ID</th>
                    <th>Username</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-right">Downline</th>
                  </tr>
                </thead>
                <tbody>
                  {distributors.map((d) => {
                    const fullName = `${d.first_name || ''} ${d.last_name || ''}`.trim() || '-';
                    const expanded = expandedRows.has(d.id);
                    return (
                      <tr key={d.id} className="hover:bg-surface-hover">
                        <td className="font-medium text-text-primary">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-primary`}>
                              {(fullName === '-' ? d.member_id : fullName).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-text-primary">{fullName}</p>
                              <p className="text-xs text-text-muted">{d.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-sm text-text-secondary">{d.member_id}</td>
                        <td className="text-sm text-text-secondary">@{d.username || '-'}</td>
                        <td className="text-sm text-text-secondary">{d.mobile || '-'}</td>
                        <td>
                          <span className={`badge ${d.is_active ? 'badge-success' : 'badge-neutral'}`}>
                            {d.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                            {d.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm text-text-secondary">{formatDate(d.created_at)}</td>
                        <td className="text-right">
                          <button
                            onClick={() => toggleRow(d.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-light text-primary hover:bg-primary/20 transition-colors"
                          >
                            <span className="font-semibold">{d.downline_count}</span>
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded downline rows */}
            {distributors.map((d) => {
              if (!expandedRows.has(d.id)) return null;
              return (
                <div key={`${d.id}-detail`} className="bg-surface-hover/50 border-t border-border px-4 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-card rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted mb-1">Direct Downline</p>
                      <p className="text-lg font-bold text-text-primary">{d.downline_count}</p>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted mb-1">Member ID</p>
                      <p className="text-sm font-mono text-text-primary break-all">{d.member_id}</p>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted mb-1">Username</p>
                      <p className="text-sm text-text-primary">@{d.username || '-'}</p>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted mb-1">Joined</p>
                      <p className="text-sm text-text-primary">{formatDate(d.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Main view: 12 level cards
  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center">
            <Users size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Distributors</p>
            <p className="text-2xl font-bold text-text-primary">{totalDistributors}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-warning-light flex items-center justify-center">
            <Crown size={22} className="text-warning" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Levels Filled</p>
            <p className="text-2xl font-bold text-text-primary">{levels.filter(l => l.count > 0).length} / 12</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-success-light flex items-center justify-center">
            <TrendingUp size={22} className="text-success" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Highest Level</p>
            <p className="text-2xl font-bold text-text-primary">
              {levels.filter(l => l.count > 0).length > 0 ? `Level ${Math.max(...levels.filter(l => l.count > 0).map(l => l.level))}` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Level cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {levels.map((level) => {
          const pct = level.count > 0 ? (level.count / maxCount) * 100 : 0;
          return (
            <button
              key={level.level}
              onClick={() => setSelectedLevel(level.level)}
              className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-200 text-left"
            >
              {/* Flat header */}
              <div className="bg-primary px-4 py-3 flex items-center justify-between">
                <div className="text-white">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">Level</p>
                  <p className="text-2xl font-bold leading-tight">{level.level}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <Users size={18} className="text-white" />
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-xl font-bold text-text-primary">{level.count}</p>
                  <p className="text-xs text-text-muted">distributors</p>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">
                    {level.filled_seats}/{level.seat_capacity} seats
                  </span>
                  <span className="inline-flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View <span className="font-semibold">→</span>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
