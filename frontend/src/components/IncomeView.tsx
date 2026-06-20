'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Income, CommissionConfig, PaginationMeta } from '@/types';
import { Plus, X, ChevronLeft, ChevronRight, DollarSign, Settings } from 'lucide-react';

export default function IncomeView() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig[]>([]);
  const [showCalculate, setShowCalculate] = useState(false);
  const [showConfigEdit, setShowConfigEdit] = useState<CommissionConfig | null>(null);

  const fetchIncomes = useCallback(async () => {
    setLoading(true);
    const res = await api.get<any>('/income/statistics');
    if (res.success && res.data?.commission_config) setIncomes(res.data.commission_config.slice(0, 5));
    setLoading(false);
  }, [page]);

  useEffect(() => {
    Promise.all([
      api.get<CommissionConfig[]>('/income/commission/config'),
      fetchIncomes(),
    ]).then(([configRes]) => {
      if (configRes.success && configRes.data) setCommissionConfig(configRes.data);
    });
  }, [fetchIncomes]);

  const handleUpdateConfig = async (level: number, config: Partial<CommissionConfig>) => {
    const res = await api.put(`/income/commission/config/${level}`, config);
    if (res.success) {
      setCommissionConfig(prev => prev.map(c => c.level === level ? { ...c, ...config } : c));
      setShowConfigEdit(null);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg"><DollarSign size={20} className="text-primary" /></div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Commission Configuration</h3>
              <p className="text-xs text-text-muted">Manage MLM commission levels</p>
            </div>
          </div>
          <button onClick={() => setShowCalculate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Calculate Income
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Income Threshold</th>
                <th>Seat Capacity</th>
                <th>Commission %</th>
                <th>Active</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissionConfig.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Settings size={36} /><p>No commission config found</p></div></td></tr>
              ) : commissionConfig.map(c => (
                <tr key={c.level}>
                  <td className="font-bold text-text-primary">Level {c.level}</td>
                  <td className="text-sm text-text-secondary">{formatCurrency(c.income_amount)}</td>
                  <td className="text-sm text-text-secondary">{c.seat_capacity} seats</td>
                  <td className="font-semibold text-primary">{c.commission_percentage}%</td>
                  <td><span className={c.is_active ? 'badge-success' : 'badge-default'}>{c.is_active ? 'Yes' : 'No'}</span></td>
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
        <h3 className="text-lg font-semibold text-text-primary mb-1">Income Distribution History</h3>
        <p className="text-xs text-text-muted mb-4">Past income calculations and distributions</p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Level</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-16"><div className="skeleton mx-auto" /></td></tr>
              ) : (
                <tr><td colSpan={5}><div className="empty-state"><DollarSign size={36} /><p>Income history data available from member profile</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCalculate && <CalculateIncomeModal onClose={() => setShowCalculate(false)} />}

      {showConfigEdit && (
        <div className="modal-overlay" onClick={() => setShowConfigEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Edit Level {showConfigEdit.level}</h2>
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
        <label className="block text-sm font-medium text-text-secondary mb-1">Income Threshold</label>
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

function CalculateIncomeModal({ onClose }: { onClose: () => void }) {
  const [memberId, setMemberId] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [level, setLevel] = useState('1');
  const [transactionType, setTransactionType] = useState('registration');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async () => {
    setSubmitting(true);
    const res = await api.post('/income/calculate', {
      member_id: memberId,
      sponsor_id: sponsorId,
      level: parseInt(level),
      transaction_type: transactionType,
    });
    if (res.success) setResult(res.data);
    setSubmitting(false);
  };

  if (result) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Calculation Result</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs text-text-muted">Total Income</p>
            <p className="text-2xl font-bold text-emerald-600">₹{result.amount?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-text-muted">Level</p><p className="font-semibold text-text-primary">{result.level}</p></div>
            <div><p className="text-xs text-text-muted">Status</p><span className={result.status === 'success' ? 'badge-success' : 'badge-default'}>{result.status}</span></div>
          </div>
          <p className="text-sm text-text-secondary">{result.message}</p>
          <button onClick={onClose} className="btn-primary w-full">Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Calculate Income</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Member ID *</label>
            <input type="text" value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="UUID" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Sponsor ID *</label>
            <input type="text" value={sponsorId} onChange={e => setSponsorId(e.target.value)} placeholder="UUID" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Level</label>
            <select value={level} onChange={e => setLevel(e.target.value)} className="input">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Transaction Type</label>
            <select value={transactionType} onChange={e => setTransactionType(e.target.value)} className="input">
              <option value="registration">Registration</option>
              <option value="referral">Referral</option>
              <option value="upgrade">Upgrade</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCalculate} disabled={submitting || !memberId || !sponsorId} className="btn-primary flex-1">{submitting ? 'Calculating...' : 'Calculate'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
