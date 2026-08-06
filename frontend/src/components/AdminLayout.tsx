'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut, KeyRound, X, LayoutDashboard, Users, Link2, GitBranch, BarChart3, Pencil } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import Sidebar, { type SectionKey } from './Sidebar';
import EditAdminProfileModal from './EditAdminProfileModal';

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
  const { setRole } = useTheme();
  
  useEffect(() => {
    setRole('admin');
  }, [setRole]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changing, setChanging] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
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
    if (newPassword.length < 8) {
      setChangeError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setChangeError('Password must contain at least one uppercase letter, one lowercase letter, and one digit');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setChangeError('Password must contain at least one special character');
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

      <div
        className={`transition-all duration-300 ease-in-out
          lg:ml-[var(--sidebar-width)]
          ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[var(--sidebar-width)]'}
        `}
      >
        <header
          className="sticky top-0 z-20 h-16 bg-header backdrop-blur-md border-b border-border
          flex items-center justify-between px-4 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors"
              aria-label="Open menu"
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

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button className="btn-icon text-text-secondary relative" aria-label="Notifications">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-header" />
            </button>
            <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
            <div className="relative" ref={profileRef}>
              <div onClick={() => setProfileOpen(!profileOpen)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  A
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary leading-tight">Admin</p>
                  <p className="text-xs text-text-muted leading-tight">Super Admin</p>
                </div>
              </div>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-modal rounded-xl shadow-modal border border-border py-2 animate-scale-in z-50">
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
                  <button onClick={() => { setProfileOpen(false); setShowEditProfile(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                  >
                    <Pencil size={16} />
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              className="btn-icon text-text-secondary hover:bg-danger-light hover:text-danger transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 animate-fade-in pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content p-5 sm:p-6 mx-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base sm:text-lg font-semibold text-text-primary">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)}
                className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
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
                  className="input" placeholder="Min 8 chars, A-Z, a-z, 0-9, special" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="input" placeholder="Re-enter new password" />
              </div>
              {changeError && (
                <div className="p-3 rounded-lg bg-danger-light/20 border border-danger/30 text-danger text-sm">{changeError}</div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowPasswordModal(false)}
                  className="flex-1 btn-ghost py-2.5 order-2 sm:order-1">Cancel</button>
                <button onClick={handleChangePassword} disabled={changing}
                  className="flex-1 btn-primary py-2.5 order-1 sm:order-2">
                  {changing ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-header backdrop-blur-lg border-t border-border safe-bottom pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {([
            { key: 'dashboard' as SectionKey, label: 'Dashboard', icon: LayoutDashboard },
            { key: 'members' as SectionKey, label: 'Distributors', icon: Users },
            { key: 'referral-link' as SectionKey, label: 'Links', icon: Link2 },
            { key: 'referrals' as SectionKey, label: 'Rudra Tree', icon: GitBranch },
            { key: 'reports' as SectionKey, label: 'Reports', icon: BarChart3 },
          ] as const).map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSectionChange(item.key)}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-0 flex-1 transition-all duration-200 ${
                  isActive
                    ? 'text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-medium leading-tight truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showEditProfile && <EditAdminProfileModal onClose={() => setShowEditProfile(false)} />}
    </div>
  );
}
