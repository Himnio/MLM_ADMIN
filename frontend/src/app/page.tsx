'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import Sidebar, { type SectionKey } from '@/components/Sidebar';
import DashboardView from '@/components/DashboardView';
import MembersView from '@/components/MembersView';
import ReferralLinkView from '@/components/ReferralLinkView';
import ReferralSearchView from '@/components/ReferralSearchView';
import ReferralsView from '@/components/ReferralsView';
import IncomeView from '@/components/IncomeView';
import ReportsView from '@/components/ReportsView';
import LoginPage from '@/components/LoginPage';
import AdminLayout from '@/components/AdminLayout';

const sectionTitles: Record<SectionKey, string> = {
  dashboard: 'Dashboard',
  members: 'Members Management',
  'referral-link': 'Referral Links',
  'referral-search': 'Referral Search',
  referrals: 'MLM Tree',
  income: 'Income Management',
  reports: 'Reports & Analytics',
};

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const [mounted, setMounted] = useState(false);
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      api.setTokens(token, localStorage.getItem('refreshToken') || '');
      setAuthenticated(true);
      fetchProfile();
    }
  }, [fetchProfile]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onLogin={() => { setAuthenticated(true); fetchProfile(); }} />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardView />;
      case 'members': return <MembersView />;
      case 'referral-link': return <ReferralLinkView />;
      case 'referral-search': return <ReferralSearchView />;
      case 'referrals': return <ReferralsView />;
      case 'income': return <IncomeView />;
      case 'reports': return <ReportsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={() => {
        api.clearTokens();
        setAuthenticated(false);
      }}
      title={sectionTitles[activeSection]}
    >
      {renderSection()}
    </AdminLayout>
  );
}
