import { api } from './client';
import type { PageStatus } from '../../../shared/juz-map';

export interface JuzGridPage {
  pageNumber: number;
  status: PageStatus | null;  // null = untouched
}

export interface JuzGridData {
  juz: number;
  startPage: number;
  endPage: number;
  startSurah: number;
  pages: JuzGridPage[];
}

export interface StatusPage {
  pageNumber: number;
  status: PageStatus;
}

export interface AuditEntry {
  id: number;
  pageNumber: number;
  fromStatus: PageStatus | null;
  toStatus: PageStatus | null;  // null = untouched
  changedAt: string;
  changedByName: string;
  changedByRole: string | null;
  note: string | null;
}

export interface HifzCounts {
  studentId: number;
  counts: Record<PageStatus | 'UNTOUCHED', number>;
}

export const hifzApi = {
  /** Own Juz grid. */
  getJuz: (juz: number) => api.get<JuzGridData>(`/hifz/juz/${juz}`),
  /** Ustadh viewing a student's Juz grid. */
  getStudentJuz: (juz: number, studentId: number) =>
    api.get<JuzGridData>(`/hifz/juz/${juz}/student/${studentId}`),

  /** Self update of a page. */
  setPage: (page: number, status: PageStatus) =>
    api.put<{ unchanged: boolean; status: PageStatus | null; fromStatus?: PageStatus | null }>(
      `/hifz/page/${page}`,
      { status }
    ),
  /** Self untouch (remove status). */
  untouchPage: (page: number) =>
    api.delete<{ unchanged: boolean; status: null; fromStatus?: PageStatus | null }>(`/hifz/page/${page}`),

  /** Ustadh override. */
  setStudentPage: (page: number, studentId: number, status: PageStatus) =>
    api.put<{ unchanged: boolean; status: PageStatus | null; fromStatus?: PageStatus | null }>(
      `/hifz/page/${page}/student/${studentId}`,
      { status }
    ),
  untouchStudentPage: (page: number, studentId: number) =>
    api.delete<{ unchanged: boolean; status: null; fromStatus?: PageStatus | null }>(
      `/hifz/page/${page}/student/${studentId}`
    ),

  /** Audit log. */
  audit: (limit = 50, before?: number) =>
    api.get<{ entries: AuditEntry[] }>(
      `/hifz/audit?limit=${limit}${before ? `&before=${before}` : ''}`
    ),
  studentAudit: (studentId: number, limit = 50, before?: number) =>
    api.get<{ entries: AuditEntry[] }>(
      `/hifz/audit/student/${studentId}?limit=${limit}${before ? `&before=${before}` : ''}`
    ),

  summary: () => api.get<HifzCounts>('/hifz/summary'),
  studentSummary: (studentId: number) => api.get<HifzCounts>(`/hifz/summary/student/${studentId}`),

  /** All status'd pages for self (excludes untouched). */
  allPages: () => api.get<{ pages: StatusPage[] }>('/hifz/pages'),
  /** Ustadh: all status'd pages for a student. */
  studentAllPages: (studentId: number) =>
    api.get<{ pages: StatusPage[] }>(`/hifz/pages/student/${studentId}`),
};
