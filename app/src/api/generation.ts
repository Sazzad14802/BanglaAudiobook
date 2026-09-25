/**
 * Generation API functions.
 */

import { apiClient } from './client';
import { AudiobookGenerationStatusResponse, GenerationJobResponse } from '../types/generation';

export const generationApi = {
  /** Start audiobook generation job */
  start(audiobookId: string): Promise<GenerationJobResponse> {
    return apiClient.post<GenerationJobResponse>(`/audiobooks/${audiobookId}/generate`);
  },

  /** Poll generation status */
  getStatus(audiobookId: string): Promise<AudiobookGenerationStatusResponse> {
    return apiClient.get<AudiobookGenerationStatusResponse>(
      `/audiobooks/${audiobookId}/generation-status`,
    );
  },
};
