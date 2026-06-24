import { api } from './client';
import type { User } from '../types';

export const authApi = {
  me:       () => api.get<{ user: User }>('/auth/me'),
  setRole:  (role: 'student' | 'ustadh') => api.patch<{ user: User }>('/auth/role', { role }),
  logout:   () => api.post('/auth/logout'),
  register: (name: string, username: string, password: string) =>
    api.post<{ user: User }>('/auth/register', { name, username, password }),
  login:    (username: string, password: string) =>
    api.post<{ user: User }>('/auth/login', { username, password }),
};
