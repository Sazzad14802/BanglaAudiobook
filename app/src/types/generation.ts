/**
 * Generation-related TypeScript types.
 * Mirrors the Platform API generation schemas.
 */

import { AudiobookStatus } from './audiobook';

export interface GenerationJob {
  id: string;
  audiobook_id: string;
  status: AudiobookStatus;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface GenerationJobResponse {
  job_id: string;
  status: AudiobookStatus;
  message: string;
}

export interface AudiobookGenerationStatusResponse {
  audiobook_id: string;
  audiobook_status: AudiobookStatus;
  latest_job: GenerationJob | null;
  history: GenerationJob[];
}
