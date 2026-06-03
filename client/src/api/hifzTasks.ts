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
  spStart:     number | null;
  dawrEntries: DawrEntry[] | null;
  submittedAt: string;
}

export type TaskInput =
  | { taskType: 'sabaq';      sabaqSurah?: number; sabaqVerse?: number }
  | { taskType: 'sabaq_para'; spStart?: number }
  | { taskType: 'dawr';       dawrEntries: DawrEntry[] };

export const hifzTasksApi = {
  submit: (date: string, tasks: TaskInput[]) =>
    api.post<{ submitted: number }>('/hifz-tasks', { date, tasks }),

  history: () =>
    api.get<{ tasks: HifzTask[] }>('/hifz-tasks'),

  byDate: (date: string) =>
    api.get<{ tasks: HifzTask[] }>(`/hifz-tasks/date/${date}`),

  studentHistory: (studentId: number) =>
    api.get<{ tasks: HifzTask[] }>(`/hifz-tasks/student/${studentId}`),
};
