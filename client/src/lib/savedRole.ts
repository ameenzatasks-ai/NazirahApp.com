import type { Role, User } from '../types';

/**
 * The server database has no persistent disk on the current host, so it is
 * wiped on every redeploy and every account loses its role. To avoid forcing
 * people back through onboarding each time, the chosen role is mirrored into
 * localStorage and re-applied on the next login.
 *
 * The entry MUST be keyed by a stable per-account identity. A single global
 * key would leak one account's role onto the next account created in the same
 * browser — e.g. a new student inheriting "ustadh" — which silently grants the
 * wrong permissions.
 *
 * Row ids are not usable as that identity: they are AUTOINCREMENT and restart
 * after a wipe, so id 1 can be a different person tomorrow. Username, Google
 * id and email all survive a wipe intact, so they identify the account.
 */
function keyFor(user: User): string | null {
  if (user.username)  return `hifz-role:u:${user.username.toLowerCase()}`;
  if (user.google_id) return `hifz-role:g:${user.google_id}`;
  if (user.email)     return `hifz-role:e:${user.email.toLowerCase()}`;
  return null;
}

/** Remember this account's role so a database wipe doesn't re-trigger onboarding. */
export function saveRole(user: User, role: Role): void {
  const key = keyFor(user);
  if (!key) return;
  try { localStorage.setItem(key, role); } catch { /* storage unavailable */ }
}

/** The role previously saved for THIS account, or null if none/unrecognised. */
export function loadRole(user: User): Role | null {
  const key = keyFor(user);
  if (!key) return null;
  try {
    const saved = localStorage.getItem(key);
    return saved === 'student' || saved === 'ustadh' ? saved : null;
  } catch {
    return null;
  }
}

/** Where a user with this role should land after signing in. */
export function homeFor(role: Role): string {
  return role === 'student' ? '/classes' : '/home';
}
