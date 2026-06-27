import { NavLink } from 'react-router-dom';
import { Plus, TrendingUp, Settings } from 'lucide-react';

const navItems = [
  { to: '/log',      icon: Plus,        label: 'Log' },
  { to: '/progress', icon: TrendingUp,  label: 'Progress' },
  { to: '/settings', icon: Settings,    label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFCF4] border-t border-[#E6D8BF] shadow-[0_-8px_24px_rgba(32,26,20,0.06)]"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors ${
                isActive ? 'text-[#0284C7]' : 'text-[#7A6B5B] hover:text-[#4F463B]'
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
