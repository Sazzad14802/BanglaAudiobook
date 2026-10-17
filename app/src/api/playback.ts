/**
 * Playback repository: signed play manifests, progress sync, listening heartbeats.
 */

import { ApiError, apiClient } from './client';
import { PlaybackProgress, PlaybackProgressUpdate } from '../types/playback';
import { OfflineLicense, PlayManifest, RecentPlayback } from '../types/domain';

export const playbackApi = {
  /**
   * Returns short-lived signed chapter URLs. Without a session id a new listening
   * session starts; with one, the grants are renewed and listening time carries over.
   */
  manifest(audiobookId: string, sessionId?: string): Promise<PlayManifest> {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    return apiClient.post<PlayManifest>(`/audiobooks/${audiobookId}/play${query}`);
  },

  offlineLicense(audiobookId: string): Promise<OfflineLicense> {
    return apiClient.post<OfflineLicense>(`/audiobooks/${audiobookId}/offline-license`);
  },

  /** Saved position, or null when the user has never played this book. */
  async progress(audiobookId: string): Promise<PlaybackProgress | null> {
    try {
      return await apiClient.get<PlaybackProgress>(`/playback/${audiobookId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  saveProgress(audiobookId: string, data: PlaybackProgressUpdate): Promise<PlaybackProgress> {
    return apiClient.put<PlaybackProgress>(`/playback/${audiobookId}`, data);
  },

  recent(): Promise<RecentPlayback[]> {
    return apiClient.get<RecentPlayback[]>('/playback/recent');
  },

  heartbeat(sessionId: string, position: number): Promise<{ listened_seconds: number }> {
    return apiClient.post(`/plays/${sessionId}/heartbeat`, { position: Math.floor(position) });
  },
};
