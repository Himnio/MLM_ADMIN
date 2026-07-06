'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DistributorLayout, { type DistributorSection } from '@/components/DistributorLayout';
import DistributorDashboardView from '@/components/DistributorDashboardView';
import DistributorDownlineView from '@/components/DistributorDownlineView';
import DistributorReferralView from '@/components/DistributorReferralView';
import DistributorTreeView from '@/components/DistributorTreeView';

const sectionTitles: Record<DistributorSection, string> = {
  dashboard: 'Dashboard',
  downline: 'My Downline',
  referral: 'My Referral Link',
  tree: 'My MLM Tree',
};

export default function MemberDashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState<DistributorSection>('dashboard');
  const [profileName, setProfileName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('member_token');
    if (!token) {
      router.push('/member/login');
      return;
    }
    setAuthenticated(true);

    const stored = localStorage.getItem('member_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setProfileName(`${u.first_name || ''} ${u.last_name || ''}`.trim());
      } catch {}
    }
  }, [router]);

  if (!mounted || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('member_token');
    localStorage.removeItem('member_user');
    router.push('/member/login');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DistributorDashboardView />;
      case 'downline': return <DistributorDownlineView />;
      case 'referral': return <DistributorReferralView />;
      case 'tree': return <DistributorTreeView />;
      default: return <DistributorDashboardView />;
    }
  };

  return (
    <DistributorLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      title={sectionTitles[activeSection]}
      profileName={profileName}
    >
      {renderSection()}
    </DistributorLayout>
  );
}
