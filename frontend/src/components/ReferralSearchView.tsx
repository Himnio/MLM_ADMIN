'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Search Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-indigo-50 rounded-lg">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Referral Search</h2>
            <p className="text-sm text-gray-400 mt-0.5">Search by creator name to see all registrations under them</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Search by creator name (e.g. john_admin)..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
          </div>
          <button onClick={handleSearch} disabled={searching || !searchTerm.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          {searching ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
              <div className="flex justify-center">
                <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400">No results found for &ldquo;{searchedUsername}&rdquo;</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Creator</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{searchedUsername}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Codes</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{results.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Signups</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{totalRegs}</p>
                </div>
              </div>

              {/* Results */}
              {results.map((r, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <code className="text-sm font-mono font-semibold text-indigo-700">{r.referral_code}</code>
                        <p className="text-xs text-gray-400 mt-0.5">Created {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {r.total_registrations} signup{r.total_registrations !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {r.registrations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">PAN Card</th>
                            <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</th>
                            <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {r.registrations.map(reg => (
                            <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-3 text-sm text-gray-800">{reg.name}</td>
                              <td className="px-6 py-3 text-sm text-gray-600">{reg.username}</td>
                              <td className="px-6 py-3 text-sm text-gray-600">{reg.email}</td>
                              <td className="px-6 py-3 text-sm font-mono text-gray-600">{reg.pan_card_id}</td>
                              <td className="px-6 py-3 text-sm text-gray-600">{reg.full_name}</td>
                              <td className="px-6 py-3 text-sm text-gray-400">{new Date(reg.registered_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-6 text-center text-sm text-gray-400">No signups for this code yet.</div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Initial state */}
      {!searched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-400">Enter a creator name above to search for their referral registrations.</p>
        </div>
      )}
    </div>
  );
}
