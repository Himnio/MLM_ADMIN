'use client';

import {
  LayoutDashboard,
  Users,
  Link2,
  Search,
  GitBranch,
  DollarSign,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export type SectionKey = 'dashboard' | 'members' | 'referral-link' | 'referral-search' | 'referrals' | 'income' | 'reports';

interface NavItem {
  key: SectionKey;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'referral-link', label: 'Referral Links', icon: Link2 },
  { key: 'referral-search', label: 'Referral Search', icon: Search },
  { key: 'referrals', label: 'MLM Tree', icon: GitBranch },
  { key: 'income', label: 'Income', icon: DollarSign },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

interface SidebarProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  onLogout,
}: SidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">MLM Admin</h1>
              <p className="text-[10px] text-gray-500 truncate">Management Panel</p>
            </div>
          )}
        </div>
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onSectionChange(item.key);
                onMobileClose();
              }}
              className={`sidebar-link w-full text-left ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop) + Logout */}
      <div className="border-t border-white/10 p-4 space-y-2">
        {/* Collapse button - desktop only */}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-sidebar-hover transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          title="Logout"
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-full z-30
          bg-sidebar shadow-sidebar
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[var(--sidebar-width)]'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={onMobileClose} />
      )}

      {/* Mobile sidebar */}
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
    </>
  );
}
