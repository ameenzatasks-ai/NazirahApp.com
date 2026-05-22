import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../db';

export function configurePassport(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'dev-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dev-client-secret',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
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
            // Update avatar_url if changed
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
