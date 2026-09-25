/**
 * Audiobook API functions.
 */

import { apiClient } from './client';
import {
  Audiobook,
  AudiobookCreate,
  AudiobookListResponse,
  AudiobookUpdate,
  AudiobookVisibilityUpdate,
} from '../types/audiobook';
import { Chapter } from '../types/chapter';

export const audiobooksApi = {
  /** Create a new audiobook record */
  create(data: AudiobookCreate): Promise<Audiobook> {
    return apiClient.post<Audiobook>('/audiobooks', data);
  },

  /** List all public completed audiobooks (discovery) */
  list(page = 1, size = 20): Promise<AudiobookListResponse> {
    return apiClient.get<AudiobookListResponse>(`/audiobooks?page=${page}&size=${size}`);
  },

  /** Get a single audiobook by ID */
  get(id: string): Promise<Audiobook> {
    return apiClient.get<Audiobook>(`/audiobooks/${id}`);
  },

  /** Update audiobook metadata (owner only) */
  update(id: string, data: AudiobookUpdate): Promise<Audiobook> {
    return apiClient.patch<Audiobook>(`/audiobooks/${id}`, data);
  },

  /** Delete an audiobook (owner only) */
  delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/audiobooks/${id}`);
  },

  /** Change visibility (owner only) */
  updateVisibility(id: string, data: AudiobookVisibilityUpdate): Promise<Audiobook> {
    return apiClient.patch<Audiobook>(`/audiobooks/${id}/visibility`, data);
  },

  /** Upload the source PDF */
  uploadSource(id: string, formData: FormData): Promise<Audiobook> {
    return apiClient.uploadFile<Audiobook>(`/audiobooks/${id}/source`, formData);
  },

  /** List the authenticated user's own audiobooks (all statuses, all visibilities) */
  listMine(page = 1, size = 50): Promise<AudiobookListResponse> {
    return apiClient.get<AudiobookListResponse>(`/audiobooks/my?page=${page}&size=${size}`);
  },

  /** List chapters of an audiobook */
  listChapters(audiobookId: string): Promise<Chapter[]> {
    return apiClient.get<Chapter[]>(`/audiobooks/${audiobookId}/chapters`);
  },

  /** Get a specific chapter */
  getChapter(audiobookId: string, chapterId: string): Promise<Chapter> {
    return apiClient.get<Chapter>(`/audiobooks/${audiobookId}/chapters/${chapterId}`);
  },
};
