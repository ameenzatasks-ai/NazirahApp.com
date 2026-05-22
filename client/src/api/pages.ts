import { api } from './client';

export interface ListenedPage {
  pageNumber: number;
  listenedAt: string;
}

export interface PagesResponse {
  listenedPages: ListenedPage[];
  total: number;
}

export const pagesApi = {
  /** Student: get all pages marked as listened */
  list: () => api.get<PagesResponse>('/pages'),

  /** Student: mark a page as listened */
  markListened: (pageNumber: number) =>
    api.put<{ pageNumber: number; listened: boolean; listenedAt: string }>(`/pages/${pageNumber}`),

  /** Student: unmark a page */
  unmark: (pageNumber: number) =>
    api.delete<{ pageNumber: number; listened: boolean }>(`/pages/${pageNumber}`),
};
