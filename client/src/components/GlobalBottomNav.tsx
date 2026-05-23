import { NavLink } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function GlobalBottomNav() {
  const { user } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';
  // Truncate display name to ~12 chars so it fits the tab
  const displayName = user?.name
    ? (user.name.split(' ')[0].length > 11
        ? user.name.split(' ')[0].slice(0, 10) + '…'
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

      {/* Profile tab — shows avatar circle + first name */}
      <NavLink
        to="/profile"
        className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors"
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
                className="w-6 h-6 rounded-full object-cover"
                style={{
                  border: isActive ? '2px solid var(--c-gold)' : '2px solid var(--c-border)',
                }}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
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
