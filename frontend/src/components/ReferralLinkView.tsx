'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import type { ReferralCodeItem, ReferralRegistrationItem } from '@/types';

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
        referral_link: res.data.referral_link 
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
    if (selectedCode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Create Code Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-indigo-50 rounded-lg"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
          <h2 className="text-lg font-bold text-gray-900">Create Referral Code</h2>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Display Name</label>
            <div className="relative">
              <input value={codeName} onChange={e => setCodeName(e.target.value)}
                placeholder="e.g. john_admin"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {creating ? (
              <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Creating...</span>
            ) : 'Create Code'}
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">{error}</div>}
        {newCode && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Code created successfully!
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium w-10">Code:</span>
                <code className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 font-mono text-sm">{newCode.referral_code}</code>
                <button onClick={() => copyToClipboard(newCode.referral_code)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Copy</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium w-10">Link:</span>
                <a href={newCode.referral_link} target="_blank" className="text-indigo-600 hover:text-indigo-800 underline truncate max-w-sm text-sm">{newCode.referral_link}</a>
                <button onClick={() => copyToClipboard(newCode.referral_link)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium shrink-0">Copy</button>
              </div>
            </div>
            {copied && <div className="mt-2 text-xs text-emerald-600 font-medium">Copied to clipboard!</div>}
          </div>
        )}
      </div>

      {/* Codes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-lg"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></div>
            <h2 className="text-lg font-bold text-gray-900">Your Referral Codes</h2>
          </div>
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Search codes..."
            className="w-56 px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-gray-400">No referral codes found. Create one above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creator</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Referral Link</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Signups</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCodes.map(c => {
                  const link = getReferralLink(c.referral_code);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5"><code className="bg-gray-100 px-2.5 py-1 rounded-md text-sm font-mono text-gray-800">{c.referral_code}</code></td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">{c.created_by_username}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 max-w-[280px]">
                          <a href={link} target="_blank" className="text-indigo-600 hover:text-indigo-800 underline truncate text-sm" title={link}>{link}</a>
                          <button onClick={() => copyToClipboard(link, true)} className="shrink-0 p-1 hover:bg-gray-100 rounded transition-colors" title="Copy link">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                          {copiedLink === link && <span className="text-xs text-emerald-600 font-medium shrink-0">Copied!</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5">{c.is_active ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Active</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>}</td>
                      <td className="px-6 py-3.5 text-center"><span className="text-sm font-semibold text-gray-700">{c.registrations_count}</span></td>
                      <td className="px-6 py-3.5 text-right">
                        <button onClick={() => viewRegistrations(c.referral_code)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          View
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

      {/* Registrations Modal via Portal */}
      {selectedCode && typeof window === 'object' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                <h2 className="text-lg font-bold text-gray-900">
                  Registrations for <code className="bg-gray-100 px-2 py-0.5 rounded text-indigo-600 font-mono">{selectedCode}</code>
                </h2>
                <span className="text-sm text-gray-400">({registrations.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={getReferralLink(selectedCode)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Open Link
                </a>
                <button onClick={() => { navigator.clipboard.writeText(getReferralLink(selectedCode)); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Copy link">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {regLoading ? (
                <div className="flex justify-center py-16"><svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>
              ) : registrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="text-lg font-medium">No registrations yet</p>
                  <p className="text-sm mt-1">Share this referral link to get signups.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">PAN Card</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {registrations.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm text-gray-800 font-medium">{r.name}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{r.username}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{r.email}</td>
                          <td className="px-4 py-3.5 text-sm font-mono text-gray-600">{r.pan_card_id}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{r.full_name}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-400">{new Date(r.registered_at).toLocaleDateString()}</td>
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
