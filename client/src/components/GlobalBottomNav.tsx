/**
 * GlobalBottomNav — 4-tab navigation bar.
 *
 *   Classes  → /classes   class list
 *   Nazirah  → /nazirah   full JuzGrid (direct, no date step)
 *   History  → /history   saved Nazira log history
 *   Profile  → /profile
 */
import { NavLink } from 'react-router-dom';
import { BookOpen, Grid3x3, Clock, User } from 'lucide-react';

interface TabProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function Tab({ to, label, icon }: TabProps) {
  return (
    <NavLink
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors"
      style={({ isActive }) => ({ color: isActive ? 'var(--c-gold)' : 'var(--c-text-faint)' })}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

export default function GlobalBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t"
      style={{
        backgroundColor: 'var(--c-bg-nav)',
        borderColor: 'var(--c-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(56px + env(safe-area-inset-bottom))',
      }}
      aria-label="Main navigation"
    >
      <Tab to="/classes" label="Classes" icon={<BookOpen className="w-5 h-5" strokeWidth={2} />} />
      <Tab to="/nazirah" label="Nazirah"  icon={<Grid3x3  className="w-5 h-5" strokeWidth={2} />} />
      <Tab to="/history" label="History"  icon={<Clock    className="w-5 h-5" strokeWidth={2} />} />
      <Tab to="/profile" label="Profile"  icon={<User     className="w-5 h-5" strokeWidth={2} />} />
    </nav>
  );
}
