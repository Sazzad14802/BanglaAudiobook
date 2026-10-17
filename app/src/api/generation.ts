/**
 * Generation repository: start, observe, cancel and retry PDF → audio jobs.
 */

import { apiClient } from './client';
import { AudiobookGenerationStatusResponse, GenerationJobResponse } from '../types/generation';
import { GenerationQuota } from '../types/domain';

export const generationApi = {
  start(audiobookId: string): Promise<GenerationJobResponse> {
    return apiClient.post<GenerationJobResponse>(`/audiobooks/${audiobookId}/generate`);
  },

  status(audiobookId: string): Promise<AudiobookGenerationStatusResponse> {
    return apiClient.get<AudiobookGenerationStatusResponse>(`/audiobooks/${audiobookId}/generation-status`);
  },

  cancel(jobId: string): Promise<unknown> {
    return apiClient.post(`/generation/${jobId}/cancel`);
  },

  retry(jobId: string): Promise<unknown> {
    return apiClient.post(`/generation/${jobId}/retry`);
  },

  quota(): Promise<GenerationQuota> {
    return apiClient.get<GenerationQuota>('/generation/quota');
  },
};
