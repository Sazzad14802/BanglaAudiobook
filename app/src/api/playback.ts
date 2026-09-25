/**
 * Playback API functions.
 */

import { apiClient } from './client';
import { PlaybackProgress, PlaybackProgressUpdate } from '../types/playback';

export const playbackApi = {
  /** Get saved playback progress for an audiobook */
  get(audiobookId: string): Promise<PlaybackProgress | null> {
    return apiClient.get<PlaybackProgress | null>(`/playback/${audiobookId}`);
  },

  /** Save playback progress */
  save(audiobookId: string, data: PlaybackProgressUpdate): Promise<PlaybackProgress> {
    return apiClient.put<PlaybackProgress>(`/playback/${audiobookId}`, data);
  },
};
