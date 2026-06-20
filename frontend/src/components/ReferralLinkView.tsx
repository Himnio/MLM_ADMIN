'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import type { ReferralCodeItem, ReferralRegistrationItem } from '@/types';
import { Plus, Link, Copy, Users, ExternalLink, X, Search, Check, Loader2 } from 'lucide-react';

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
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-lg"><Plus size={20} className="text-primary" /></div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Create Referral Code</h2>
            <p className="text-xs text-text-muted mt-0.5">Generate a new referral link for tracking signups</p>
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
            <input value={codeName} onChange={e => setCodeName(e.target.value)}
              placeholder="e.g. john_admin"
              className="input" />
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn-primary">
            {creating ? (
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Creating...</span>
            ) : 'Create Code'}
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        {newCode && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
              <Check size={16} /> Code created successfully!
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-text-muted font-medium">Code:</span>
                <code className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 font-mono text-sm">{newCode.referral_code}</code>
                <button onClick={() => copyToClipboard(newCode.referral_code)} className="text-primary hover:text-primary-dark text-xs font-medium transition-colors flex items-center gap-1"><Copy size={12} /> Copy</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-text-muted font-medium">Link:</span>
                <a href={newCode.referral_link} target="_blank" className="text-primary hover:text-primary-dark underline truncate max-w-sm text-sm" rel="noreferrer">{newCode.referral_link}</a>
                <button onClick={() => copyToClipboard(newCode.referral_link, true)} className="text-primary hover:text-primary-dark text-xs font-medium transition-colors flex items-center gap-1 flex-shrink-0"><Copy size={12} /> Copy</button>
              </div>
            </div>
            {copied && <div className="mt-2 text-xs text-emerald-600 font-medium">Copied to clipboard!</div>}
          </div>
        )}
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg"><Link size={20} className="text-primary" /></div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Your Referral Codes</h2>
              <p className="text-xs text-text-muted mt-0.5">Manage and track your referral codes</p>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Search codes..."
              className="input pl-9 !py-2 text-sm w-48 sm:w-56" />
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
          <div className="overflow-x-auto -mx-6">
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
                        <button onClick={() => viewRegistrations(c.referral_code)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all">
                          <Users size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCode && typeof window === 'object' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-modal w-[90vw] max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary/10 rounded-lg"><Users size={18} className="text-primary" /></div>
                <h2 className="text-lg font-semibold text-text-primary truncate">
                  Registrations for <code className="bg-surface px-2 py-0.5 rounded text-primary font-mono">{selectedCode}</code>
                </h2>
                <span className="text-sm text-text-muted flex-shrink-0">({registrations.length})</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <a href={getReferralLink(selectedCode)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:text-primary-dark hover:bg-primary/10 rounded-lg transition-colors">
                  <ExternalLink size={14} /> Open Link
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
            <div className="flex-1 overflow-auto p-6">
              {regLoading ? (
                <div className="flex justify-center py-16"><div className="skeleton" /></div>
              ) : registrations.length === 0 ? (
                <div className="empty-state">
                  <Users size={56} className="text-border" />
                  <p className="text-lg font-medium text-text-primary">No registrations yet</p>
                  <p className="text-sm text-text-muted mt-1">Share this referral link to get signups.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
