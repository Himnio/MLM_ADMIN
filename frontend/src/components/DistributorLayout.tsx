'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut, KeyRound, Sun, Moon, LayoutDashboard, Users, Link2, GitBranch, ChevronLeft, ChevronRight, X, Pencil } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import EditDistributorProfileModal, { DistributorEditableProfile } from './EditDistributorProfileModal';

const API_BASE = '/api/v1';

export type DistributorSection = 'dashboard' | 'downline' | 'referral' | 'tree';

interface NavItem {
  key: DistributorSection;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'downline', label: 'My Downline', icon: Users },
  { key: 'referral', label: 'My Referral Link', icon: Link2 },
  { key: 'tree', label: 'My Rudra Tree', icon: GitBranch },
];

interface DistributorLayoutProps {
  activeSection: DistributorSection;
  onSectionChange: (section: DistributorSection) => void;
  onLogout: () => void;
  children: React.ReactNode;
  title: string;
  profileName?: string;
  onProfileUpdated?: (profile: DistributorEditableProfile) => void;
}

export default function DistributorLayout({
  activeSection,
  onSectionChange,
  onLogout,
  children,
  title,
  profileName,
  onProfileUpdated,
}: DistributorLayoutProps) {
  const { setRole } = useTheme();
  
  useEffect(() => {
    setRole('distributor');
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
  const [editProfileData, setEditProfileData] = useState<DistributorEditableProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const openEditProfile = async () => {
    setProfileOpen(false);
    setLoadingProfile(true);
    const token = localStorage.getItem('member_token');
    try {
      const res = await fetch(`${API_BASE}/member/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      if (res.success && res.data) {
        setEditProfileData(res.data as DistributorEditableProfile);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('member_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/member/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      if (res.success && res.data) {
        const profile = res.data as DistributorEditableProfile;
        localStorage.setItem('member_user', JSON.stringify(res.data));
        onProfileUpdated?.(profile);
      }
    } catch {}
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (showPasswordModal) {
      setOldPassword(sessionStorage.getItem('member_password') || '');
    }
  }, [showPasswordModal]);

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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-text-primary truncate">Distributor</h1>
              <p className="text-[10px] text-text-muted truncate">Partner Panel</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onSectionChange(item.key);
                setMobileOpen(false);
              }}
              className={`sidebar-link w-full text-left ${isActive ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 space-y-2">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-text-muted hover:text-danger hover:bg-danger-light transition-all duration-200"
          title="Logout"
        >
          <LogOut size={18} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full z-30
          bg-sidebar shadow-sidebar
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-[72px]' : 'w-[var(--sidebar-width)]'}
        `}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`lg:hidden fixed left-0 top-0 h-full z-50
          bg-sidebar shadow-sidebar
          transition-transform duration-300 ease-in-out
          w-[var(--sidebar-width)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

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
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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
                  {profileName ? profileName.charAt(0).toUpperCase() : 'D'}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary leading-tight">{profileName || 'Distributor'}</p>
                  <p className="text-xs text-text-muted leading-tight">Partner</p>
                </div>
              </div>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-modal rounded-xl shadow-modal border border-border py-2 animate-scale-in z-50">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">{profileName || 'Distributor'}</p>
                    <p className="text-xs text-text-muted">Distributor Account</p>
                  </div>
                  <button onClick={() => { setProfileOpen(false); setShowPasswordModal(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                  >
                    <KeyRound size={16} />
                    Change Password
                  </button>
                  <button onClick={openEditProfile}
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
            <p className="text-sm text-text-muted mb-5">Update your distributor account password.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                  className="input" placeholder="Enter current password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="input" placeholder="Min 8 characters, A-Z, a-z, 0-9" />
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-header backdrop-blur-lg border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onSectionChange(item.key); setMobileOpen(false); }}
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

      {editProfileData && (
        <EditDistributorProfileModal
          distributor={editProfileData}
          endpoint="/member/profile"
          title={loadingProfile ? 'Loading...' : 'Edit My Profile'}
          onClose={() => setEditProfileData(null)}
          onSuccess={refreshProfile}
          token={typeof window !== 'undefined' ? localStorage.getItem('member_token') || undefined : undefined}
        />
      )}
    </div>
  );
}
