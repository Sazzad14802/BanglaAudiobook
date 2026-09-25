/**
 * Chapter-related TypeScript types.
 * Mirrors the Platform API chapter schemas.
 */

export interface Chapter {
  id: string;
  audiobook_id: string;
  title: string;
  chapter_number: number;
  duration_seconds: number;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}
