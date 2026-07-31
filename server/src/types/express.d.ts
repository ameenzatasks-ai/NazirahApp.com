// Augment Express.User so passport's req.user matches our custom user shape.
// This must be consistent with the AuthRequest interface in auth/middleware.ts.
declare global {
  namespace Express {
    interface User {
      id: number;
      /** Null for username/password accounts. */
      google_id: string | null;
      name: string;
      /** Null for username/password accounts. */
      email: string | null;
      /** Null for Google accounts. */
      username: string | null;
      avatar_url: string | null;
      role: string | null;
      created_at: string;
    }
  }
}

export {};
