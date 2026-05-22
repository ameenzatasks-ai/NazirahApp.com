// Augment Express.User so passport's req.user matches our custom user shape.
// This must be consistent with the AuthRequest interface in auth/middleware.ts.
declare global {
  namespace Express {
    interface User {
      id: number;
      google_id: string;
      name: string;
      email: string;
      avatar_url: string | null;
      role: string | null;
    }
  }
}

export {};
