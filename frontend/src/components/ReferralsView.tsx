'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CommissionConfig, ReferralTreeResponse, TreeSummaryResponse, ReferralStatsResponse, IncomeProjectionResponse } from '@/types';
import { ChevronDown, ChevronUp, X, TreePine, Settings, Users, DollarSign, BarChart3 } from 'lucide-react';

export default function ReferralsView() {
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig[]>([]);
  const [memberId, setMemberId] = useState('');
  const [treeData, setTreeData] = useState<ReferralTreeResponse | null>(null);
  const [treeSummary, setTreeSummary] = useState<TreeSummaryResponse | null>(null);
  const [projectionData, setProjectionData] = useState<IncomeProjectionResponse | null>(null);
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfigEdit, setShowConfigEdit] = useState<CommissionConfig | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchCommissionConfig = async () => {
      const res = await api.get<CommissionConfig[]>('/referrals/commission-config');
      if (res.success && res.data) setCommissionConfig(res.data);
    };
    fetchCommissionConfig();
  }, []);

  const handleLoadTree = async () => {
    if (!memberId.trim()) return;
    setLoading(true);
    const [treeRes, summaryRes, projRes, statsRes] = await Promise.all([
      api.get<ReferralTreeResponse>(`/referrals/${memberId}/downline`),
      api.get<TreeSummaryResponse>(`/referrals/${memberId}/summary`),
      api.get<IncomeProjectionResponse>(`/referrals/${memberId}/income-projection`),
      api.get<ReferralStatsResponse>(`/referrals/${memberId}/stats`),
    ]);
    if (treeRes.success && treeRes.data) setTreeData(treeRes.data);
    if (summaryRes.success && summaryRes.data) setTreeSummary(summaryRes.data);
    if (projRes.success && projRes.data) setProjectionData(projRes.data);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    setLoading(false);
    setExpandedLevels(new Set());
  };

  const handleUpdateConfig = async (level: number, config: Partial<CommissionConfig>) => {
    const res = await api.put(`/referrals/commission-config/${level}`, config);
    if (res.success) {
      setCommissionConfig(prev => prev.map(c => c.level === level ? { ...c, ...config } : c));
      setShowConfigEdit(null);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-primary/10 rounded-lg"><Settings size={20} className="text-primary" /></div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Commission Configuration</h3>
            <p className="text-xs text-text-muted">MLM commission rate structure by level</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Income Amount</th>
                <th>Seat Capacity</th>
                <th>Commission %</th>
                <th>Active</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissionConfig.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Settings size={36} /><p>No config found</p></div></td></tr>
              ) : commissionConfig.map(c => (
                <tr key={c.level}>
                  <td className="font-bold text-text-primary">Level {c.level}</td>
                  <td className="text-sm text-text-secondary">{formatCurrency(c.income_amount)}</td>
                  <td className="text-sm text-text-secondary">{c.seat_capacity} seats</td>
                  <td className="text-sm font-medium text-primary">{c.commission_percentage}%</td>
                  <td><span className={c.is_active ? 'badge-success' : 'badge-default'}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-right">
                    <button onClick={() => setShowConfigEdit(c)} className="text-sm text-primary hover:text-primary-dark font-medium transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-primary/10 rounded-lg"><TreePine size={20} className="text-primary" /></div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Referral Tree Browser</h3>
            <p className="text-xs text-text-muted">Explore the referral hierarchy for any member</p>
          </div>
        </div>
        <div className="flex gap-3 mb-6">
          <input
            type="text" value={memberId} onChange={e => setMemberId(e.target.value)}
            placeholder="Enter member ID..." className="input flex-1"
            onKeyDown={e => e.key === 'Enter' && handleLoadTree()}
          />
          <button onClick={handleLoadTree} disabled={loading} className="btn-primary">{loading ? 'Loading...' : 'Load Tree'}</button>
        </div>

        {treeData && (
          <div className="space-y-6">
            {treeSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-surface rounded-lg">
                <div><p className="text-xs text-text-muted">Total Members</p><p className="text-lg font-bold text-text-primary">{treeSummary.total_members}</p></div>
                <div><p className="text-xs text-text-muted">Active</p><p className="text-lg font-bold text-emerald-600">{treeSummary.active_members}</p></div>
                <div><p className="text-xs text-text-muted">Total Levels</p><p className="text-lg font-bold text-primary">{treeSummary.total_levels}</p></div>
                <div><p className="text-xs text-text-muted">Total Income</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(treeSummary.total_income)}</p></div>
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-indigo-50 rounded-lg">
                <div><p className="text-xs text-text-muted">Total Referrals</p><p className="text-lg font-bold text-primary">{stats.total_referrals}</p></div>
                <div><p className="text-xs text-text-muted">Direct</p><p className="text-lg font-bold text-text-primary">{stats.direct_referrals}</p></div>
                <div><p className="text-xs text-text-muted">Indirect</p><p className="text-lg font-bold text-text-primary">{stats.indirect_referrals}</p></div>
                <div><p className="text-xs text-text-muted">Max Depth</p><p className="text-lg font-bold text-purple-600">{stats.max_tree_depth}</p></div>
              </div>
            )}

            {treeSummary?.level_breakdown && (
              <div>
                <h4 className="font-semibold text-text-primary mb-3">Level Breakdown</h4>
                <div className="space-y-2">
                  {treeSummary.level_breakdown.map(lb => (
                    <div key={lb.level} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary">Level {lb.level}</p>
                        <div className="flex gap-4 text-xs text-text-muted mt-1">
                          <span>{lb.seat_filled}/{lb.seat_capacity} seats</span>
                          <span>{lb.percentage}% filled</span>
                        </div>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="font-semibold text-text-primary">{formatCurrency(lb.total_income)}</p>
                        <p className="text-xs text-text-muted">{formatCurrency(lb.income_amount)}/seat</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-text-primary mb-3">Referral Levels</h4>
              <div className="space-y-2">
                {treeData.levels.map(level => (
                  <div key={level.level} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedLevels);
                        if (newExpanded.has(level.level)) newExpanded.delete(level.level);
                        else newExpanded.add(level.level);
                        setExpandedLevels(newExpanded);
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-surface-hover transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium text-text-primary">Level {level.level}</p>
                        <p className="text-xs text-text-muted">{level.total_members}/{level.seat_capacity} members</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-sm text-text-primary">{formatCurrency(level.actual_income)}</p>
                          <p className="text-xs text-text-muted">{formatCurrency(level.potential_income)} potential</p>
                        </div>
                        {expandedLevels.has(level.level) ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                      </div>
                    </button>
                    {expandedLevels.has(level.level) && (
                      <div className="max-h-[300px] overflow-y-auto border-t border-border">
                        {level.members.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 border-t border-border hover:bg-surface-hover">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{m.full_name}</p>
                              <p className="text-xs text-text-muted">{m.member_code}</p>
                            </div>
                            <p className="text-sm font-semibold text-primary ml-2">{formatCurrency(level.income_per_seat)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {projectionData && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-semibold text-emerald-800 mb-3">Income Projection</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-text-muted">Actual Total</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(projectionData.total_actual)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Potential Total</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(projectionData.total_potential)}</p>
                  </div>
                </div>
                {projectionData.growth_projections.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Growth Scenarios</p>
                    <div className="space-y-1">
                      {projectionData.growth_projections.map((gp, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">{gp.percentage}% growth</span>
                          <span className="font-semibold text-text-primary">{formatCurrency(gp.total_income)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showConfigEdit && (
        <div className="modal-overlay" onClick={() => setShowConfigEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Edit Level {showConfigEdit.level} Commission</h2>
              <button onClick={() => setShowConfigEdit(null)} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <ConfigEditForm config={showConfigEdit} onSave={(updated) => handleUpdateConfig(showConfigEdit.level, updated)} onClose={() => setShowConfigEdit(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigEditForm({ config, onSave, onClose }: {
  config: CommissionConfig;
  onSave: (updated: Partial<CommissionConfig>) => void;
  onClose: () => void;
}) {
  const [incomeAmount, setIncomeAmount] = useState(config.income_amount.toString());
  const [seatCapacity, setSeatCapacity] = useState(config.seat_capacity.toString());
  const [commissionPercentage, setCommissionPercentage] = useState(config.commission_percentage.toString());
  const [isActive, setIsActive] = useState(config.is_active);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSave({
      income_amount: parseFloat(incomeAmount),
      seat_capacity: parseInt(seatCapacity),
      commission_percentage: parseFloat(commissionPercentage),
      is_active: isActive,
    });
    setSubmitting(false);
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Income Amount</label>
        <input type="number" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Seat Capacity</label>
        <input type="number" value={seatCapacity} onChange={e => setSeatCapacity(e.target.value)} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Commission Percentage</label>
        <input type="number" step="0.1" value={commissionPercentage} onChange={e => setCommissionPercentage(e.target.value)} className="input" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="active" className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
        <label htmlFor="active" className="text-sm font-medium text-text-secondary">Active</label>
      </div>
      <div className="flex gap-3 pt-4">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : 'Save'}</button>
      </div>
    </>
  );
}
