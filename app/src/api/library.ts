/**
 * Library API functions.
 */

import { apiClient } from './client';
import { LibraryListResponse } from '../types/library';

export const libraryApi = {
  /** Add audiobook to user's library */
  add(audiobookId: string): Promise<void> {
    return apiClient.post<void>(`/library/${audiobookId}`);
  },

  /** Remove audiobook from user's library */
  remove(audiobookId: string): Promise<void> {
    return apiClient.delete<void>(`/library/${audiobookId}`);
  },

  /** Get the user's library */
  list(page = 1, size = 20): Promise<LibraryListResponse> {
    return apiClient.get<LibraryListResponse>(`/library?page=${page}&size=${size}`);
  },
};
