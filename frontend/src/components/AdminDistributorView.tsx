'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  Search, Users, ChevronRight, ChevronDown, Loader2, Shield,
  User, Mail, Phone, Calendar, MapPin, CreditCard, Building2, ToggleLeft, ToggleRight, Trash2,
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
  const { admin } = useAuthStore();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Distributor | null>(null);
  const [detailTree, setDetailTree] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Distributor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Distributor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDistributors = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ distributors: Distributor[]; total: number }>('/admin/distributors');
    if (res.success && res.data) {
      setDistributors(res.data.distributors || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDistributors(); }, [fetchDistributors]);

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setDeleting(true);
    setConfirmDelete(null);
    const res = await api.del(`/admin/distributors/${id}`);
    if (res.success) {
      setDistributors(prev => prev.filter(d => d.id !== id));
      if (selected?.id === id) {
        setSelected(null);
        setDetailTree(null);
      }
    }
    setDeleting(false);
  };

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

  const confirmToggleActive = (d: Distributor) => {
    setConfirmToggle(d);
  };

  const executeToggle = async (id: string) => {
    setConfirmToggle(null);
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

  interface TreeNode {
    id: string;
    first_name: string;
    last_name: string;
    member_id: string;
    is_active: boolean;
    downline_count: number;
  }

  function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState<TreeNode[] | null>(null);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
      if (expanded) { setExpanded(false); return; }
      if (children === null) {
        setLoading(true);
        const res = await api.get<{ downlines: TreeNode[] }>(`/admin/distributors/${node.id}/downline`);
        if (res.success && res.data) {
          setChildren(res.data.downlines || []);
        } else {
          setChildren([]);
        }
        setLoading(false);
      }
      setExpanded(true);
    };

    const hasChildren = node.downline_count > 0;

    return (
      <div className="select-none">
        <div
          onClick={hasChildren ? toggle : undefined}
          className={`flex items-center gap-2 p-2 rounded-lg border text-sm cursor-default transition-all
            ${depth === 0 ? 'bg-primary/5 border-primary/20' : 'bg-white border-border hover:bg-surface-hover'}
          `}
          style={{ marginLeft: depth * 16 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(); }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors
              ${hasChildren ? 'text-text-muted hover:bg-surface-hover' : 'text-transparent cursor-default'}
            `}
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : hasChildren ? (
              <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            ) : null}
          </button>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {node.first_name?.charAt(0)}{node.last_name?.charAt(0)}
          </div>
          <span className="flex-1 truncate font-medium text-text-primary min-w-0">
            {node.first_name} {node.last_name}
          </span>
          {hasChildren && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium flex-shrink-0">
              {node.downline_count}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${node.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {node.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {expanded && children && children.length > 0 && (
          <div className="space-y-1 mt-1">
            {children.map((child) => (
              <TreeBranch key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
        {expanded && children && children.length === 0 && (
          <p className="text-xs text-text-muted py-1" style={{ marginLeft: (depth + 1) * 16 + 24 }}>
            No sub-distributors
          </p>
        )}
      </div>
    );
  }

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
                      <button onClick={() => confirmToggleActive(d)} disabled={togglingId === d.id}
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
                          <button onClick={() => confirmToggleActive(d)} disabled={togglingId === d.id}
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
                  onClick={() => confirmToggleActive(selected)}
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
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <button onClick={() => setConfirmDelete(selected)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600"
                    title="Delete distributor">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => { setSelected(null); setDetailTree(null); }}
                  className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted">
                  ✕
                </button>
              </div>
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
                <p className="text-xs text-text-muted mb-3">
                  Click on a distributor to expand and view their sub-distributors.
                </p>
                {detailTree && detailTree.distributor ? (
                  <div className="bg-surface rounded-xl p-3 space-y-1">
                    <TreeBranch node={detailTree.distributor} depth={0} />
                  </div>
                ) : detailLoading ? (
                  <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary" /></div>
                ) : (
                  <p className="text-xs text-text-muted py-2">Select a distributor to view their tree.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmToggle && (
        <div className="modal-overlay" onClick={() => setConfirmToggle(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-modal animate-scale-in p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {confirmToggle.is_active ? 'Deactivate Distributor' : 'Activate Distributor'}
            </h3>
            <p className="text-sm text-text-muted mb-6">
              Are you sure you want to {confirmToggle.is_active ? 'deactivate' : 'activate'} <strong>{confirmToggle.first_name} {confirmToggle.last_name}</strong> ({confirmToggle.member_id})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmToggle(null)} className="flex-1 btn-ghost py-2.5">Cancel</button>
              <button onClick={() => executeToggle(confirmToggle.id)}
                className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-all ${
                  confirmToggle.is_active
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {confirmToggle.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-modal animate-scale-in p-6" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary text-center mb-2">Delete Distributor?</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium text-center">
                ⚠ This action cannot be undone!
              </p>
            </div>
            <p className="text-sm text-text-muted text-center mb-6">
              Are you sure you want to permanently delete <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong> ({confirmDelete.member_id})? This will remove the distributor, their referral codes, and all associated data from the system completely.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="flex-1 btn-ghost py-2.5">Cancel</button>
              <button onClick={executeDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
