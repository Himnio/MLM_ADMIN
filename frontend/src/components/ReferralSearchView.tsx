'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Search, User, Link, Calendar, Hash, FileText } from 'lucide-react';

interface SearchResult {
  referral_code: string;
  created_by_username: string;
  created_at: string;
  registrations: Registration[];
  total_registrations: number;
}

interface Registration {
  id: string;
  name: string;
  username: string;
  email: string;
  pan_card_id: string;
  full_name: string;
  registered_at: string;
}

export default function ReferralSearchView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalRegs, setTotalRegs] = useState(0);
  const [searchedUsername, setSearchedUsername] = useState('');

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setSearching(true);
    setSearched(true);
    setSearchedUsername(term);
    const res: any = await api.get(`/admin/referral-codes/search?username=${encodeURIComponent(term)}`);
    if (res.success && res.data) {
      setResults(res.data.results || []);
      setTotalRegs(res.data.total_registrations || 0);
    } else {
      setResults([]);
      setTotalRegs(0);
    }
    setSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-lg"><Search size={20} className="text-primary" /></div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Referral Search</h2>
            <p className="text-xs text-text-muted mt-0.5">Search by creator name to see all registrations under them</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Search by creator name (e.g. john_admin)..."
              className="input pl-10" />
          </div>
          <button onClick={handleSearch} disabled={searching || !searchTerm.trim()} className="btn-primary">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {searched && (
        <div className="space-y-4">
          {searching ? (
            <div className="stat-card"><div className="skeleton mx-auto" /></div>
          ) : results.length === 0 ? (
            <div className="stat-card">
              <div className="empty-state">
                <Search size={48} />
                <p>No results found for &ldquo;{searchedUsername}&rdquo;</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="stat-card">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Creator</p>
                  <p className="text-xl font-bold text-text-primary mt-1 flex items-center gap-2"><User size={18} />{searchedUsername}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Codes</p>
                  <p className="text-xl font-bold text-text-primary mt-1 flex items-center gap-2"><Hash size={18} />{results.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Signups</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-2"><User size={18} />{totalRegs}</p>
                </div>
              </div>

              {results.map((r, i) => (
                <div key={i} className="stat-card p-0 overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><Link size={16} className="text-primary" /></div>
                      <div>
                        <code className="text-sm font-mono font-semibold text-primary">{r.referral_code}</code>
                        <p className="text-xs text-text-muted mt-0.5">Created {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="badge-primary">{r.total_registrations} signup{r.total_registrations !== 1 ? 's' : ''}</span>
                  </div>
                  {r.registrations.length > 0 ? (
                    <>
                      {/* Mobile cards */}
                      <div className="sm:hidden divide-y divide-border">
                        {r.registrations.map(reg => (
                          <div key={reg.id} className="p-4 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-text-primary">{reg.name}</p>
                              <span className="text-xs text-text-muted">{new Date(reg.registered_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-text-secondary">{reg.full_name}</p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                              <span className="text-text-muted">User:</span><span className="text-text-primary">{reg.username}</span>
                              <span className="text-text-muted">PAN:</span><span className="text-text-primary font-mono">{reg.pan_card_id}</span>
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
                              <th className="hidden sm:table-cell">Username</th>
                              <th className="hidden md:table-cell">Email</th>
                              <th className="hidden lg:table-cell">PAN Card</th>
                              <th>Full Name</th>
                              <th className="hidden sm:table-cell">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {r.registrations.map(reg => (
                              <tr key={reg.id} className="hover:bg-surface-hover transition-colors">
                                <td className="text-sm font-medium text-text-primary">{reg.name}</td>
                                <td className="text-sm text-text-secondary hidden sm:table-cell">{reg.username}</td>
                                <td className="text-sm text-text-secondary hidden md:table-cell">{reg.email}</td>
                                <td className="text-sm font-mono text-text-secondary hidden lg:table-cell">{reg.pan_card_id}</td>
                                <td className="text-sm text-text-secondary">{reg.full_name}</td>
                                <td className="text-sm text-text-muted hidden sm:table-cell">{new Date(reg.registered_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="px-6 py-6 text-center text-sm text-text-muted">No signups for this code yet.</div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {!searched && (
        <div className="stat-card">
          <div className="empty-state">
            <Search size={56} className="text-border" />
            <p className="text-text-muted">Enter a creator name above to search for their referral registrations.</p>
          </div>
        </div>
      )}
    </div>
  );
}
