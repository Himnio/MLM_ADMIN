'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut, KeyRound } from 'lucide-react';
import Sidebar, { type SectionKey } from './Sidebar';

const API_BASE = '/api/v1';

interface AdminLayoutProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({
  activeSection,
  onSectionChange,
  onLogout,
  children,
  title,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changing, setChanging] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setChangeError(data.message || 'Failed to change password');
      }
    } catch {
      setChangeError('Network error');
    }
    setChanging(false);
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={onLogout}
      />

      {/* Main content area */}
      <div
        className={`transition-all duration-300 ease-in-out
          lg:ml-[var(--sidebar-width)]
          ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[var(--sidebar-width)]'}
        `}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-border
          flex items-center justify-between px-4 sm:px-6"
        >
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
              <p className="text-xs text-text-muted hidden sm:block">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-icon text-text-secondary hover:bg-surface-hover transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
            <div className="relative" ref={profileRef}>
              <div onClick={() => setProfileOpen(!profileOpen)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  A
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary leading-tight">Admin</p>
                  <p className="text-xs text-text-muted leading-tight">Super Admin</p>
                </div>
              </div>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-modal border border-border py-2 animate-scale-in z-50">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">Admin</p>
                    <p className="text-xs text-text-muted">Administrator</p>
                  </div>
                  <button onClick={() => { setProfileOpen(false); setShowPasswordModal(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                  >
                    <KeyRound size={16} />
                    Change Password
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              className="btn-icon text-text-secondary hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-modal animate-scale-in p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Change Password</h2>
            <p className="text-sm text-text-muted mb-5">Update your admin account password.</p>
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
                <button onClick={() => setShowPasswordModal(false)}
                  className="flex-1 btn-ghost py-2.5">Cancel</button>
                <button onClick={handleChangePassword} disabled={changing}
                  className="flex-1 btn-primary py-2.5">
                  {changing ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
