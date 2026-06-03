/**
 * GlobalBottomNav — 5-tab navigation bar.
 *
 *   Classes  → /classes   class list
 *   Nazirah  → /nazirah   full JuzGrid
 *   Hifz     → /hifz      daily task logging
 *   History  → /history   saved Nazira log history
 *   Profile  → /profile
 */
import { NavLink } from 'react-router-dom';
import { BookOpen, Grid3x3, GraduationCap, Clock, User } from 'lucide-react';

interface TabProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function Tab({ to, label, icon }: TabProps) {
  return (
    <NavLink
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
      style={({ isActive }) => ({ color: isActive ? 'var(--c-gold)' : 'var(--c-text-faint)' })}
    >
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
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
      <Tab to="/classes" label="Classes" icon={<BookOpen      className="w-[18px] h-[18px]" strokeWidth={2} />} />
      <Tab to="/nazirah" label="Nazirah"  icon={<Grid3x3       className="w-[18px] h-[18px]" strokeWidth={2} />} />
      <Tab to="/hifz"    label="Hifz"     icon={<GraduationCap className="w-[18px] h-[18px]" strokeWidth={2} />} />
      <Tab to="/history" label="History"  icon={<Clock         className="w-[18px] h-[18px]" strokeWidth={2} />} />
      <Tab to="/profile" label="Profile"  icon={<User          className="w-[18px] h-[18px]" strokeWidth={2} />} />
    </nav>
  );
}
