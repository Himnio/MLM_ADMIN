'use client';

import { useState } from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import Sidebar, { type SectionKey } from './Sidebar';

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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                A
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary leading-tight">Admin</p>
                <p className="text-xs text-text-muted leading-tight">Super Admin</p>
              </div>
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
    </div>
  );
}
