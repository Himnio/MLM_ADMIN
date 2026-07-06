'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import DistributorLayout, { type DistributorSection } from '@/components/DistributorLayout';
import DistributorDashboardView from '@/components/DistributorDashboardView';
import DistributorDownlineView from '@/components/DistributorDownlineView';
import DistributorReferralView from '@/components/DistributorReferralView';
import DistributorTreeView from '@/components/DistributorTreeView';

const API_BASE = '/api/v1';
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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changing, setChanging] = useState(false);

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
        if (u.must_change_password) {
          setMustChangePassword(true);
          setShowPasswordModal(true);
          setOldPassword(sessionStorage.getItem('member_password') || '');
        }
      } catch {}
    }
  }, [router]);

  const handleChangePassword = async () => {
    setChangeError('');
    if (newPassword.length < 6) {
      setChangeError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match');
      return;
    }
    setChanging(true);
    try {
      const token = localStorage.getItem('member_token');
      const res = await fetch(`${API_BASE}/member/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPasswordModal(false);
        setMustChangePassword(false);
        const stored = localStorage.getItem('member_user');
        if (stored) {
          const u = JSON.parse(stored);
          u.must_change_password = false;
          localStorage.setItem('member_user', JSON.stringify(u));
        }
      } else {
        setChangeError(data.message || 'Failed to change password');
      }
    } catch {
      setChangeError('Network error');
    }
    setChanging(false);
  };

  const handleSkipPassword = async () => {
    const token = localStorage.getItem('member_token');
    if (token) {
      try {
        await fetch(`${API_BASE}/member/skip-password-change`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    setShowPasswordModal(false);
    setMustChangePassword(false);
    const stored = localStorage.getItem('member_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        u.must_change_password = false;
        localStorage.setItem('member_user', JSON.stringify(u));
      } catch {}
    }
  };

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
    sessionStorage.removeItem('member_password');
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
    <>
      <DistributorLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        title={sectionTitles[activeSection]}
        profileName={profileName}
      >
        {renderSection()}
      </DistributorLayout>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-modal animate-scale-in p-5 sm:p-6 mx-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base sm:text-lg font-semibold text-text-primary">
                {mustChangePassword ? 'Set Your Password' : 'Change Password'}
              </h2>
              <button onClick={handleSkipPassword}
                className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-5">
              {mustChangePassword
                ? 'We recommend setting a new password for security. You can skip this and change it later.'
                : 'Enter your current and new password.'}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                  className="input" placeholder="Enter current password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="input" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="input" placeholder="Re-enter new password" />
              </div>
              {changeError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{changeError}</div>
              )}
              <div className="flex gap-3">
                <button onClick={handleSkipPassword}
                  className="flex-1 btn-ghost py-2.5">Skip for now</button>
                <button onClick={handleChangePassword} disabled={changing}
                  className="flex-1 btn-primary py-2.5">
                  {changing ? 'Changing...' : mustChangePassword ? 'Set Password' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
