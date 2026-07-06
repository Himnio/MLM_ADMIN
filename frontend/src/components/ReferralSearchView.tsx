'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Search, User, Hash, Phone, Calendar, MapPin, CreditCard, Shield } from 'lucide-react';

interface Registration {
  id: string;
  member_id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  dob?: string;
  address?: string;
  pan_card_id?: string;
  aadhaar_card?: string;
  created_at?: string;
  name?: string;
  full_name?: string;
  registered_at?: string;
}

interface SearchResult {
  referral_code: string;
  created_by_username: string;
  created_at: string;
  registrations: Registration[];
  total_registrations: number;
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

  const displayName = (r: Registration) => {
    if (r.first_name) return `${r.first_name} ${r.last_name || ''}`.trim();
    return r.name || r.full_name || '—';
  };

  const dateField = (r: Registration) => r.created_at || r.registered_at;

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
                      <div className="p-2 bg-primary/10 rounded-lg"><Search size={16} className="text-primary" /></div>
                      <div>
                        <code className="text-sm font-mono font-semibold text-primary">{r.referral_code}</code>
                        <p className="text-xs text-text-muted mt-0.5">Created {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="badge-primary">{r.total_registrations} signup{r.total_registrations !== 1 ? 's' : ''}</span>
                  </div>

                  {r.registrations.length > 0 ? (
                    <>
                      <div className="sm:hidden divide-y divide-border">
                        {r.registrations.map(reg => (
                          <div key={reg.id} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-text-primary">{displayName(reg)}</p>
                              {reg.mobile && <span className="text-xs text-text-muted flex items-center gap-1"><Phone size={12} />{reg.mobile}</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              {reg.email && <><span className="text-text-muted">Email:</span><span className="text-text-primary truncate">{reg.email}</span></>}
                              {reg.pan_card_id && <><span className="text-text-muted">PAN:</span><span className="text-text-primary font-mono">{reg.pan_card_id}</span></>}
                              {reg.aadhaar_card && <><span className="text-text-muted">Aadhaar:</span><span className="text-text-primary">{reg.aadhaar_card}</span></>}
                              {reg.dob && <><span className="text-text-muted">DOB:</span><span className="text-text-primary">{reg.dob}</span></>}
                              {reg.username && <><span className="text-text-muted">Username:</span><span className="text-text-primary">@{reg.username}</span></>}
                              {dateField(reg) && <><span className="text-text-muted">Date:</span><span className="text-text-primary">{new Date(dateField(reg)!).toLocaleDateString()}</span></>}
                            </div>
                            {reg.address && <p className="text-xs text-text-muted flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0" />{reg.address}</p>}
                          </div>
                        ))}
                      </div>

                      <div className="hidden sm:block overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Mobile</th>
                              <th className="hidden md:table-cell">Email</th>
                              <th className="hidden lg:table-cell">PAN</th>
                              <th className="hidden lg:table-cell">Aadhaar</th>
                              <th className="hidden md:table-cell">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {r.registrations.map(reg => (
                              <tr key={reg.id} className="hover:bg-surface-hover transition-colors">
                                <td className="text-sm font-medium text-text-primary">{displayName(reg)}</td>
                                <td className="text-sm text-text-secondary">{reg.mobile || '—'}</td>
                                <td className="text-sm text-text-secondary hidden md:table-cell truncate max-w-[200px]">{reg.email || '—'}</td>
                                <td className="text-sm font-mono text-text-secondary hidden lg:table-cell">{reg.pan_card_id || '—'}</td>
                                <td className="text-sm text-text-secondary hidden lg:table-cell">{reg.aadhaar_card || '—'}</td>
                                <td className="text-sm text-text-muted hidden md:table-cell">{dateField(reg) ? new Date(dateField(reg)!).toLocaleDateString() : '—'}</td>
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
