import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../db';

/**
 * Where Google sends the browser back to.
 *
 * Google rejects any redirect URI that is not registered against the OAuth
 * client, so this value cannot simply be inferred — it has to match what is
 * registered, exactly.
 *
 * In development the registered URI points straight at the API server
 * (:3001), while the client is served by Vite on :5173, so the callback and
 * the client origin genuinely differ. GOOGLE_CALLBACK_URL carries that
 * registered value, and deriving from CLIENT_ORIGIN instead produced an
 * address Google had never seen (Error 400: redirect_uri_mismatch).
 *
 * In production the two always share an origin — the API serves the client —
 * so the callback is derived from CLIENT_ORIGIN and the override is ignored
 * on purpose: a stale GOOGLE_CALLBACK_URL left on the host previously broke
 * sign-in there, and deriving it makes that failure impossible.
 */
function resolveCallbackURL(): string {
  const origin = process.env.CLIENT_ORIGIN?.replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'production' && process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL.trim();
  }
  return origin
    ? `${origin}/api/auth/google/callback`
    : 'http://localhost:3001/api/auth/google/callback';
}

export function configurePassport(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'dev-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dev-client-secret',
        callbackURL: resolveCallbackURL(),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || '';
          const avatarUrl = profile.photos?.[0]?.value || null;

          let user = db
            .prepare('SELECT * FROM users WHERE google_id = ?')
            .get(profile.id) as any;

          if (!user) {
            const result = db
              .prepare(
                'INSERT INTO users (google_id, name, email, avatar_url) VALUES (?, ?, ?, ?)'
              )
              .run(profile.id, profile.displayName, email, avatarUrl);
            user = db
              .prepare('SELECT * FROM users WHERE id = ?')
              .get(result.lastInsertRowid);
          } else {
            if (user.avatar_url !== avatarUrl) {
              db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, user.id);
              user.avatar_url = avatarUrl;
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser((id: number, done) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Express.User | undefined;
    done(null, user ?? false);
  });
}

export default passport;
