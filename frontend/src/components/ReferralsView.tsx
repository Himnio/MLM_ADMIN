'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CommissionConfig, ReferralTreeResponse, TreeSummaryResponse, ReferralStatsResponse, IncomeProjectionResponse, LevelDetail, Member } from '@/types';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Commission Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Commission Configuration</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Income Amount</th>
                <th>Seat Capacity</th>
                <th>Commission %</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissionConfig.map(c => (
                <tr key={c.level}>
                  <td className="font-bold">Level {c.level}</td>
                  <td className="text-sm">{formatCurrency(c.income_amount)}</td>
                  <td className="text-sm">{c.seat_capacity} seats</td>
                  <td className="text-sm font-medium text-primary">{c.commission_percentage}%</td>
                  <td><span className={`px-2 py-1 rounded text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.is_active ? 'Yes' : 'No'}</span></td>
                  <td><button onClick={() => setShowConfigEdit(c)} className="text-sm text-primary hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tree Browser */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Referral Tree Browser</h3>
        <div className="flex gap-3 mb-6">
          <input
            type="text" value={memberId} onChange={e => setMemberId(e.target.value)}
            placeholder="Enter member ID..." className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={handleLoadTree} disabled={loading} className="btn-primary">{loading ? 'Loading...' : 'Load Tree'}</button>
        </div>

        {treeData && (
          <div className="space-y-6">
            {/* Tree Summary */}
            {treeSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Total Members</p><p className="text-lg font-bold">{treeSummary.total_members}</p></div>
                <div><p className="text-xs text-gray-500">Active</p><p className="text-lg font-bold text-green-600">{treeSummary.active_members}</p></div>
                <div><p className="text-xs text-gray-500">Total Levels</p><p className="text-lg font-bold text-primary">{treeSummary.total_levels}</p></div>
                <div><p className="text-xs text-gray-500">Total Income</p><p className="text-lg font-bold text-green-600">{formatCurrency(treeSummary.total_income)}</p></div>
              </div>
            )}

            {/* Referral Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-indigo-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Total Referrals</p><p className="text-lg font-bold text-primary">{stats.total_referrals}</p></div>
                <div><p className="text-xs text-gray-500">Direct</p><p className="text-lg font-bold">{stats.direct_referrals}</p></div>
                <div><p className="text-xs text-gray-500">Indirect</p><p className="text-lg font-bold">{stats.indirect_referrals}</p></div>
                <div><p className="text-xs text-gray-500">Max Depth</p><p className="text-lg font-bold text-purple-600">{stats.max_tree_depth}</p></div>
              </div>
            )}

            {/* Level Breakdown */}
            {treeSummary?.level_breakdown && (
              <div>
                <h4 className="font-semibold mb-3">Level Breakdown</h4>
                <div className="space-y-2">
                  {treeSummary.level_breakdown.map(lb => (
                    <div key={lb.level} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Level {lb.level}</p>
                        <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          <span>{lb.seat_filled}/{lb.seat_capacity} seats</span>
                          <span>{lb.percentage}% filled</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(lb.total_income)}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(lb.income_amount)}/seat</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tree Levels */}
            <div>
              <h4 className="font-semibold mb-3">Referral Levels</h4>
              <div className="space-y-2">
                {treeData.levels.map(level => (
                  <div key={level.level} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedLevels);
                        if (newExpanded.has(level.level)) newExpanded.delete(level.level);
                        else newExpanded.add(level.level);
                        setExpandedLevels(newExpanded);
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium">Level {level.level}</p>
                        <p className="text-xs text-gray-500">{level.total_members}/{level.seat_capacity} members</p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="font-semibold text-sm">{formatCurrency(level.actual_income)}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(level.potential_income)} potential</p>
                      </div>
                      {expandedLevels.has(level.level) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedLevels.has(level.level) && (
                      <div className="max-h-[300px] overflow-y-auto border-t border-gray-200">
                        {level.members.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 border-t border-gray-100 hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium">{m.full_name}</p>
                              <p className="text-xs text-gray-400">{m.member_code}</p>
                            </div>
                            <p className="text-sm font-semibold text-primary">{formatCurrency(level.income_per_seat)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Income Projection */}
            {projectionData && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold mb-3">Income Projection</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Actual Total</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(projectionData.total_actual)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Potential Total</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(projectionData.total_potential)}</p>
                  </div>
                </div>
                {projectionData.growth_projections.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Growth Scenarios</p>
                    <div className="space-y-1">
                      {projectionData.growth_projections.map((gp, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span>{gp.percentage}% growth</span>
                          <span className="font-semibold">{formatCurrency(gp.total_income)}</span>
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

      {/* Edit Config Modal */}
      {showConfigEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowConfigEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Edit Level {showConfigEdit.level} Commission</h2>
              <button onClick={() => setShowConfigEdit(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Income Amount</label>
        <input type="number" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Seat Capacity</label>
        <input type="number" value={seatCapacity} onChange={e => setSeatCapacity(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Commission Percentage</label>
        <input type="number" step="0.1" value={commissionPercentage} onChange={e => setCommissionPercentage(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="active" className="w-4 h-4 rounded border-gray-300" />
        <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
      </div>
      <div className="flex gap-3 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleSubmit} disabled={submitting} className="flex-1 btn-primary">{submitting ? 'Saving...' : 'Save'}</button>
      </div>
    </>
  );
}