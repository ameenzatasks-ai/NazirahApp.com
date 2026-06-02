import { api } from './client';
import type { PageStatus } from '../../../shared/juz-map';

export interface NazirahLogSummary {
  id: number;
  logDate: string;       // YYYY-MM-DD
  createdAt: string;
  pageCount: number;
  /** Per-color page counts — zero when no pages of that color. */
  colorCounts: Record<'BLACK' | 'RED' | 'AMBER' | 'GREEN' | 'GOLD' | 'YELLOW', number>;
}

export interface NazirahLogDetail {
  id: number;
  logDate: string;
  createdAt: string;
  pageCount: number;
  notes: string | null;
  grouped: Record<PageStatus, number[]>;
}

export interface NazirahLogPreview {
  pageCount: number;
  colorCounts: Record<'BLACK' | 'RED' | 'AMBER' | 'GREEN' | 'GOLD' | 'YELLOW', number>;
}

export const nazirahApi = {
  /** Student: preview which pages fall in the 7-day window for the given date. */
  previewLog: (date: string) =>
    api.get<NazirahLogPreview>(`/nazirah/log/preview?date=${date}`),

  /** Student: save weekly page statuses as a Nazira log for the given date. */
  saveLog: (date: string) =>
    api.post<NazirahLogSummary>('/nazirah/log', { date }),

  /** Student: list own logs (newest first). */
  getLogs: () =>
    api.get<{ logs: NazirahLogSummary[] }>('/nazirah/logs'),

  /** Student: detail of one own log. */
  getLog: (logId: number) =>
    api.get<NazirahLogDetail>(`/nazirah/logs/${logId}`),

  /** Ustadh: list a student's logs. */
  getStudentLogs: (studentId: number) =>
    api.get<{ logs: NazirahLogSummary[] }>(`/nazirah/logs/student/${studentId}`),

  /** Ustadh: detail of one student log. */
  getStudentLog: (logId: number, studentId: number) =>
    api.get<NazirahLogDetail>(`/nazirah/logs/${logId}/student/${studentId}`),
};
