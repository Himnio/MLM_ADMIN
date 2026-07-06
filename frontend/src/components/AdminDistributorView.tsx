'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  Search, Users, ChevronRight, ChevronDown, Loader2, Shield,
  User, Mail, Phone, Calendar, MapPin, CreditCard, Building2,
  ToggleLeft, ToggleRight, Trash2, Eye, Hash, CheckCircle, XCircle,
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
  id: string;
  first_name: string;
  last_name: string;
  member_id: string;
  is_active: boolean;
  downline_count: number;
}

function TreeBranch({
  node, depth, distributors, onViewDetail,
}: {
  node: TreeNode;
  depth: number;
  distributors: Distributor[];
  onViewDetail: (d: Distributor) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<TreeNode[] | null>(null);
  const [loadChild, setLoadChild] = useState(false);

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    if (children === null) {
      setLoadChild(true);
      const res = await api.get<{ downlines: TreeNode[] }>(`/admin/distributors/${node.id}/downline`);
      if (res.success && res.data) {
        setChildren(res.data.downlines || []);
      } else {
        setChildren([]);
      }
      setLoadChild(false);
    }
    setExpanded(true);
  };

  const hasChildren = node.downline_count > 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 p-2.5 border transition-all duration-200
          ${depth === 0 ? 'bg-primary/[0.04] border-primary/15 shadow-sm' : 'bg-white border-border hover:bg-gray-50 hover:shadow-sm'}
        `}
        style={{ borderRadius: '0.75rem', marginLeft: Math.min(depth * 20, 80) }}
      >
        <button onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(); }}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 flex-shrink-0
            ${hasChildren ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-700' : 'text-transparent cursor-default'}
          `}>
          {loadChild ? (
            <Loader2 size={13} className="animate-spin text-indigo-500" />
          ) : hasChildren ? (
            <ChevronRight size={15} className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
          ) : (
            <div className="w-[2px] h-[2px] rounded-full bg-gray-300" />
          )}
        </button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
          {node.first_name?.charAt(0)}{node.last_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{node.first_name} {node.last_name}</p>
          <p className="text-[11px] text-gray-500 font-mono truncate">{node.member_id}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasChildren && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{node.downline_count}</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${node.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {node.is_active ? 'On' : 'Off'}
          </span>
          <button onClick={(e) => { e.stopPropagation(); const d = distributors.find(x => x.id === node.id); if (d) onViewDetail(d); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="View Details">
            <Eye size={14} />
          </button>
        </div>
      </div>
      {expanded && children && children.length > 0 && (
        <div className="space-y-1 mt-1 ml-2 border-l-2 border-gray-200 pl-2 animate-slide-down">
          {children.map((child) => (
            <TreeBranch key={child.id} node={child} depth={depth + 1} distributors={distributors} onViewDetail={onViewDetail} />
          ))}
        </div>
      )}
      {expanded && children && children.length === 0 && (
        <p className="text-xs text-gray-400 py-1.5 italic" style={{ marginLeft: Math.min((depth + 1) * 20 + 28, 108) }}>
          No sub-distributors
        </p>
      )}
    </div>
  );
}

export default function AdminDistributorView() {
  const { admin } = useAuthStore();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Distributor | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Distributor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Distributor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [downlines, setDownlines] = useState<Record<string, TreeNode[]>>({});
  const [loadingDownlines, setLoadingDownlines] = useState<Set<string>>(new Set());

  const fetchDistributors = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ distributors: Distributor[]; total: number }>('/admin/distributors');
    if (res.success && res.data) {
      setDistributors(res.data.distributors || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDistributors(); }, [fetchDistributors]);

  const toggleExpand = async (id: string) => {
    if (expandedIds.has(id)) {
      setExpandedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      return;
    }
    if (!downlines[id]) {
      setLoadingDownlines(prev => new Set(prev).add(id));
      const res = await api.get<{ downlines: TreeNode[] }>(`/admin/distributors/${id}/downline`);
      if (res.success && res.data) {
        setDownlines(prev => ({ ...prev, [id]: res.data.downlines || [] }));
      } else {
        setDownlines(prev => ({ ...prev, [id]: [] }));
      }
      setLoadingDownlines(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
    setExpandedIds(prev => new Set(prev).add(id));
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const id = confirmDelete.id;
    setConfirmDelete(null);
    const res = await api.del(`/admin/distributors/${id}`);
    if (res.success) {
      setDistributors(prev => prev.filter(d => d.id !== id));
      if (selected?.id === id) setSelected(null);
    }
    setDeleting(false);
  };

  const viewDetail = useCallback((d: Distributor) => {
    setSelected(d);
  }, []);

  const confirmToggleActive = (d: Distributor) => setConfirmToggle(d);

  const executeToggle = async (id: string) => {
    setConfirmToggle(null);
    setTogglingId(id);
    const res = await api.post(`/admin/distributors/${id}/toggle-active`);
    if (res.success) {
      setDistributors(prev => prev.map(d =>
        d.id === id ? { ...d, is_active: !d.is_active } : d
      ));
      setDownlines(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].map(n =>
            n.id === id ? { ...n, is_active: !n.is_active } : n
          );
        }
        return next;
      });
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
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
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="p-1.5 rounded-lg bg-gray-50 text-gray-400 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, ID, username, mobile..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <p className="text-sm text-gray-500 font-medium whitespace-nowrap">{distributors.length} total</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex flex-col items-center gap-3 text-gray-400">
              <Users size={48} className="text-gray-300" />
              <p className="text-gray-500 font-medium">{search ? 'No matches found' : 'No distributors yet'}</p>
            </div>
          </div>
        ) : (
          filtered.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleExpand(d.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 flex-shrink-0 mt-0.5">
                    {loadingDownlines.has(d.id) ? (
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                    ) : (
                      <ChevronRight size={18} className={`transition-transform duration-200 ${expandedIds.has(d.id) ? 'rotate-90' : ''}`} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                        {d.first_name?.charAt(0)}{d.last_name?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{d.first_name} {d.last_name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{d.member_id} · @{d.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-1.5"><Phone size={12} />{d.mobile || '—'}</span>
                      {d.email && <span className="inline-flex items-center gap-1.5"><Mail size={12} />{d.email}</span>}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${d.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {d.is_active ? 'Payout On' : 'Payout Off'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => viewDetail(d)}
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="View Full Details">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => confirmToggleActive(d)} disabled={togglingId === d.id}
                      className={`p-2 rounded-lg transition-all ${d.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={d.is_active ? 'Disable Payout' : 'Enable Payout'}>
                      {togglingId === d.id ? <Loader2 size={18} className="animate-spin" /> : d.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    {isSuperAdmin && (
                      <button onClick={() => setConfirmDelete(d)}
                        className="p-2 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {expandedIds.has(d.id) && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-gray-100">
                  {downlines[d.id] ? (
                    downlines[d.id].length > 0 ? (
                      <div className="space-y-1.5 mt-3">
                        {downlines[d.id].map(child => (
                          <TreeBranch key={child.id} node={child} depth={1} distributors={distributors} onViewDetail={viewDetail} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-3 italic">No sub-distributors under {d.first_name}</p>
                    )
                  ) : (
                    loadingDownlines.has(d.id) ? (
                      <div className="flex justify-center py-3"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {selected.first_name?.charAt(0)}{selected.last_name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 truncate">{selected.first_name} {selected.last_name}</h2>
                  <p className="text-xs text-gray-500 font-mono">{selected.member_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <button onClick={() => setConfirmDelete(selected)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600" title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setSelected(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                  <XCircle size={18} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={14} /> Personal Information
                </h3>
                <div className="bg-gray-50 rounded-xl p-3">
                  {fieldRow(<User size={14} />, 'Full Name', `${selected.first_name} ${selected.last_name}`)}
                  {fieldRow(<Mail size={14} />, 'Email', selected.email)}
                  {fieldRow(<Phone size={14} />, 'Mobile', selected.mobile)}
                  {fieldRow(<Calendar size={14} />, 'Date of Birth', selected.dob)}
                  {fieldRow(<MapPin size={14} />, 'Gender', selected.gender)}
                  {fieldRow(<MapPin size={14} />, 'Address', selected.address)}
                  {fieldRow(<CreditCard size={14} />, 'PAN Card', selected.pan_card_id)}
                  {fieldRow(<Shield size={14} />, 'Aadhaar Card', selected.aadhaar_card)}
                </div>
              </div>
              {(selected.bank_account || selected.bank_ifsc || selected.bank_branch) && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 size={14} /> Bank Details
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-3">
                    {fieldRow(<Building2 size={14} />, 'Account Number', selected.bank_account)}
                    {fieldRow(<Building2 size={14} />, 'IFSC Code', selected.bank_ifsc)}
                    {fieldRow(<Building2 size={14} />, 'Branch', selected.bank_branch)}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield size={14} /> Account Info
                </h3>
                <div className="bg-gray-50 rounded-xl p-3">
                  {fieldRow(<Hash size={14} />, 'Member ID', selected.member_id)}
                  {fieldRow(<User size={14} />, 'Username', `@${selected.username}`)}
                  {fieldRow(<Hash size={14} />, 'Referral Code', selected.referral_code)}
                  {fieldRow(<Calendar size={14} />, 'Registered', new Date(selected.created_at).toLocaleDateString())}
                  {fieldRow(
                    selected.is_active ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-gray-400" />,
                    'Payout Status',
                    selected.is_active ? 'Eligible' : 'Not Eligible'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmToggle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmToggle(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-scale-in p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmToggle.is_active ? 'Disable Payout' : 'Enable Payout'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to {confirmToggle.is_active ? 'disable payout for' : 'enable payout for'} <strong>{confirmToggle.first_name} {confirmToggle.last_name}</strong> ({confirmToggle.member_id})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmToggle(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={() => executeToggle(confirmToggle.id)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${
                  confirmToggle.is_active ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}>
                {confirmToggle.is_active ? 'Disable Payout' : 'Enable Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-scale-in p-6" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Distributor?</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium text-center">This action cannot be undone!</p>
            </div>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to permanently delete <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong> ({confirmDelete.member_id})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50">Cancel</button>
              <button onClick={executeDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all">
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
