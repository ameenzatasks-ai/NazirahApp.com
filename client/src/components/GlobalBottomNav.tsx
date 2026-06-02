import { NavLink } from 'react-router-dom';
import { BookOpen, User } from 'lucide-react';

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
      {/* Classes tab */}
      <NavLink
        to="/classes"
        className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors"
        style={({ isActive }) => ({
          color: isActive ? 'var(--c-gold)' : 'var(--c-text-faint)',
        })}
      >
        <BookOpen className="w-5 h-5" strokeWidth={2} />
        <span className="text-[10px] font-medium">Classes</span>
      </NavLink>

      {/* Profile tab */}
      <NavLink
        to="/profile"
        className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors"
        style={({ isActive }) => ({
          color: isActive ? 'var(--c-gold)' : 'var(--c-text-faint)',
        })}
      >
        <User className="w-5 h-5" strokeWidth={2} />
        <span className="text-[10px] font-medium">Profile</span>
      </NavLink>
    </nav>
  );
}
