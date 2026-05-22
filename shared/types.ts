/**
 * Cross-cutting types shared between client and server.
 * Hifz quarter-status types live in ./juz-map.ts so they can be imported
 * independently (palette tokens, audit timeline, etc.).
 */

export type Role = 'ustadh' | 'student';

export interface User {
  id: number;
  google_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: Role | null;
  created_at: string;
}

export interface Class {
  id: number;
  name: string;
  ustadh_id: number;
  join_code: string;
  created_at: string;
}

export interface ClassWithMeta extends Class {
  ustadh_name?: string;
  student_count?: number;
  joined_at?: string;
  /** Present for Ustadh listings: true = they own the class, false = enrolled as learner */
  is_owner?: boolean;
}

// Re-export the hifz domain types so consumers can pick a single import root.
export type { PageStatus, QuarterStatus, JuzInfo } from './juz-map';
export { JUZ_MAP, getJuz, juzForPage } from './juz-map';
