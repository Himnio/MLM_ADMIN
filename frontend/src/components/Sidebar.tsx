'use client';

export type Section = 'dashboard' | 'members' | 'referrals' | 'income' | 'reports' | 'referral-link' | 'referral-search';

const links: { section: Section; label: string; icon: string }[] = [
  { section: 'dashboard', label: 'Dashboard', icon: '📊' },
  { section: 'members', label: 'Members', icon: '👥' },
  { section: 'referral-link', label: 'Referral Links', icon: '🔗' },
  { section: 'referral-search', label: 'Referral Search', icon: '🔍' },
  { section: 'referrals', label: 'MLM Tree', icon: '🌳' },
  { section: 'income', label: 'Income', icon: '💰' },
  { section: 'reports', label: 'Reports', icon: '📈' },
];

export default function Sidebar({ active, onNavigate, onLogout }: { active: Section; onNavigate: (s: Section) => void; onLogout: () => void }) {
  return (
    <nav className="w-[260px] bg-sidebar text-white flex flex-col shrink-0">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-sm font-bold">M</div>
        <span className="text-base font-bold">MLM Admin</span>
      </div>
      <div className="flex-1 py-3">
        {links.map(l => (
          <div key={l.section}
            className={`flex items-center gap-3 px-6 py-2.5 text-sm cursor-pointer transition-all ${
              active === l.section
                ? 'bg-white/10 text-white border-r-2 border-indigo-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => onNavigate(l.section)}>
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-white/10">
        <button onClick={onLogout} className="flex items-center gap-2 w-full py-2.5 px-4 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm">
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
