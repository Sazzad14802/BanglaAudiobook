/**
 * Audiobook-related TypeScript types.
 * Mirrors the Platform API audiobook schemas.
 */

export type AudiobookStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AudiobookVisibility = 'PUBLIC' | 'PRIVATE';

export interface Audiobook {
  id: string;
  owner_id: string;
  title: string;
  author: string | null;
  description: string | null;
  genre?: string | null;
  access_type?: 'FREE' | 'PREMIUM';
  cover_image_url: string | null;
  source_file_url?: string | null;
  audio_url?: string | null;
  audio_file_url?: string | null;
  duration_seconds?: number;

  language: string;
  visibility: AudiobookVisibility;
  status: AudiobookStatus;
  created_at: string;
  updated_at: string;
}


export interface AudiobookCreate {
  title: string;
  author?: string;
  description?: string;
  language: string;
  visibility: AudiobookVisibility;
}

export interface AudiobookUpdate {
  title?: string;
  author?: string;
  description?: string;
  language?: string;
  cover_image_url?: string;
}

export interface AudiobookVisibilityUpdate {
  visibility: AudiobookVisibility;
}

export interface AudiobookListResponse {
  items: Audiobook[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
