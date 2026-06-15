import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Plus, TrendingUp, Calendar, Settings } from 'lucide-react';

const navItems = [
  { to: '/',         icon: Home,          label: 'Home' },
  { to: '/plan',     icon: ClipboardList, label: 'Plan' },
  { to: '/log',      icon: Plus,          label: 'Log',    center: true },
  { to: '/progress', icon: TrendingUp,    label: 'Progress' },
  { to: '/settings', icon: Settings,      label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#161A23] border-t border-[#252B38]"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex items-end justify-around px-2 h-16">
        {navItems.map(({ to, icon: Icon, label, center }) => (
          center ? (
            <NavLink key={to} to={to}
              className="flex flex-col items-center -mt-6">
              <div className="w-14 h-14 rounded-full bg-[#38BDF8] flex items-center justify-center shadow-lg shadow-[#38BDF8]/30 hover:bg-[#7DD3FC] transition-colors">
                <Icon size={24} color="#0D0F14" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] mt-1 text-[#6B7280]">{label}</span>
            </NavLink>
          ) : (
            <NavLink key={to} to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-[#38BDF8]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
                }`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px]">{label}</span>
                </>
              )}
            </NavLink>
          )
        ))}
      </div>
    </nav>
  );
}
