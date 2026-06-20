'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import type { ReferralCodeItem, ReferralRegistrationItem } from '@/types';
import { Plus, Link, Copy, Users, ExternalLink, X, Search, Check, Loader2, Trash2, AlertTriangle } from 'lucide-react';

export default function ReferralLinkView() {
  const [codes, setCodes] = useState<ReferralCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [codeName, setCodeName] = useState('');
  const [newCode, setNewCode] = useState<{ referral_code: string; referral_link: string } | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<ReferralRegistrationItem[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getReferralLink = (code: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/register?ref=${code}`;
    }
    return `/register?ref=${code}`;
  };

  const fetchCodes = async () => {
    setLoading(true);
    const res: any = await api.get('/admin/referral-codes');
    if (res.success && res.data) {
      setCodes(res.data.codes);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    setNewCode(null);
    const res: any = await api.post('/admin/referral', {
      created_by_username: codeName || undefined,
    });
    if (res.success && res.data) {
      setNewCode({
        referral_code: res.data.referral_code,
        referral_link: res.data.referral_link,
      });
      setCodeName('');
      fetchCodes();
    } else {
      setError(res.error || res.message || 'Failed to create code');
    }
    setCreating(false);
  };

  const handleDelete = async (code: string) => {
    setDeleting(true);
    const res = await api.del(`/admin/referral/${code}`);
    if (res.success) {
      setDeleteConfirm(null);
      setSelectedCode(null);
      fetchCodes();
    } else {
      setError(res.message || res.error || 'Failed to delete');
    }
    setDeleting(false);
  };

  const viewRegistrations = async (code: string) => {
    setSelectedCode(code);
    setRegLoading(true);
    const res: any = await api.get(`/admin/referral/${code}/registrations`);
    if (res.success && res.data) {
      setRegistrations(res.data.registrations || []);
    } else {
      setRegistrations([]);
    }
    setRegLoading(false);
  };

  const closeModal = useCallback(() => setSelectedCode(null), []);

  useEffect(() => {
    if (selectedCode) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedCode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal]);

  const copyToClipboard = async (text: string, isLink?: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isLink) {
        setCopiedLink(text);
        setTimeout(() => setCopiedLink(null), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* fallback */ }
  };

  const filteredCodes = codes.filter(c =>
    c.referral_code.toLowerCase().includes(filter.toLowerCase()) ||
    c.created_by_username.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Create Code Card */}
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="p-2.5 bg-primary/10 rounded-lg"><Plus size={20} className="text-primary" /></div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-text-primary">Create Referral Code</h2>
            <p className="text-xs text-text-muted mt-0.5">Generate a new referral link for tracking signups</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
            <input value={codeName} onChange={e => setCodeName(e.target.value)}
              placeholder="e.g. john_admin"
              className="input" />
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn-primary sm:w-auto">
            {creating ? (
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Creating...</span>
            ) : 'Create Code'}
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        {newCode && (
          <div className="mt-4 p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
              <Check size={16} /> Code created successfully!
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="text-text-muted font-medium">Code:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 font-mono text-xs sm:text-sm break-all">{newCode.referral_code}</code>
                  <button onClick={() => copyToClipboard(newCode.referral_code)} className="text-primary hover:text-primary-dark text-xs font-medium transition-colors flex items-center gap-1 flex-shrink-0"><Copy size={12} /> Copy</button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="text-text-muted font-medium">Link:</span>
                <div className="flex items-center gap-2 min-w-0">
                  <a href={newCode.referral_link} target="_blank" className="text-primary hover:text-primary-dark underline truncate text-xs sm:text-sm" rel="noreferrer">{newCode.referral_link}</a>
                  <button onClick={() => copyToClipboard(newCode.referral_link, true)} className="text-primary hover:text-primary-dark text-xs font-medium transition-colors flex items-center gap-1 flex-shrink-0"><Copy size={12} /> Copy</button>
                </div>
              </div>
            </div>
            {copied && <div className="mt-2 text-xs text-emerald-600 font-medium">Copied to clipboard!</div>}
          </div>
        )}
      </div>

      {/* Codes List */}
      <div className="stat-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-5 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg"><Link size={20} className="text-primary" /></div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-text-primary">Your Referral Codes</h2>
              <p className="text-xs text-text-muted mt-0.5">Manage and track your referral codes</p>
            </div>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Search codes..."
              className="input pl-9 !py-2 text-sm w-full sm:w-56" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="skeleton" /></div>
        ) : filteredCodes.length === 0 ? (
          <div className="empty-state">
            <Link size={48} />
            <p>{codes.length === 0 ? 'No referral codes found. Create one above!' : 'No codes match your search.'}</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {filteredCodes.map(c => {
                const link = getReferralLink(c.referral_code);
                return (
                  <div key={c.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <code className="inline-block bg-surface px-2 py-1 rounded-md text-sm font-mono text-text-primary break-all">{c.referral_code}</code>
                        <p className="text-xs text-text-secondary mt-1">{c.created_by_username}</p>
                      </div>
                      <span className={c.is_active ? 'badge-success' : 'badge-default flex-shrink-0'}>{c.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Signups: <strong className="text-text-primary">{c.registrations_count}</strong></span>
                      <span className="text-text-muted text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => viewRegistrations(c.referral_code)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all">
                        <Users size={14} /> View
                      </button>
                      <button onClick={() => setDeleteConfirm(c.referral_code)}
                        className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto -mx-6">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Creator</th>
                    <th className="hidden lg:table-cell">Referral Link</th>
                    <th className="hidden sm:table-cell">Created</th>
                    <th>Status</th>
                    <th className="text-center">Signups</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCodes.map(c => {
                    const link = getReferralLink(c.referral_code);
                    return (
                      <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                        <td><code className="bg-surface px-2.5 py-1 rounded-md text-sm font-mono text-text-primary">{c.referral_code}</code></td>
                        <td className="text-sm text-text-secondary">{c.created_by_username}</td>
                        <td className="hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 max-w-[280px]">
                            <a href={link} target="_blank" className="text-primary hover:text-primary-dark underline truncate text-sm" title={link} rel="noreferrer">{link}</a>
                            <button onClick={() => copyToClipboard(link, true)} className="shrink-0 p-1 hover:bg-surface-hover rounded transition-colors" title="Copy link">
                              <Copy size={14} className="text-text-muted" />
                            </button>
                            {copiedLink === link && <span className="text-xs text-emerald-600 font-medium shrink-0">Copied!</span>}
                          </div>
                        </td>
                        <td className="text-sm text-text-muted hidden sm:table-cell">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td><span className={c.is_active ? 'badge-success' : 'badge-default'}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="text-center"><span className="text-sm font-semibold text-text-primary">{c.registrations_count}</span></td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => viewRegistrations(c.referral_code)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all">
                              <Users size={14} /> View
                            </button>
                            <button onClick={() => setDeleteConfirm(c.referral_code)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete code">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl w-[90vw] max-w-md shadow-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Delete Referral Code?</h3>
                <p className="text-sm text-text-secondary mt-2">
                  This will permanently delete the code <code className="bg-surface px-2 py-0.5 rounded text-sm font-mono text-text-primary">{deleteConfirm}</code>
                  {' '}and all <strong>{codes.find(c => c.referral_code === deleteConfirm)?.registrations_count || 0}</strong> associated registrations. This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="btn-secondary flex-1 order-2 sm:order-1">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="btn-danger flex-1 order-1 sm:order-2">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {selectedCode && typeof window === 'object' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-border shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0"><Users size={18} className="text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-lg font-semibold text-text-primary truncate">
                    Registrations for <code className="bg-surface px-1.5 sm:px-2 py-0.5 rounded text-primary font-mono text-xs sm:text-sm">{selectedCode}</code>
                  </h2>
                </div>
                <span className="text-xs sm:text-sm text-text-muted flex-shrink-0 ml-auto sm:ml-0">({registrations.length})</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
                <a href={getReferralLink(selectedCode)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-primary hover:text-primary-dark hover:bg-primary/10 rounded-lg transition-colors">
                  <ExternalLink size={14} /> <span className="hidden sm:inline">Open Link</span>
                </a>
                <button onClick={() => { navigator.clipboard.writeText(getReferralLink(selectedCode)); }}
                  className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary" title="Copy link">
                  <Copy size={16} />
                </button>
                <button onClick={closeModal} className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              {regLoading ? (
                <div className="flex justify-center py-16"><div className="skeleton" /></div>
              ) : registrations.length === 0 ? (
                <div className="empty-state">
                  <Users size={56} className="text-border" />
                  <p className="text-lg font-medium text-text-primary">No registrations yet</p>
                  <p className="text-sm text-text-muted mt-1">Share this referral link to get signups.</p>
                </div>
              ) : (
                <>
                  {/* Mobile registration cards */}
                  <div className="sm:hidden space-y-3">
                    {registrations.map(r => (
                      <div key={r.id} className="border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-text-primary">{r.name}</p>
                          <span className="text-xs text-text-muted">{new Date(r.registered_at).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <span className="text-text-muted">Username:</span><span className="text-text-primary">{r.username}</span>
                          <span className="text-text-muted">Email:</span><span className="text-text-primary truncate">{r.email}</span>
                          <span className="text-text-muted">PAN:</span><span className="text-text-primary font-mono">{r.pan_card_id}</span>
                          <span className="text-text-muted">Full Name:</span><span className="text-text-primary">{r.full_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop registration table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th className="hidden sm:table-cell">Username</th>
                          <th className="hidden md:table-cell">Email</th>
                          <th className="hidden lg:table-cell">PAN Card</th>
                          <th>Full Name</th>
                          <th className="hidden sm:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {registrations.map(r => (
                          <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                            <td className="text-sm font-medium text-text-primary">{r.name}</td>
                            <td className="text-sm text-text-secondary hidden sm:table-cell">{r.username}</td>
                            <td className="text-sm text-text-secondary hidden md:table-cell">{r.email}</td>
                            <td className="text-sm font-mono text-text-secondary hidden lg:table-cell">{r.pan_card_id}</td>
                            <td className="text-sm text-text-secondary">{r.full_name}</td>
                            <td className="text-sm text-text-muted hidden sm:table-cell">{new Date(r.registered_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
