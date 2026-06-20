'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Member, MemberWithDownlineCount, CreateMemberInput, UpdateMemberInput, PaginationMeta } from '@/types';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, X, UserPlus, Users } from 'lucide-react';

export default function MembersView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Member | null>(null);
  const [showDetail, setShowDetail] = useState<Member | null>(null);
  const [detailDownline, setDetailDownline] = useState<MemberWithDownlineCount[]>([]);
  const [detailUpline, setDetailUpline] = useState<Member[]>([]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    let path = `/members?page=${page}&limit=15`;
    if (statusFilter) path += `&status=${statusFilter}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    const res = await api.get<Member[]>(path);
    if (res.success && res.data) {
      setMembers(res.data);
      if (res.meta) setMeta(res.meta);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleCreate = async (input: CreateMemberInput) => {
    const res = await api.post<Member>('/members', input);
    if (res.success) {
      setShowCreate(false);
      fetchMembers();
    }
    return res;
  };

  const handleUpdate = async (id: string, input: UpdateMemberInput) => {
    const res = await api.put<Member>(`/members/${id}`, input);
    if (res.success) {
      setShowEdit(null);
      fetchMembers();
    }
    return res;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    const res = await api.del(`/members/${id}`);
    if (res.success) fetchMembers();
  };

  const viewDetail = async (member: Member) => {
    setShowDetail(member);
    const [downlineRes, uplineRes] = await Promise.all([
      api.get<MemberWithDownlineCount[]>(`/members/${member.id}/downline`),
      api.get<Member[]>(`/members/${member.id}/upline`),
    ]);
    if (downlineRes.success && downlineRes.data) setDetailDownline(downlineRes.data);
    if (uplineRes.success && uplineRes.data) setDetailUpline(uplineRes.data);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'badge-success',
      inactive: 'badge-default',
      pending: 'badge-warning',
      suspended: 'badge-danger',
    };
    return <span className={colors[status] || 'badge-default'}>{status}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text" placeholder="Search members..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input min-w-[130px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Member
        </button>
      </div>

      <div className="stat-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Email</th>
                <th className="hidden sm:table-cell">Phone</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16"><div className="skeleton mx-auto" /></td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><Users size={40} /><p>No members found</p></div></td></tr>
              ) : members.map(m => (
                <tr key={m.id} className="cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => viewDetail(m)}>
                  <td className="font-mono text-sm">{m.member_code}</td>
                  <td className="font-medium text-text-primary">{m.full_name}</td>
                  <td className="text-sm text-text-secondary">{m.email}</td>
                  <td className="text-sm text-text-secondary hidden sm:table-cell">{m.phone || '-'}</td>
                  <td>{statusBadge(m.status)}</td>
                  <td className="text-sm text-text-muted hidden md:table-cell">{new Date(m.joined_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setShowEdit(m)} className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-primary transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-text-muted hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-text-muted">Showing {((meta.page - 1) * meta.limit) + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}</p>
            <div className="flex items-center gap-2">
              <button disabled={!meta.has_prev} onClick={() => setPage(p => p - 1)} className="btn-icon" aria-label="Previous"><ChevronLeft size={16} /></button>
              <span className="text-sm font-medium px-2 text-text-primary">{meta.page} / {meta.total_pages}</span>
              <button disabled={!meta.has_next} onClick={() => setPage(p => p + 1)} className="btn-icon" aria-label="Next"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <MemberFormModal title="Add New Member" onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
      {showEdit && <MemberFormModal title="Edit Member" member={showEdit} onClose={() => setShowEdit(null)} onSubmit={(i) => handleUpdate(showEdit.id, i)} />}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">{showDetail.full_name}</h2>
              <button onClick={() => setShowDetail(null)} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-text-muted">Code</p><p className="font-mono text-sm text-text-primary">{showDetail.member_code}</p></div>
                <div><p className="text-xs text-text-muted">Status</p>{statusBadge(showDetail.status)}</div>
                <div><p className="text-xs text-text-muted">Email</p><p className="text-sm text-text-primary">{showDetail.email}</p></div>
                <div><p className="text-xs text-text-muted">Phone</p><p className="text-sm text-text-primary">{showDetail.phone || '-'}</p></div>
                <div><p className="text-xs text-text-muted">Joined</p><p className="text-sm text-text-primary">{new Date(showDetail.joined_at).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-text-muted">Sponsor ID</p><p className="text-sm font-mono text-text-primary">{showDetail.sponsor_id || '-'}</p></div>
              </div>
              {detailUpline.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2"><Users size={16} /> Upline Chain</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {detailUpline.map((u, i) => (
                      <span key={u.id} className="text-sm">
                        <span className="text-primary font-medium">{u.full_name}</span>
                        {i < detailUpline.length - 1 && <span className="text-border mx-1">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detailDownline.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2"><UserPlus size={16} /> Downline ({detailDownline.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailDownline.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{d.full_name}</p>
                          <p className="text-xs text-text-muted">{d.member_code}</p>
                        </div>
                        <span className="text-xs text-text-muted ml-2">{d.downline_count} downline</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberFormModal({ title, member, onClose, onSubmit }: {
  title: string;
  member?: Member;
  onClose: () => void;
  onSubmit: (input: CreateMemberInput) => Promise<any>;
}) {
  const [fullName, setFullName] = useState(member?.full_name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [sponsorId, setSponsorId] = useState(member?.sponsor_id || '');
  const [status, setStatus] = useState<Member['status']>(member?.status || 'active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    setError('');
    const input: CreateMemberInput = { full_name: fullName, email: email || undefined, phone: phone || undefined, sponsor_id: sponsorId || undefined };
    const res = await onSubmit(input);
    if (!res.success) setError(res.message || res.error || 'Failed to save');
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+1234567890" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Sponsor ID</label>
            <input type="text" value={sponsorId} onChange={e => setSponsorId(e.target.value)} className="input" placeholder="UUID of sponsor" />
          </div>
          {member && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Member['status'])} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving...' : member ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
