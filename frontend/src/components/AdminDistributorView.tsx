'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Search, Users, ChevronRight, ChevronDown, Loader2, Shield,
  User, Mail, Phone, Calendar, MapPin, CreditCard, Building2, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface Distributor {
  id: string;
  member_id: string;
  username: string;
  first_name: string;
  last_name: string;
  mobile: string;
  gender: string;
  dob: string;
  address: string;
  email: string;
  pan_card_id: string;
  aadhaar_card: string;
  bank_account: string;
  bank_ifsc: string;
  bank_branch: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
}

interface TreeNode {
  distributor: any;
  downlines: any[];
}

export default function AdminDistributorView() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Distributor | null>(null);
  const [detailTree, setDetailTree] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDistributors = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ distributors: Distributor[]; total: number }>('/admin/distributors');
    if (res.success && res.data) {
      setDistributors(res.data.distributors || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDistributors(); }, [fetchDistributors]);

  const viewDetail = async (d: Distributor) => {
    setSelected(d);
    setDetailLoading(true);
    setDetailTree(null);
    const [treeRes] = await Promise.all([
      api.get<any>(`/admin/distributor-tree/${d.id}`),
    ]);
    if (treeRes.success && treeRes.data) {
      setDetailTree(treeRes.data);
    }
    setDetailLoading(false);
  };

  const toggleActive = async (id: string) => {
    setTogglingId(id);
    const res = await api.post(`/admin/distributors/${id}/toggle-active`);
    if (res.success) {
      setDistributors(prev => prev.map(d =>
        d.id === id ? { ...d, is_active: !d.is_active } : d
      ));
      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      }
    }
    setTogglingId(null);
  };

  const filtered = distributors.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.first_name?.toLowerCase().includes(q) ||
      d.last_name?.toLowerCase().includes(q) ||
      d.member_id?.toLowerCase().includes(q) ||
      d.username?.toLowerCase().includes(q) ||
      d.mobile?.includes(q) ||
      d.email?.toLowerCase().includes(q);
  });

  const fieldRow = (icon: React.ReactNode, label: string, value: string | undefined) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className="p-1.5 rounded-lg bg-surface text-text-muted flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary truncate">{value || '—'}</p>
      </div>
    </div>
  );

  const renderTreeNode = (node: any, isRoot = false) => (
    <div key={node.id} className="select-none">
      <div className={`flex items-center gap-2 p-2 rounded-lg border text-sm
        ${isRoot ? 'bg-primary/5 border-primary/20' : 'bg-white border-border'}
      `}>
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {node.first_name?.charAt(0)}{node.last_name?.charAt(0)}
        </div>
        <span className="flex-1 truncate font-medium text-text-primary">{node.first_name} {node.last_name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${node.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {node.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Search distributors..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <p className="text-sm text-text-muted">{distributors.length} total</p>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><div className="skeleton" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16">
            <div className="empty-state"><Users size={40} /><p>No distributors found</p></div>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map(d => (
                <div key={d.id} className="p-4 space-y-2 cursor-pointer hover:bg-surface-hover" onClick={() => viewDetail(d)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary truncate">{d.first_name} {d.last_name}</p>
                      <p className="text-xs text-text-secondary font-mono mt-0.5">{d.member_id}</p>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleActive(d.id)} disabled={togglingId === d.id}
                        className={`p-1.5 rounded-lg transition-colors ${d.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      >
                        {togglingId === d.id ? <Loader2 size={16} className="animate-spin" /> : d.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.is_active ? <span className="badge-success">Active</span> : <span className="badge-default">Inactive</span>}
                    <span className="text-xs text-text-muted">{d.mobile || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Member ID</th>
                    <th>Username</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="cursor-pointer hover:bg-surface-hover" onClick={() => viewDetail(d)}>
                      <td className="font-medium text-text-primary">{d.first_name} {d.last_name}</td>
                      <td className="font-mono text-sm text-text-secondary">{d.member_id}</td>
                      <td className="text-sm text-text-muted">@{d.username}</td>
                      <td className="text-sm text-text-secondary">{d.mobile}</td>
                      <td className="text-sm text-text-muted truncate max-w-[150px]">{d.email || '—'}</td>
                      <td>{d.is_active ? <span className="badge-success">Active</span> : <span className="badge-default">Inactive</span>}</td>
                      <td>
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleActive(d.id)} disabled={togglingId === d.id}
                            className={`btn-icon border border-border ${d.is_active ? 'text-emerald-500' : 'text-gray-400'}`}
                            title={d.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {togglingId === d.id ? <Loader2 size={14} className="animate-spin" /> : d.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button onClick={() => viewDetail(d)} className="btn-icon border border-border" title="View Details">
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setDetailTree(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-text-primary">{selected.first_name} {selected.last_name}</h2>
                <button
                  onClick={() => toggleActive(selected.id)}
                  disabled={togglingId === selected.id}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${selected.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}
                  `}
                >
                  {togglingId === selected.id ? '...' : selected.is_active ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                </button>
              </div>
              <button onClick={() => { setSelected(null); setDetailTree(null); }}
                className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <User size={15} /> Personal Information
                </h3>
                {fieldRow(<User size={15} />, 'Full Name', `${selected.first_name} ${selected.last_name}`)}
                {fieldRow(<Mail size={15} />, 'Email', selected.email)}
                {fieldRow(<Phone size={15} />, 'Mobile', selected.mobile)}
                {fieldRow(<Calendar size={15} />, 'Date of Birth', selected.dob)}
                {fieldRow(<MapPin size={15} />, 'Gender', selected.gender)}
                {fieldRow(<MapPin size={15} />, 'Address', selected.address)}
                {fieldRow(<CreditCard size={15} />, 'PAN Card', selected.pan_card_id)}
                {fieldRow(<Shield size={15} />, 'Aadhaar Card', selected.aadhaar_card)}
              </div>

              {(selected.bank_account || selected.bank_ifsc || selected.bank_branch) && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                    <Building2 size={15} /> Bank Details
                  </h3>
                  {fieldRow(<Building2 size={15} />, 'Account Number', selected.bank_account)}
                  {fieldRow(<Building2 size={15} />, 'IFSC Code', selected.bank_ifsc)}
                  {fieldRow(<Building2 size={15} />, 'Branch', selected.bank_branch)}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <Shield size={15} /> Account Info
                </h3>
                {fieldRow(<Shield size={15} />, 'Member ID', selected.member_id)}
                {fieldRow(<Shield size={15} />, 'Username', `@${selected.username}`)}
                {fieldRow(<Shield size={15} />, 'Referral Code Used', selected.referral_code)}
                {fieldRow(<Shield size={15} />, 'Registered', new Date(selected.created_at).toLocaleDateString())}
              </div>

              {/* Tree view */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <Users size={15} /> Distributor Tree
                </h3>
                {detailLoading ? (
                  <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary" /></div>
                ) : detailTree ? (
                  <div className="space-y-1">
                    {renderTreeNode(detailTree.distributor, true)}
                    {detailTree.downlines && detailTree.downlines.length > 0 && (
                      <div className="ml-4 pl-3 border-l-2 border-border space-y-1">
                        {detailTree.downlines.map((d: any) => renderTreeNode(d, false))}
                      </div>
                    )}
                    {(!detailTree.downlines || detailTree.downlines.length === 0) && (
                      <p className="text-xs text-text-muted py-2">No downline members</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted py-2">Loading tree...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
