import { api } from './client';

export type TaskType = 'sabaq' | 'sabaq_para' | 'dawr';
export type Quarter  = '1/4' | '1/2' | '3/4' | 'full';

export interface DawrEntry { juz: number; quarter: Quarter }

export interface HifzTask {
  id:          number;
  taskDate:    string;
  taskType:    TaskType;
  sabaqSurah:  number | null;
  sabaqVerse:  number | null;
  sabaqLines:  number | null;
  spStart:     number | null;
  dawrEntries: DawrEntry[] | null;
  submittedAt: string;
}

export type TaskInput =
  | { taskType: 'sabaq';      sabaqSurah?: number; sabaqVerse?: number; sabaqLines?: number }
  | { taskType: 'sabaq_para'; spStart?: number }
  | { taskType: 'dawr';       dawrEntries: DawrEntry[] };

export interface TaskScore {
  taskDate:    string;
  spScore:     number | null;
  sabaqScore:  number | null;
  tajwidScore: number | null;
  adabScore:   number | null;
  comment:     string | null;
  scoredAt:    string | null;
}

export const hifzTasksApi = {
  submit: (date: string, tasks: TaskInput[], classId?: number) =>
    api.post<{ submitted: number }>('/hifz-tasks', { date, tasks, classId }),

  history: (classId?: number) =>
    api.get<{ tasks: HifzTask[] }>(`/hifz-tasks${classId ? `?classId=${classId}` : ''}`),

  /** Return tasks across ALL classes — used by the cross-class History tab. */
  allHistory: () =>
    api.get<{ tasks: HifzTask[] }>('/hifz-tasks?all=true'),

  byDate: (date: string, classId?: number) =>
    api.get<{ tasks: HifzTask[] }>(`/hifz-tasks/date/${date}${classId ? `?classId=${classId}` : ''}`),

  studentHistory: (studentId: number, classId?: number) =>
    api.get<{ tasks: HifzTask[] }>(`/hifz-tasks/student/${studentId}${classId ? `?classId=${classId}` : ''}`),

  myScores: (classId?: number) =>
    api.get<{ scores: TaskScore[] }>(`/hifz-tasks/my-scores${classId ? `?classId=${classId}` : ''}`),

  /** Return scores across ALL classes — used by the cross-class History tab. */
  allMyScores: () =>
    api.get<{ scores: TaskScore[] }>('/hifz-tasks/my-scores?all=true'),

  studentScores: (studentId: number, classId?: number) =>
    api.get<{ scores: TaskScore[] }>(`/hifz-tasks/student/${studentId}/scores${classId ? `?classId=${classId}` : ''}`),

  scoreStudent: (studentId: number, data: {
    taskDate: string;
    classId?: number;
    spScore?: number | null;
    sabaqScore?: number | null;
    tajwidScore?: number | null;
    adabScore?: number | null;
    comment?: string;
  }) =>
    api.patch<{ ok: boolean }>(`/hifz-tasks/student/${studentId}/score`, data),
};
