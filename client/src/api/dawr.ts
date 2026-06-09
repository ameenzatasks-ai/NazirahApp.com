import { api } from './client';
import type { Quarter } from './hifzTasks';

export interface DawrCycle {
  loggedDate:  string;
  score:       number | null;
  scoreLabel:  string | null;
  scoreColour: string | null;
  comment:     string | null;
  scoredAt:    string | null;
}

export interface DawrCell {
  juz:          number;
  quarter:      Quarter;
  quarterLabel: string;
  cycles:       DawrCycle[];
}

export interface DawrGrid {
  grid:         DawrCell[];
  scoreLabels:  Record<number, string>;
  scoreColours: Record<number, string>;
}

export interface StudentDawrData {
  id:        number;
  name:      string;
  avatarUrl: string | null;
  grid:      DawrCell[];
}

export interface AllStudentsDawrGrid {
  students:     StudentDawrData[];
  scoreLabels:  Record<number, string>;
  scoreColours: Record<number, string>;
}

export const dawrApi = {
  myGrid: (classId?: number) =>
    api.get<DawrGrid>(`/dawr${classId ? `?classId=${classId}` : ''}`),

  studentGrid: (studentId: number, classId?: number) =>
    api.get<DawrGrid>(`/dawr/student/${studentId}${classId ? `?classId=${classId}` : ''}`),

  allStudents: (classId?: number) =>
    api.get<AllStudentsDawrGrid>(`/dawr/all-students${classId ? `?classId=${classId}` : ''}`),

  // quarter is passed in the body (not URL path) to avoid slash-encoding issues
  // loggedDate identifies which cycle to score; defaults to most recent if omitted
  score: (
    juz: number,
    quarter: Quarter,
    studentId: number,
    score: number,
    comment?: string,
    classId?: number,
    loggedDate?: string,
  ) =>
    api.patch<{ ok: boolean; scoreLabel: string }>(
      `/dawr/${juz}`,
      { quarter, studentId, score, comment, classId, loggedDate },
    ),
};
