'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import DashboardView from '@/components/DashboardView';
import MembersView from '@/components/MembersView';
import ReferralsView from '@/components/ReferralsView';
import IncomeView from '@/components/IncomeView';
import ReportsView from '@/components/ReportsView';
import ReferralLinkView from '@/components/ReferralLinkView';
import ReferralSearchView from '@/components/ReferralSearchView';

type Section = 'dashboard' | 'members' | 'referrals' | 'income' | 'reports' | 'referral-link' | 'referral-search';

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthenticated(api.isAuthenticated);
    setLoading(false);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar active={activeSection} onNavigate={setActiveSection} onLogout={() => { api.clearTokens(); setAuthenticated(false); }} />
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold capitalize">{activeSection}</h1>
          <span className="text-sm text-gray-500">MLM Admin Portal</span>
        </header>
        <div className="p-6">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'members' && <MembersView />}
          {activeSection === 'referral-link' && <ReferralLinkView />}
          {activeSection === 'referral-search' && <ReferralSearchView />}
          {activeSection === 'referrals' && <ReferralsView />}
          {activeSection === 'income' && <IncomeView />}
          {activeSection === 'reports' && <ReportsView />}
        </div>
      </main>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const res = await api.post<{ access_token: string; refresh_token: string }>('/auth/login', { email, password });
    if (res.success && res.data) {
      api.setTokens(res.data.access_token, res.data.refresh_token);
      onLogin();
    } else {
      setError(res.message || res.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">MLM Admin Login</h1>
        <div className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
          <button onClick={handleLogin} className="btn-primary w-full">Sign In</button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}