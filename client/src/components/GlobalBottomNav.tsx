/**
 * GlobalBottomNav — persistent 4-tab navigation bar.
 *
 *   Home      → /hub        (Routing Hub)
 *   Nazira    → /classes    (Nazira class system)
 *   Hifz      → /hifz       (Hifz memorisation module)
 *   Profile   → /profile    (User profile)
 */
import { NavLink } from 'react-router-dom';
import { LayoutGrid, BookOpen, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TabProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  /** Pass a render-prop version for the profile tab that needs isActive */
  children?: (isActive: boolean) => React.ReactNode;
}

function Tab({ to, label, icon }: TabProps) {
  return (
    <NavLink
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[44px] transition-colors"
      style={({ isActive }) => ({
        color: isActive ? 'var(--c-gold)' : 'var(--c-text-faint)',
      })}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

export default function GlobalBottomNav() {
  const { user } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';
  const displayName = user?.name
    ? (user.name.split(' ')[0].length > 7
        ? user.name.split(' ')[0].slice(0, 6) + '…'
        : user.name.split(' ')[0])
    : 'Profile';

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
      {/* Home */}
      <Tab
        to="/hub"
        label="Home"
        icon={<LayoutGrid className="w-5 h-5" strokeWidth={2} />}
      />

      {/* Nazira */}
      <Tab
        to="/classes"
        label="Nazira"
        icon={<BookOpen className="w-5 h-5" strokeWidth={2} />}
      />

      {/* Hifz */}
      <Tab
        to="/hifz"
        label="Hifz"
        icon={<GraduationCap className="w-5 h-5" strokeWidth={2} />}
      />

      {/* Profile — custom render for avatar */}
      <NavLink
        to="/profile"
        className="flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[44px] transition-colors"
        style={({ isActive }) => ({
          color: isActive ? 'var(--c-gold)' : 'var(--c-text-faint)',
        })}
      >
        {({ isActive }) => (
          <>
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover"
                style={{
                  border: isActive
                    ? '2px solid var(--c-gold)'
                    : '2px solid var(--c-border)',
                }}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{
                  backgroundColor: isActive ? 'var(--c-gold)' : 'var(--c-bg-subtle)',
                  color: isActive ? '#0d0d0d' : 'var(--c-text-muted)',
                  border: isActive ? 'none' : '1.5px solid var(--c-border)',
                }}
              >
                {initial}
              </div>
            )}
            <span className="text-[10px] font-medium">{displayName}</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
