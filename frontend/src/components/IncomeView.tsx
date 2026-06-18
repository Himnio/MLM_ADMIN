'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Income, CommissionConfig, PaginationMeta } from '@/types';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

export default function IncomeView() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig[]>([]);
  const [showCalculate, setShowCalculate] = useState(false);
  const [showConfigEdit, setShowConfigEdit] = useState<CommissionConfig | null>(null);

  const fetchIncomes = useCallback(async () => {
    setLoading(true);
    let path = `/income/member/:member_id/history?page=${page}&limit=20`;
    // For demo, let's fetch income statistics instead
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
    <div className="space-y-6">
      {/* Commission Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Commission Configuration</h3>
          <button onClick={() => setShowCalculate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Calculate Income
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissionConfig.map(c => (
                <tr key={c.level}>
                  <td className="font-bold">Level {c.level}</td>
                  <td className="text-sm">{formatCurrency(c.income_amount)}</td>
                  <td className="text-sm">{c.seat_capacity} seats</td>
                  <td className="font-semibold text-primary">{c.commission_percentage}%</td>
                  <td><span className={`px-2 py-1 rounded text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.is_active ? 'Yes' : 'No'}</span></td>
                  <td><button onClick={() => setShowConfigEdit(c)} className="text-sm text-primary hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Income History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Income Distribution History</h3>
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
                <tr><td colSpan={5} className="text-center py-12"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Income history data coming from member profile</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculate Income Modal */}
      {showCalculate && <CalculateIncomeModal onClose={() => setShowCalculate(false)} />}

      {/* Edit Config Modal */}
      {showConfigEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowConfigEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Edit Level {showConfigEdit.level}</h2>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Income Threshold</label>
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Calculation Result</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600">Total Income</p>
            <p className="text-2xl font-bold text-green-600">₹{result.amount?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500">Level</p><p className="font-semibold">{result.level}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><p className="font-semibold">{result.status}</p></div>
          </div>
          <p className="text-sm text-gray-600">{result.message}</p>
          <button onClick={onClose} className="w-full btn-primary">Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Calculate Income</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member ID *</label>
            <input type="text" value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="UUID" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor ID *</label>
            <input type="text" value={sponsorId} onChange={e => setSponsorId(e.target.value)} placeholder="UUID" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select value={level} onChange={e => setLevel(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select value={transactionType} onChange={e => setTransactionType(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
              <option value="registration">Registration</option>
              <option value="referral">Referral</option>
              <option value="upgrade">Upgrade</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleCalculate} disabled={submitting || !memberId || !sponsorId} className="flex-1 btn-primary">{submitting ? 'Calculating...' : 'Calculate'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}