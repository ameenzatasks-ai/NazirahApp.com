import { api } from './client';
import type { Quarter } from './hifzTasks';

export interface DawrCell {
  juz:          number;
  quarter:      Quarter;
  quarterLabel: string;
  loggedDate:   string | null;
  score:        number | null;
  scoreLabel:   string | null;
  scoreColour:  string | null;
  comment:      string | null;
  scoredAt:     string | null;
}

export interface DawrGrid {
  grid:         DawrCell[];
  scoreLabels:  Record<number, string>;
  scoreColours: Record<number, string>;
}

export const dawrApi = {
  myGrid: () =>
    api.get<DawrGrid>('/dawr'),

  studentGrid: (studentId: number) =>
    api.get<DawrGrid>(`/dawr/student/${studentId}`),

  score: (juz: number, quarter: Quarter, studentId: number, score: number, comment?: string) =>
    api.patch<{ ok: boolean; scoreLabel: string }>(
      `/dawr/${juz}/${quarter}`,
      { studentId, score, comment },
    ),
};
